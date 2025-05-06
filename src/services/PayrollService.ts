import { AppDataSource } from '../config/data-source';
import { MonthlyPayroll } from '../entities/payroll/MonthlyPayroll';
import { PayrollComponent, ComponentType } from '../entities/payroll/PayrollComponent';
import { User } from '../entities/core/User';

class PayrollService {
    private static instance: PayrollService;
    private monthlyPayrollRepo = AppDataSource.getRepository(MonthlyPayroll);
    private payrollComponentRepo = AppDataSource.getRepository(PayrollComponent);
    private userRepo = AppDataSource.getRepository(User);

    private constructor() {}

    public static getInstance(): PayrollService {
        if (!PayrollService.instance) {
            PayrollService.instance = new PayrollService();
        }
        return PayrollService.instance;
    }

    // Tính lương tháng cho nhân viên
    async calculateMonthlyPayroll(userId: number, month: number, year: number): Promise<MonthlyPayroll> {
        try {
            // Kiểm tra user
            const user = await this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }

            // Lấy các thành phần lương
            const components = await this.payrollComponentRepo.find({
                where: { user: { id: userId } }
            });

            // Tính toán các thành phần
            const totalAllowance = components
                .filter(c => c.type === ComponentType.ALLOWANCE)
                .reduce((sum, c) => sum + Number(c.amount), 0);

            const totalDeduction = components
                .filter(c => c.type === ComponentType.DEDUCTION)
                .reduce((sum, c) => sum + Number(c.amount), 0);

            const totalBenefit = components
                .filter(c => c.type === ComponentType.BENEFIT)
                .reduce((sum, c) => sum + Number(c.amount), 0);

            // Tạo bảng lương mới
            const monthlyPayroll = new MonthlyPayroll();
            monthlyPayroll.user = user;
            monthlyPayroll.month = month;
            monthlyPayroll.year = year;
            monthlyPayroll.baseSalary = user.baseSalary || 0;
            monthlyPayroll.totalAllowance = totalAllowance;
            monthlyPayroll.totalDeduction = totalDeduction;
            monthlyPayroll.totalBenefit = totalBenefit;
            monthlyPayroll.netSalary = monthlyPayroll.baseSalary + totalAllowance - totalDeduction + totalBenefit;

            return await this.monthlyPayrollRepo.save(monthlyPayroll);
        } catch (error) {
            throw error;
        }
    }

    // Thêm thành phần lương mới
    async addPayrollComponent(
        name: string,
        amount: number,
        type: ComponentType,
        description: string,
        userId: number
    ): Promise<PayrollComponent> {
        try {
            const user = await this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }

            const component = new PayrollComponent();
            component.name = name;
            component.amount = amount;
            component.type = type;
            component.description = description;
            component.user = user;

            return await this.payrollComponentRepo.save(component);
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật thành phần lương
    async updatePayrollComponent(
        id: number,
        name: string,
        amount: number,
        type: ComponentType,
        description: string
    ): Promise<PayrollComponent> {
        try {
            const component = await this.payrollComponentRepo.findOneBy({ id });
            if (!component) {
                throw new Error("Payroll component not found");
            }

            component.name = name;
            component.amount = amount;
            component.type = type;
            component.description = description;

            return await this.payrollComponentRepo.save(component);
        } catch (error) {
            throw error;
        }
    }

    // Xóa thành phần lương
    async deletePayrollComponent(id: number): Promise<void> {
        try {
            const component = await this.payrollComponentRepo.findOneBy({ id });
            if (!component) {
                throw new Error("Payroll component not found");
            }

            await this.payrollComponentRepo.remove(component);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách thành phần lương theo loại (phụ cấp/khấu trừ)
     * @param type Loại thành phần lương:
     * - ALLOWANCE: Các khoản phụ cấp (ăn trưa, đi lại, ...)
     * - DEDUCTION: Các khoản khấu trừ (BHXH, BHYT, ...)
     * - BENEFIT: Các khoản phúc lợi (bảo hiểm sức khỏe, ...)
     * @returns Danh sách thành phần lương của loại được chọn
     * Ví dụ:
     * - ALLOWANCE sẽ trả về [{ name: "Phụ cấp ăn trưa", amount: 1000000 }, ...]
     * - DEDUCTION sẽ trả về [{ name: "BHXH", amount: "8% lương cơ bản" }, ...]
     */
    async getPayrollComponentsByType(type: ComponentType): Promise<PayrollComponent[]> {
        try {
            return await this.payrollComponentRepo.find({
                where: { type },
                relations: { user: true }
            });
        } catch (error) {
            throw error;
        }
    }

    // Lấy danh sách lương theo tháng hoặc theo phòng ban
    async getMonthlyPayrolls(month: number, year: number, departmentId?: number): Promise<MonthlyPayroll[]> {
        try {
            const query = this.monthlyPayrollRepo
                .createQueryBuilder("monthlyPayroll")
                .leftJoinAndSelect("monthlyPayroll.user", "user")
                .leftJoin("user.position", "position")
                .leftJoin("user.department", "department")
                .addSelect([
                    "user.fullName",
                    "user.baseSalary",
                    "position.title",
                    "department.name"
                ])
                .where("monthlyPayroll.month = :month", { month })
                .andWhere("monthlyPayroll.year = :year", { year });

            if (departmentId) {
                query.andWhere("user.departmentId = :departmentId", { departmentId });
            }

            return await query
                .orderBy("department.name", "ASC")
                .addOrderBy("user.fullName", "ASC")
                .getMany();
        } catch (error) {
            throw error;
        }
    }

    // Lấy chi tiết bảng lương của một nhân viên
    async getMonthlyPayrollDetail(userId: number, month: number, year: number): Promise<MonthlyPayroll> {
        try {
            console.log(`Searching payroll for user ${userId} in ${month}/${year}`);
            
            const query = this.monthlyPayrollRepo
                .createQueryBuilder("monthlyPayroll")
                .innerJoinAndSelect("monthlyPayroll.user", "user")
                .leftJoinAndSelect("user.position", "position")
                .leftJoinAndSelect("user.department", "department")
                .where("user.id = :userId", { userId })
                .andWhere("monthlyPayroll.month = :month", { month })
                .andWhere("monthlyPayroll.year = :year", { year });

            const payroll = await query.getOne();
            
            console.log('Query:', query.getQueryAndParameters());
            console.log('Result:', payroll);

            if (!payroll) {
                throw new Error("Monthly payroll not found");
            }

            return payroll;
        } catch (error) {
            throw error;
        }
    }

    // Hoàn tất bảng lương tháng
    async finalizeMonthlyPayroll(id: number): Promise<void> {
        try {
            const payroll = await this.monthlyPayrollRepo.findOneBy({ id });
            if (!payroll) {
                throw new Error("Monthly payroll not found");
            }

            payroll.isFinalized = true;
            await this.monthlyPayrollRepo.save(payroll);
        } catch (error) {
            throw error;
        }
    }
    // Tính tổng lương theo phòng ban trong khoảng thời gian
    async calculateDepartmentPayroll(
        departmentId: number,
        startMonth: number,
        startYear: number,
        endMonth: number,
        endYear: number
    ): Promise<{
        totalBaseSalary: number;
        totalAllowance: number;
        totalDeduction: number;
        totalBenefit: number;
        totalNetSalary: number;
        employeeCount: number;
    }> {
        try {
            const result = await this.monthlyPayrollRepo
                .createQueryBuilder("monthlyPayroll")
                .leftJoin("monthlyPayroll.user", "user")
                .where("user.departmentId = :departmentId", { departmentId })
                .andWhere(
                    "DATE_TRUNC('month', MAKE_DATE(monthlyPayroll.year, monthlyPayroll.month, 1)) BETWEEN :startDate AND :endDate",
                    {
                        startDate: `${startYear}-${startMonth}-01`,
                        endDate: `${endYear}-${endMonth}-01`
                    }
                )
                .andWhere("monthlyPayroll.isFinalized = :isFinalized", { isFinalized: true })
                .select([
                    "SUM(monthlyPayroll.baseSalary) as totalBaseSalary",
                    "SUM(monthlyPayroll.totalAllowance) as totalAllowance",
                    "SUM(monthlyPayroll.totalDeduction) as totalDeduction",
                    "SUM(monthlyPayroll.totalBenefit) as totalBenefit",
                    "SUM(monthlyPayroll.netSalary) as totalNetSalary",
                    "COUNT(DISTINCT monthlyPayroll.userId) as employeeCount"
                ])
                .getRawOne();

            return {
                totalBaseSalary: Number(result.totalBaseSalary) || 0,
                totalAllowance: Number(result.totalAllowance) || 0,
                totalDeduction: Number(result.totalDeduction) || 0,
                totalBenefit: Number(result.totalBenefit) || 0,
                totalNetSalary: Number(result.totalNetSalary) || 0,
                employeeCount: Number(result.employeeCount) || 0
            };
        } catch (error) {
            throw error;
        }
    }
}

export const payrollService = PayrollService.getInstance();