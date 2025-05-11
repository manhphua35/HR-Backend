import { Request, Response } from 'express';
import { payrollService } from '../services/PayrollService';
// ComponentType có thể không cần thiết nữa nếu các hàm quản lý component bị xóa
// import { ComponentType } from '../entities/payroll/PayrollComponent';
import { User } from '../entities/core/User'; // Cần User để ép kiểu req.user
import { AppDataSource } from '../config/data-source'; // Import AppDataSource
import { RoleType } from '../entities/auth/Role'; // Giả sử RoleType được dùng trong token payload
import { ComponentType } from '../entities/payroll/Payroll';

class PayrollController {
    private static instance: PayrollController;
    private userRepo = AppDataSource.getRepository(User); // Khởi tạo userRepo

    private constructor() {}

    public static getInstance(): PayrollController {
        if (!PayrollController.instance) {
            PayrollController.instance = new PayrollController();
        }
        return PayrollController.instance;
    }

    // API mới để xử lý tính lương hàng loạt
    async handleProcessBatchPayroll(req: Request, res: Response) {
        try {
            const { month, year } = req.body;
            // req.user từ authMiddleware có thể có cấu trúc khác User entity đầy đủ
            // Nó có vẻ chứa: { userId: number; roleType: RoleType; permissions: string[]; departmentId?: number; ... }
            const tokenPayload = req.user as { userId: number; roleType: RoleType; departmentId?: number; permissions: string[] }; // Điều chỉnh theo cấu trúc thực tế từ lỗi

            if (!tokenPayload || tokenPayload.userId === undefined) {
                return res.status(401).json({ message: "User not authenticated or user ID not found in token." });
            }

            // Lấy thông tin User đầy đủ từ DB
            const requestingUser = await this.userRepo.findOne({
                where: { id: tokenPayload.userId },
                relations: ["role", "department"] // Sửa từ "roles" thành "role" (số ít)
            });

            if (!requestingUser) {
                return res.status(404).json({ message: "Authenticated user not found in database." });
            }

            if (month === undefined || year === undefined) {
                return res.status(400).json({ message: "Month and year are required in the request body." });
            }
            // Kiểm tra month và year là số hợp lệ
            const numMonth = Number(month);
            const numYear = Number(year);

            if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
                return res.status(400).json({ message: "Invalid month provided." });
            }
            if (isNaN(numYear) || numYear < 1900 || numYear > 2200) { // Giới hạn năm hợp lý
                return res.status(400).json({ message: "Invalid year provided." });
            }

            const result = await payrollService.processBatchPayrollCalculation(requestingUser, numMonth, numYear);
            res.status(200).json({ message: "Payroll calculation processed.", data: result });
        } catch (error: any) {
            console.error("Error in handleProcessBatchPayroll:", error);
            res.status(500).json({ message: error.message || "An unexpected error occurred during payroll processing." });
        }
    }

    // Lấy chi tiết bảng lương tháng (Giữ lại nếu vẫn cần)
    async getPayrollDetail(req: Request, res: Response) {
        try {
            const { userId, month, year } = req.params;
            const result = await payrollService.getPayrollDetail(
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
    async finalizePayroll(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await payrollService.finalizePayroll(parseInt(id));
            res.status(200).json({ message: "Payroll finalized successfully" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Cập nhật bảng lương
    async updatePayroll(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const result = await payrollService.updatePayroll(parseInt(id), updateData);
            res.status(200).json({ message: "Payroll updated successfully", data: result });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Thiết lập ngày thanh toán
    async setPaymentDate(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { paymentDate } = req.body;
            const result = await payrollService.setPaymentDate(parseInt(id), new Date(paymentDate));
            res.status(200).json({ message: "Payment date set successfully", data: result });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const payrollController = PayrollController.getInstance();