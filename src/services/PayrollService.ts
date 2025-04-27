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

    // Lấy danh sách thành phần lương theo loại
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

    // Lấy chi tiết bảng lương tháng
    async getMonthlyPayrollDetail(userId: number, month: number, year: number): Promise<MonthlyPayroll> {
        try {
            const payroll = await this.monthlyPayrollRepo.findOne({
                where: {
                    user: { id: userId },
                    month,
                    year
                },
                relations: { user: true }
            });
            
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
}

export const payrollService = PayrollService.getInstance();