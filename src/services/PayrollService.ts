import { AppDataSource } from '../config/data-source';
import { Payroll, ComponentType, PayrollHistoryEntry } from '../entities/payroll/Payroll';
import { User } from '../entities/core/User';
import { Leave, LeaveStatus } from '../entities/leave/Leave';
import { Attendance, AttendanceStatus } from '../entities/attendance/Attendance';
import { Role, RoleType } from '../entities/auth/Role';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

export class PayrollService {
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
        // Tìm bản ghi lương hiện có cho người dùng, tháng, năm cụ thể
        let existingPayroll = await this.payrollRepo.findOne({
            where: { user: { id: user.id }, month, year }
        });

        // Khởi tạo các biến để tính toán lương từ đầu
        let baseSalaryForCalc: number;
        let bonusForCalc: number = 0; // Luôn bắt đầu với 0
        let allowanceForCalc: number = 0; // Luôn bắt đầu với 0
        let benefitForCalc: number = 0; // Luôn bắt đầu với 0
        let otherDeductionsPreserved: number = 0; // Luôn bắt đầu với 0

        // Sử dụng baseSalary từ thông tin người dùng hiện tại
            if (user.baseSalary === null || typeof user.baseSalary === 'undefined') {
             // Xử lý trường hợp lương cơ bản không được định nghĩa
                console.warn(`User ${user.id} - ${user.fullName} does not have a base salary defined. Creating zero-value payroll record.`);
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
                zeroPayroll.isFinalized = false;
                return await this.payrollRepo.save(zeroPayroll);
            }
        // Sử dụng baseSalary của người dùng hiện tại
            baseSalaryForCalc = parseFloat(String(user.baseSalary)) || 0;

        // --- Tính toán các thành phần động (có thể thay đổi hàng tháng) ---
        let leaveDeductionAmount = 0; // Khoản khấu trừ do nghỉ phép
        let latePenaltyAmount = 0; // Khoản phạt do đi muộn

        // Xác định phạm vi ngày của tháng lương
        const payrollMonthStartDate = new Date(year, month - 1, 1);
        const payrollMonthEndDate = new Date(year, month, 0);

        // Tìm các đơn xin nghỉ phép đã được duyệt và trùng với tháng lương
        const approvedLeavesOverlappingMonth = await this.leaveRepo.find({
            where: {
                user: { id: user.id },
                status: LeaveStatus.APPROVED,
                startDate: LessThanOrEqual(payrollMonthEndDate), // Ngày bắt đầu <= ngày cuối tháng lương
                endDate: MoreThanOrEqual(payrollMonthStartDate) // Ngày kết thúc >= ngày đầu tháng lương
            }
        });

        // Tính số ngày nghỉ phép trong tháng lương
        let calculatedLeaveDaysInMonth = 0;
        for (const leave of approvedLeavesOverlappingMonth) {
            // Xác định khoảng thời gian nghỉ phép hiệu quả trong tháng lương
            const effectiveLeaveStart = leave.startDate > payrollMonthStartDate ? leave.startDate : payrollMonthStartDate;
            const effectiveLeaveEnd = leave.endDate < payrollMonthEndDate ? leave.endDate : payrollMonthEndDate;

            // Tính số ngày nghỉ phép trong khoảng thời gian hiệu quả
            if (effectiveLeaveStart <= effectiveLeaveEnd) {
                const diffTime = Math.abs(effectiveLeaveEnd.getTime() - effectiveLeaveStart.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                calculatedLeaveDaysInMonth += diffDays;
            }
        }
        
        // Chuyển đổi ngày sang định dạng string để truy vấn Attendance
        const monthStartDateString = payrollMonthStartDate.toISOString().split('T')[0];
        const monthEndDateString = payrollMonthEndDate.toISOString().split('T')[0];
        
        // Tìm các bản ghi vắng mặt (absent) trong tháng
        const absentRecords = await this.attendanceRepo.count({
            where: {
                user: { id: user.id },
                date: Between(monthStartDateString, monthEndDateString),
                status: AttendanceStatus.ABSENT
            }
        });
        
        // Tính số ngày vắng mặt cần khấu trừ (trừ đi 1 ngày được phép nghỉ)
        const chargableAbsentDays = Math.max(0, absentRecords - 1);
        
        // Tính toán khoản khấu trừ nghỉ phép (4% lương cơ bản cho mỗi ngày vắng mặt quá phép)
        leaveDeductionAmount = chargableAbsentDays * 0.04 * baseSalaryForCalc;

        // Đếm số lần đi muộn trong tháng lương
        const lateArrivals = await this.attendanceRepo.count({
            where: {
                user: { id: user.id },
                date: Between(monthStartDateString, monthEndDateString), // Trong khoảng ngày của tháng lương
                status: AttendanceStatus.LATE // Trạng thái đi muộn
            }
        });
        // Tính toán khoản phạt đi muộn (ví dụ: 100,000 cho mỗi lần đi muộn)
        latePenaltyAmount = lateArrivals * 100000;

        // Tổng các khoản khấu trừ cuối cùng (nghỉ phép + đi muộn + các khoản khác đã giữ lại)
        const finalTotalDeduction = leaveDeductionAmount + latePenaltyAmount + otherDeductionsPreserved;
        
        // Tính thu nhập trước thuế
        const incomeBeforeTax = (baseSalaryForCalc + bonusForCalc + allowanceForCalc + benefitForCalc) - finalTotalDeduction;
        // Tính thuế (ví dụ: 11% thu nhập trước thuế, tối thiểu 0)
        const tax = Math.max(0, incomeBeforeTax * 0.11);
        // Tính lương ròng (Net Salary)
        const netSalary = incomeBeforeTax - tax;

        // Chuẩn bị đối tượng Payroll để lưu hoặc cập nhật
        let payrollToSave: Payroll;
        if (existingPayroll) {
            // Nếu đã có, sử dụng bản ghi hiện có
            payrollToSave = existingPayroll;
            // Đặt lại các giá trị có thể thay đổi hàng tháng
            payrollToSave.bonus = 0;
            payrollToSave.totalAllowance = 0;
            payrollToSave.totalBenefit = 0;
            payrollToSave.totalDeduction = 0; // Sẽ được tính lại sau
            payrollToSave.leaveDeductionAmount = 0; // Sẽ được tính lại sau
            payrollToSave.latePenaltyAmount = 0; // Sẽ được tính lại sau
            // Giữ nguyên note và isFinalized nếu có
        } else {
            // Nếu chưa có, tạo bản ghi mới
            payrollToSave = new Payroll();
            payrollToSave.user = user;
            payrollToSave.userId = user.id;
            payrollToSave.month = month;
            payrollToSave.year = year;
            payrollToSave.note = '';
            payrollToSave.isFinalized = false; // Bản ghi mới chưa được hoàn tất
        }

        // Cập nhật các trường của đối tượng Payroll với kết quả tính toán (làm tròn 2 chữ số thập phân)
        payrollToSave.baseSalary = parseFloat(baseSalaryForCalc.toFixed(2));
        // bonus, allowance, benefit đã được đặt lại về 0 hoặc giữ nguyên nếu updateData có ghi đè
        payrollToSave.totalAllowance = parseFloat(allowanceForCalc.toFixed(2)); // allowanceForCalc luôn là 0 ở đây
        payrollToSave.totalBenefit = parseFloat(benefitForCalc.toFixed(2)); // benefitForCalc luôn là 0 ở đây
        payrollToSave.totalDeduction = parseFloat(finalTotalDeduction.toFixed(2)); // totalDeduction được tính lại
        payrollToSave.leaveDeductionAmount = parseFloat(leaveDeductionAmount.toFixed(2)); // leaveDeductionAmount được tính lại
        payrollToSave.latePenaltyAmount = parseFloat(latePenaltyAmount.toFixed(2)); // latePenaltyAmount được tính lại
        // bonus giữ nguyên giá trị 0 đã khởi tạo ở trên hoặc được cập nhật bởi updatePayroll
        payrollToSave.bonus = parseFloat(bonusForCalc.toFixed(2));

        payrollToSave.tax = parseFloat(tax.toFixed(2)); // tax được tính lại
        payrollToSave.netSalary = parseFloat(netSalary.toFixed(2)); // netSalary được tính lại
        
        // Lưu hoặc cập nhật bản ghi Payroll vào cơ sở dữ liệu
        return await this.payrollRepo.save(payrollToSave);
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
                    relations: ["department", "role"]
                });
            } else if (userRoleType === RoleType.DEPARTMENT_HEAD) {
                if (!requestingUser.departmentId) {
                    throw new Error("Department head does not have an assigned department.");
                }
                usersToProcess = await this.userRepo.find({
                    where: { departmentId: requestingUser.departmentId },                                                                       
                    relations: ["department", "role"]
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
    
    // Lấy lịch sử thay đổi lương
    async getPayrollHistory(payrollId: number): Promise<PayrollHistoryEntry[] | null> {
        try {
            const payroll = await this.payrollRepo.findOneBy({ id: payrollId });
            if (!payroll) {
                throw new Error("Payroll not found");
            }
            
            return (payroll.updateHistory || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error("Error getting payroll history:", error);
            throw error;
        }
    }
    
    // Xóa một mục trong lịch sử thay đổi lương
    async deletePayrollHistoryEntry(payrollId: number, entryTimestamp: string, updatedBy: number): Promise<Payroll> {
        try {
            const payroll = await this.payrollRepo.findOneBy({ id: payrollId });
            if (!payroll) {
                throw new Error("Payroll not found");
            }
            
            if (!payroll.updateHistory || payroll.updateHistory.length === 0) {
                throw new Error("Không có lịch sử thay đổi để xóa");
            }
            
            // Tìm vị trí của entry cần xóa
            const entryIndex = payroll.updateHistory.findIndex(entry => entry.timestamp === entryTimestamp);
            if (entryIndex === -1) {
                throw new Error("Không tìm thấy mục lịch sử cần xóa");
            }
            
            const entryToDelete = payroll.updateHistory[entryIndex];
            
            // Xóa entry khỏi lịch sử
            payroll.updateHistory.splice(entryIndex, 1);
            
            // Xử lý cập nhật note chính của payroll nếu mục xóa có note
            if (entryToDelete.note && payroll.note) {
                // Tìm và xóa note tương ứng nếu có trong note chính
                const noteToRemove = entryToDelete.note;
                const updatedNote = payroll.note
                    .replace(`; ${noteToRemove}`, '') // Xóa nếu nằm ở giữa
                    .replace(`${noteToRemove}; `, '') // Xóa nếu nằm ở đầu
                    .replace(noteToRemove, ''); // Xóa nếu chỉ có một mục
                    
                payroll.note = updatedNote.trim();
            }
            
            // Cập nhật các giá trị liên quan
            if (entryToDelete.changes) {
                // Kiểm tra nếu entry chứa cập nhật về bonus hoặc deduction
                const bonusChange = entryToDelete.changes.find(c => c.field === 'bonus');
                const deductionChange = entryToDelete.changes.find(c => c.field === 'totalDeduction');
                
                if (bonusChange) {
                    // Nếu là thay đổi bonus, khôi phục giá trị cũ
                    payroll.bonus = parseFloat(String(bonusChange.oldValue)) || 0;
                }
                
                if (deductionChange) {
                    // Nếu là thay đổi khấu trừ, khôi phục giá trị cũ
                    payroll.totalDeduction = parseFloat(String(deductionChange.oldValue)) || 0;
                }
                
                // Tính toán lại lương thực nhận nếu có sự thay đổi
                if (bonusChange || deductionChange) {
                    const netSalary = (
                        parseFloat(String(payroll.baseSalary)) + 
                        parseFloat(String(payroll.bonus)) + 
                        parseFloat(String(payroll.totalAllowance)) + 
                        parseFloat(String(payroll.totalBenefit)) - 
                        parseFloat(String(payroll.totalDeduction)) - 
                        parseFloat(String(payroll.tax))
                    );
                    payroll.netSalary = parseFloat(netSalary.toFixed(2));
                }
            }
            
            await this.payrollRepo.save(payroll);
            
            return payroll;
        } catch (error) {
            console.error("Error deleting payroll history entry:", error);
            throw error;
        }
    }
    
    // Thêm phương thức cập nhật lương
    async updatePayroll(payrollId: number, updateData: Partial<Payroll> & { 
        deductionAmount?: number; 
        deductionNote?: string; 
        updatedBy?: number; 
        componentType?: ComponentType;
        shouldAdd?: boolean;
    }): Promise<Payroll> {
        try {
            // console.log(`[PayrollService] updatePayroll for ID: ${payrollId} - Received data:`, JSON.stringify(updateData));

            // Tìm payroll kèm theo thông tin user để cập nhật cả lương cơ bản của user
            const payroll = await this.payrollRepo.findOne({
                where: { id: payrollId },
                relations: ["user"] // Thêm quan hệ với user
            });
            if (!payroll) {
                throw new Error("Payroll not found");
            }

            // Khởi tạo mảng lịch sử nếu chưa có
            if (!payroll.updateHistory) {
                payroll.updateHistory = [];
            }

            const historyChanges: Array<{ field: string; oldValue: any; newValue: any; }> = [];
            let reasonForUpdate: string | undefined = undefined;
            let historyNote: string | undefined = undefined;

            // Lưu trữ trạng thái ban đầu của các trường có thể thay đổi
            const initialPayrollState = {
                baseSalary: parseFloat(String(payroll.baseSalary)) || 0,
                bonus: parseFloat(String(payroll.bonus)) || 0,
                totalAllowance: parseFloat(String(payroll.totalAllowance)) || 0,
                totalBenefit: parseFloat(String(payroll.totalBenefit)) || 0,
                tax: parseFloat(String(payroll.tax)) || 0,
                totalDeduction: parseFloat(String(payroll.totalDeduction)) || 0,
                note: payroll.note ?? null, // Đảm bảo note là null nếu nó là undefined/null
                netSalary: (payroll.netSalary === null || payroll.netSalary === undefined) ? null : (parseFloat(String(payroll.netSalary)) || 0),
            };
            console.log(`[PayrollService] initialPayrollState:`, initialPayrollState);

            // Các biến làm việc cho việc tính toán, khởi tạo từ giá trị hiện tại (sau này sẽ được cập nhật nếu có trong updateData)
            let currentBaseSalary = initialPayrollState.baseSalary;
            let currentBonus = initialPayrollState.bonus;
            let currentTotalAllowance = initialPayrollState.totalAllowance;
            let currentTotalBenefit = initialPayrollState.totalBenefit;
            let currentTax = initialPayrollState.tax;
            let currentTotalDeduction = initialPayrollState.totalDeduction;

            // Xử lý cập nhật và ghi nhận thay đổi vào historyChanges
            if (updateData.baseSalary !== undefined && updateData.baseSalary !== null) {
                const newValue = parseFloat(String(updateData.baseSalary)) || 0;
                console.log(`[PayrollService] Cập nhật lương cơ bản: ${initialPayrollState.baseSalary} -> ${newValue}`);
                if (initialPayrollState.baseSalary !== newValue) {
                    historyChanges.push({ field: 'baseSalary', oldValue: initialPayrollState.baseSalary, newValue: newValue });
                }
                payroll.baseSalary = newValue;
                currentBaseSalary = newValue;
                
                // Cập nhật thêm lương cơ bản trong bảng User
                if (payroll.user) {
                    console.log(`[PayrollService] Cập nhật lương cơ bản cho user ${payroll.user.id}: ${payroll.user.baseSalary} -> ${newValue}`);
                    payroll.user.baseSalary = newValue;
                    await this.userRepo.save(payroll.user);
                }
                
                reasonForUpdate = "Cập nhật lương cơ bản";
                console.log(`[PayrollService] Sau khi gán: payroll.baseSalary = ${payroll.baseSalary}`);
            }

            // Cập nhật theo loại thành phần lương (nếu có chỉ định)
            if (updateData.componentType && updateData.bonus !== undefined && updateData.bonus !== null) {
                const amount = parseFloat(String(updateData.bonus)) || 0;
                let fieldToUpdate: string = '';
                let currentValue: number = 0;

                switch (updateData.componentType) {
                    case ComponentType.ALLOWANCE:
                        fieldToUpdate = 'totalAllowance';
                        currentValue = initialPayrollState.totalAllowance;
                        reasonForUpdate = "Cập nhật phụ cấp";
                        break;
                    case ComponentType.BENEFIT:
                        fieldToUpdate = 'totalBenefit';
                        currentValue = initialPayrollState.totalBenefit;
                        reasonForUpdate = "Cập nhật phúc lợi";
                        break;
                    case ComponentType.DEDUCTION:
                        fieldToUpdate = 'totalDeduction';
                        currentValue = initialPayrollState.totalDeduction;
                        reasonForUpdate = "Cập nhật khấu trừ";
                        break;
                    default:
                        fieldToUpdate = 'bonus';
                        currentValue = initialPayrollState.bonus;
                        reasonForUpdate = "Cập nhật thưởng";
                }

                let newValue: number;
                if (updateData.shouldAdd) {
                    // Cộng dồn vào giá trị hiện tại
                    newValue = currentValue + amount;
                } else {
                    // Thay thế giá trị hiện tại
                    newValue = amount;
                }

                // Ghi nhận thay đổi vào lịch sử
                if (currentValue !== newValue) {
                    historyChanges.push({ field: fieldToUpdate, oldValue: currentValue, newValue: newValue });
                }

                // Cập nhật giá trị tương ứng
                switch (fieldToUpdate) {
                    case 'totalAllowance':
                        payroll.totalAllowance = parseFloat(newValue.toFixed(2));
                        currentTotalAllowance = payroll.totalAllowance;
                        break;
                    case 'totalBenefit':
                        payroll.totalBenefit = parseFloat(newValue.toFixed(2));
                        currentTotalBenefit = payroll.totalBenefit;
                        break;
                    case 'totalDeduction':
                        payroll.totalDeduction = parseFloat(newValue.toFixed(2));
                        currentTotalDeduction = payroll.totalDeduction;
                        break;
                    case 'bonus':
                        payroll.bonus = parseFloat(newValue.toFixed(2));
                        currentBonus = payroll.bonus;
                        break;
                }
            } else {
                // Xử lý cách cũ nếu không có componentType
                if (updateData.bonus !== undefined && updateData.bonus !== null) {
                    let newValue: number;
                    if (updateData.shouldAdd) {
                        // Cộng dồn nếu có flag shouldAdd
                        newValue = initialPayrollState.bonus + (parseFloat(String(updateData.bonus)) || 0);
                    } else {
                        // Thay thế nếu không có flag
                        newValue = parseFloat(String(updateData.bonus)) || 0;
                    }
                    
                    if (initialPayrollState.bonus !== newValue) {
                        historyChanges.push({ field: 'bonus', oldValue: initialPayrollState.bonus, newValue: newValue });
                    }
                    payroll.bonus = newValue;
                    currentBonus = newValue;
                    if (!reasonForUpdate) reasonForUpdate = "Cập nhật thưởng";
                }

                if (updateData.totalAllowance !== undefined && updateData.totalAllowance !== null) {
                    let newValue: number;
                    if (updateData.shouldAdd) {
                        newValue = initialPayrollState.totalAllowance + (parseFloat(String(updateData.totalAllowance)) || 0);
                    } else {
                        newValue = parseFloat(String(updateData.totalAllowance)) || 0;
                    }
                    
                    if (initialPayrollState.totalAllowance !== newValue) {
                        historyChanges.push({ field: 'totalAllowance', oldValue: initialPayrollState.totalAllowance, newValue: newValue });
                    }
                    payroll.totalAllowance = newValue;
                    currentTotalAllowance = newValue;
                    if (!reasonForUpdate) reasonForUpdate = "Cập nhật phụ cấp";
                }

                if (updateData.totalBenefit !== undefined && updateData.totalBenefit !== null) {
                    let newValue: number;
                    if (updateData.shouldAdd) {
                        newValue = initialPayrollState.totalBenefit + (parseFloat(String(updateData.totalBenefit)) || 0);
                    } else {
                        newValue = parseFloat(String(updateData.totalBenefit)) || 0;
                    }
                    
                    if (initialPayrollState.totalBenefit !== newValue) {
                        historyChanges.push({ field: 'totalBenefit', oldValue: initialPayrollState.totalBenefit, newValue: newValue });
                    }
                    payroll.totalBenefit = newValue;
                    currentTotalBenefit = newValue;
                    if (!reasonForUpdate) reasonForUpdate = "Cập nhật phúc lợi";
                }
            }

            if (updateData.tax !== undefined && updateData.tax !== null) {
                const newValue = parseFloat(String(updateData.tax)) || 0;
                if (initialPayrollState.tax !== newValue) {
                    historyChanges.push({ field: 'tax', oldValue: initialPayrollState.tax, newValue: newValue });
                }
                payroll.tax = newValue;
                currentTax = newValue;
                if (!reasonForUpdate) reasonForUpdate = "Cập nhật thuế";
            }

            const newDeductionAmount = parseFloat(String(updateData.deductionAmount)) || 0;
            if (updateData.deductionAmount !== undefined && newDeductionAmount >= 0) {
                const newTotalDeduction = initialPayrollState.totalDeduction + newDeductionAmount;
                if (initialPayrollState.totalDeduction !== newTotalDeduction) {
                    historyChanges.push({ field: 'totalDeduction', oldValue: initialPayrollState.totalDeduction, newValue: newTotalDeduction });
                }
                payroll.totalDeduction = parseFloat(newTotalDeduction.toFixed(2));
                currentTotalDeduction = payroll.totalDeduction;

                if (updateData.deductionNote) {
                    // Chỉ lưu vào lịch sử mà không cập nhật trường note của payroll
                    historyNote = `Khấu trừ: ${updateData.deductionNote}`;
                    reasonForUpdate = historyNote;
                    
                    // Không tự động cập nhật note chính
                    // const newNoteValue = initialPayrollState.note 
                    //     ? `${initialPayrollState.note}; ${historyNote}` 
                    //     : historyNote;
                    
                    // if (initialPayrollState.note !== newNoteValue) {
                    //     historyChanges.push({ 
                    //         field: 'note', 
                    //         oldValue: initialPayrollState.note, 
                    //         newValue: newNoteValue 
                    //     });
                    // }
                    
                    // Giữ nguyên note ban đầu
                    payroll.note = initialPayrollState.note;
                }
            } else if (updateData.note !== undefined && updateData.deductionAmount === undefined) {
                // Lưu note mới vào history và cập nhật note chính
                historyNote = updateData.note;
                
                if (initialPayrollState.note !== updateData.note) {
                    historyChanges.push({ field: 'note', oldValue: initialPayrollState.note, newValue: updateData.note });
                }
                
                payroll.note = updateData.note;
                if (!reasonForUpdate) reasonForUpdate = `Cập nhật ghi chú`;
            } else if (!updateData.deductionNote && updateData.deductionAmount === undefined) {
                // Giữ lại note cũ nếu không có note mới được cung cấp và không phải là trường hợp khấu trừ
                payroll.note = initialPayrollState.note;
            }
            
            // Tính toán lại lương thực nhận sau khi tất cả các cập nhật khác đã được áp dụng
            const netSalaryNumber = currentBaseSalary + currentBonus + currentTotalAllowance + currentTotalBenefit - currentTotalDeduction - currentTax;
            const finalNewNetSalary = parseFloat(netSalaryNumber.toFixed(2));
            if (initialPayrollState.netSalary !== finalNewNetSalary) {
                historyChanges.push({ field: 'netSalary', oldValue: initialPayrollState.netSalary, newValue: finalNewNetSalary });
            }
            payroll.netSalary = finalNewNetSalary;

            // Thêm vào lịch sử nếu có thay đổi
            if (historyChanges.length > 0) {
                payroll.updateHistory.push({
                    timestamp: new Date().toISOString(),
                    updatedBy: updateData.updatedBy, // Sử dụng ID người dùng từ request
                    changes: historyChanges,
                    reason: reasonForUpdate,
                    note: historyNote // Thêm trường note vào lịch sử
                });
            }
            
            console.log(`[PayrollService] Trước khi lưu: payroll.baseSalary = ${payroll.baseSalary}`);
            await this.payrollRepo.save(payroll);
            console.log(`[PayrollService] Sau khi lưu: payroll.baseSalary = ${payroll.baseSalary}`);

            const updatedPayroll = await this.payrollRepo.findOneBy({ id: payrollId });
            console.log(`[PayrollService] Sau khi truy vấn lại: updatedPayroll.baseSalary = ${updatedPayroll?.baseSalary}`);
            console.log(`[PayrollService] updatedPayroll:`, updatedPayroll);
            if (!updatedPayroll) {
                 console.log(`[PayrollService] Failed to retrieve payroll with ID: ${payrollId} after update call.`);
                 throw new Error("Failed to retrieve payroll after update");
            }
            return updatedPayroll;

        } catch (error) {
            console.log("[PayrollService] Error in updatePayroll:", error);
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