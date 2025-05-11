import { AppDataSource } from '../config/data-source';
import { Payroll, ComponentType } from '../entities/payroll/Payroll';
import { User } from '../entities/core/User';
import { Leave, LeaveStatus } from '../entities/leave/Leave';
import { Attendance, AttendanceStatus } from '../entities/attendance/Attendance';
import { Role, RoleType } from '../entities/auth/Role';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

class PayrollService {
    private static instance: PayrollService;
    private payrollRepo = AppDataSource.getRepository(Payroll);
    private userRepo = AppDataSource.getRepository(User);
    private leaveRepo = AppDataSource.getRepository(Leave);
    private attendanceRepo = AppDataSource.getRepository(Attendance);

    private constructor() {}

    public static getInstance(): PayrollService {
        if (!PayrollService.instance) {
            PayrollService.instance = new PayrollService();
        }
        return PayrollService.instance;
    }

    private async _calculateNetSalaryForUser(user: User, month: number, year: number): Promise<Payroll> {
        if (!user.baseSalary) {
            console.warn(`User ${user.id} - ${user.fullName} does not have a base salary. Skipping payroll calculation.`);
            // Tạo một bản ghi lương với giá trị 0 nếu không có lương cơ bản
            const zeroPayroll = new Payroll();
            zeroPayroll.user = user;
            zeroPayroll.userId = user.id;
            zeroPayroll.month = month;
            zeroPayroll.year = year;
            zeroPayroll.baseSalary = 0;
            zeroPayroll.totalAllowance = 0;
            zeroPayroll.totalDeduction = 0;
            zeroPayroll.totalBenefit = 0;
            zeroPayroll.netSalary = 0;
            zeroPayroll.leaveDeductionAmount = 0;
            zeroPayroll.latePenaltyAmount = 0;
            zeroPayroll.bonus = 0;
            zeroPayroll.tax = 0;
            return await this.payrollRepo.save(zeroPayroll);
        }

        const baseSalary = user.baseSalary;
        let leaveDeductionAmount = 0;
        let latePenaltyAmount = 0;

        // Tính ngày bắt đầu và kết thúc của tháng
        const payrollMonthStartDate = new Date(year, month - 1, 1);
        const payrollMonthEndDate = new Date(year, month, 0); // Ngày cuối cùng của tháng

        // 1. Tính khấu trừ do nghỉ phép
        const approvedLeavesOverlappingMonth = await this.leaveRepo.find({
            where: {
                user: { id: user.id },
                status: LeaveStatus.APPROVED,
                startDate: LessThanOrEqual(payrollMonthEndDate),
                endDate: MoreThanOrEqual(payrollMonthStartDate)
            }
        });

        let calculatedLeaveDaysInMonth = 0;
        for (const leave of approvedLeavesOverlappingMonth) {
            const effectiveLeaveStart = leave.startDate > payrollMonthStartDate ? leave.startDate : payrollMonthStartDate;
            const effectiveLeaveEnd = leave.endDate < payrollMonthEndDate ? leave.endDate : payrollMonthEndDate;

            if (effectiveLeaveStart <= effectiveLeaveEnd) {
                // Tính số ngày nghỉ trong khoảng giao nhau
                const diffTime = effectiveLeaveEnd.getTime() - effectiveLeaveStart.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                calculatedLeaveDaysInMonth += diffDays;
            }
        }
        leaveDeductionAmount = calculatedLeaveDaysInMonth * 0.03 * baseSalary;

        // 2. Tính phạt đi muộn
        const monthStartDateString = payrollMonthStartDate.toISOString().split('T')[0];
        const monthEndDateString = payrollMonthEndDate.toISOString().split('T')[0];

        const lateArrivals = await this.attendanceRepo.count({
            where: {
                user: { id: user.id },
                date: Between(monthStartDateString, monthEndDateString),
                status: AttendanceStatus.LATE
            }
        });
        latePenaltyAmount = lateArrivals * 100000;

        // 3. Tính lương thực nhận
        // Giả sử không còn các thành phần benefit riêng biệt
        const totalBenefit = 0; // Đã gộp vào bảng payroll
        const totalDeduction = leaveDeductionAmount + latePenaltyAmount;
        
        // Tính thuế (giả sử 10% thu nhập sau khi khấu trừ)
        const incomeBeforeTax = baseSalary - totalDeduction;
        const tax = incomeBeforeTax * 0.1;
        
        // Tính lương thực nhận
        const netSalary = incomeBeforeTax - tax;

        // Tạo hoặc cập nhật bảng lương
        let payroll = await this.payrollRepo.findOne({
            where: { user: { id: user.id }, month, year }
        });

        if (!payroll) {
            payroll = new Payroll();
            payroll.user = user;
            payroll.userId = user.id;
            payroll.month = month;
            payroll.year = year;
        }

        payroll.baseSalary = baseSalary;
        payroll.totalAllowance = 0; // Không còn allowance riêng lẻ
        payroll.totalDeduction = totalDeduction;
        payroll.totalBenefit = totalBenefit;
        payroll.netSalary = netSalary;
        payroll.leaveDeductionAmount = leaveDeductionAmount;
        payroll.latePenaltyAmount = latePenaltyAmount;
        payroll.tax = tax;
        payroll.bonus = 0; // Bonus mặc định là 0, có thể cập nhật sau
        payroll.isFinalized = false;

        return await this.payrollRepo.save(payroll);
    }

    public async processBatchPayrollCalculation(requestingUser: User, month: number, year: number): Promise<Payroll[]> {
        try {
            let usersToProcess: User[] = [];

            if (!requestingUser.role || !requestingUser.role.roleType) {
                throw new Error("Requesting user's role or role type is undefined.");
            }
            const userRoleType = requestingUser.role.roleType;

            if (userRoleType === RoleType.SYSTEM_ADMIN || userRoleType === RoleType.HR_STAFF) {
                usersToProcess = await this.userRepo.find({ 
                    relations: ["department", "position", "role"]
                });
            } else if (userRoleType === RoleType.DEPARTMENT_HEAD) {
                if (!requestingUser.departmentId) {
                    throw new Error("Department head does not have an assigned department.");
                }
                usersToProcess = await this.userRepo.find({
                    where: { departmentId: requestingUser.departmentId },
                    relations: ["department", "position", "role"]
                });
            } else {
                 throw new Error("User does not have permission to process batch payroll.");
            }

            if (usersToProcess.length === 0) {
                console.log("No users found to process payroll for.");
                return [];
            }

            const payrollResults: Payroll[] = [];
            for (const user of usersToProcess) {
                try {
                    const payroll = await this._calculateNetSalaryForUser(user, month, year);
                    
                    // Đảm bảo thông tin nhân viên được gắn vào kết quả
                    payroll.user = user;
                    
                    // Thêm ghi chú có chứa tên nhân viên
                    if (!payroll.note) {
                        payroll.note = `Payroll for ${user.fullName}`;
                    } else {
                        payroll.note = `${payroll.note} - ${user.fullName}`;
                    }
                    
                    payrollResults.push(payroll);
                } catch (error: any) {
                    console.error(`Failed to calculate payroll for user ${user.id} (${user.fullName}): ${error.message}`);
                }
            }
            return payrollResults;
        } catch (error) {
            console.error("Error during batch payroll calculation:", error);
            throw error;
        }
    }

    // Lấy danh sách lương theo tháng hoặc theo phòng ban
    async getPayrolls(month: number, year: number, departmentId?: number): Promise<Payroll[]> {
        try {
            const queryBuilder = this.payrollRepo
                .createQueryBuilder("payroll")
                .leftJoinAndSelect("payroll.user", "user")
                .leftJoinAndSelect("user.position", "position")
                .leftJoinAndSelect("user.department", "department")
                .where("payroll.month = :month", { month })
                .andWhere("payroll.year = :year", { year });

            if (departmentId) {
                queryBuilder.andWhere("user.departmentId = :departmentId", { departmentId });
            }

            // Chọn thêm các trường cần thiết
            queryBuilder.addSelect([
                "user.fullName",
                "user.email",
                "user.employeeId"
            ]);

            return await queryBuilder
                .orderBy("department.name", "ASC")
                .addOrderBy("user.fullName", "ASC")
                .getMany();
        } catch (error) {
            throw error;
        }
    }

    // Lấy chi tiết bảng lương của một nhân viên
    async getPayrollDetail(userId: number, month: number, year: number): Promise<Payroll | null> {
        try {
            console.log(`Searching payroll for user ${userId} in ${month}/${year}`);
            
            // Sử dụng queryBuilder để chọn thêm các trường cần thiết
            const payroll = await this.payrollRepo
                .createQueryBuilder("payroll")
                .leftJoinAndSelect("payroll.user", "user")
                .leftJoinAndSelect("user.position", "position")
                .leftJoinAndSelect("user.department", "department")
                .where("user.id = :userId", { userId })
                .andWhere("payroll.month = :month", { month })
                .andWhere("payroll.year = :year", { year })
                .addSelect([
                    "user.fullName",
                    "user.email",
                    "user.employeeId"
                ])
                .getOne();
            
            console.log('Result:', payroll);

            if (!payroll) {
                return null;
            }

            return payroll;
        } catch (error) {
            console.error(`Error fetching payroll detail for user ${userId}:`, error);
            throw error;
        }
    }

    // Hoàn tất bảng lương
    async finalizePayroll(payrollId: number): Promise<void> {
        try {
            const payroll = await this.payrollRepo.findOneBy({ id: payrollId });
            if (!payroll) {
                throw new Error("Payroll not found");
            }

            payroll.isFinalized = true;
            await this.payrollRepo.save(payroll);
        } catch (error) {
            throw error;
        }
    }
    
    // Thêm phương thức cập nhật lương
    async updatePayroll(payrollId: number, updateData: Partial<Payroll>): Promise<Payroll> {
        try {
            const payroll = await this.payrollRepo.findOneBy({ id: payrollId });
            if (!payroll) {
                throw new Error("Payroll not found");
            }
            
            // Cập nhật các trường được cho phép
            if (updateData.bonus !== undefined) payroll.bonus = updateData.bonus;
            if (updateData.note !== undefined) payroll.note = updateData.note;
            if (updateData.totalAllowance !== undefined) payroll.totalAllowance = updateData.totalAllowance;
            if (updateData.totalBenefit !== undefined) payroll.totalBenefit = updateData.totalBenefit;
            
            // Tính toán lại lương thực nhận
            payroll.netSalary = payroll.baseSalary + payroll.bonus + payroll.totalAllowance + 
                payroll.totalBenefit - payroll.totalDeduction - payroll.tax;
            
            return await this.payrollRepo.save(payroll);
        } catch (error) {
            throw error;
        }
    }
    
    // Thêm phương thức thiết lập ngày thanh toán
    async setPaymentDate(payrollId: number, paymentDate: Date): Promise<Payroll> {
        try {
            const payroll = await this.payrollRepo.findOneBy({ id: payrollId });
            if (!payroll) {
                throw new Error("Payroll not found");
            }
            
            payroll.paymentDate = paymentDate;
            return await this.payrollRepo.save(payroll);
        } catch (error) {
            throw error;
        }
    }
}

export const payrollService = PayrollService.getInstance();