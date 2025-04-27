import { Request, Response } from 'express';
import { payrollService } from '../services/PayrollService';
import { ComponentType } from '../entities/payroll/PayrollComponent';

class PayrollController {
    private static instance: PayrollController;

    private constructor() {}

    public static getInstance(): PayrollController {
        if (!PayrollController.instance) {
            PayrollController.instance = new PayrollController();
        }
        return PayrollController.instance;
    }

    // Tính lương tháng cho nhân viên
    async calculateMonthlyPayroll(req: Request, res: Response) {
        try {
            const { userId, month, year } = req.body;
            const result = await payrollService.calculateMonthlyPayroll(userId, month, year);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Thêm thành phần lương mới
    async addPayrollComponent(req: Request, res: Response) {
        try {
            const { name, amount, type, description, userId } = req.body;
            const result = await payrollService.addPayrollComponent(name, amount, type as ComponentType, description, userId);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Cập nhật thành phần lương
    async updatePayrollComponent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, amount, type, description } = req.body;
            const result = await payrollService.updatePayrollComponent(
                parseInt(id),
                name,
                amount,
                type as ComponentType,
                description
            );
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Xóa thành phần lương
    async deletePayrollComponent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await payrollService.deletePayrollComponent(parseInt(id));
            res.status(200).json({ message: "Payroll component deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy danh sách thành phần lương theo loại
    async getPayrollComponentsByType(req: Request, res: Response) {
        try {
            const { type } = req.params;
            const result = await payrollService.getPayrollComponentsByType(type as ComponentType);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy chi tiết bảng lương tháng
    async getMonthlyPayrollDetail(req: Request, res: Response) {
        try {
            const { userId, month, year } = req.params;
            const result = await payrollService.getMonthlyPayrollDetail(
                parseInt(userId),
                parseInt(month),
                parseInt(year)
            );
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Hoàn tất bảng lương tháng
    async finalizeMonthlyPayroll(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await payrollService.finalizeMonthlyPayroll(parseInt(id));
            res.status(200).json({ message: "Monthly payroll finalized successfully" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const payrollController = PayrollController.getInstance();