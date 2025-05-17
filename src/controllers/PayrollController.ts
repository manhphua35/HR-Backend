import { Request, Response } from 'express';
import { payrollService } from '../services/PayrollService';
// ComponentType có thể không cần thiết nữa nếu các hàm quản lý component bị xóa
// import { ComponentType } from '../entities/payroll/PayrollComponent';
import { User } from '../entities/core/User'; // Cần User để ép kiểu req.user
import { AppDataSource } from '../config/data-source'; // Import AppDataSource
import { RoleType } from '../entities/auth/Role'; // Giả sử RoleType được dùng trong token payload
// import { ComponentType } from '../entities/payroll/Payroll';
import { In } from 'typeorm';

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

    // Lấy lịch sử thay đổi của bảng lương
    async getPayrollHistory(req: Request, res: Response) {
        try {
            const { payrollId } = req.params;
            const historyData = await payrollService.getPayrollHistory(parseInt(payrollId));
            
            // Nếu có lịch sử thay đổi và có ID người thay đổi, lấy thông tin chi tiết
            if (historyData && historyData.length > 0) {
                const userIds = historyData
                    .filter(entry => entry.updatedBy !== undefined)
                    .map(entry => entry.updatedBy);
                
                if (userIds.length > 0) {
                    // Lấy thông tin người dùng từ database
                    const users = await this.userRepo.findBy({ id: In(userIds) });
                    
                    // Map thông tin người dùng vào kết quả
                    const enrichedHistory = historyData.map(entry => {
                        if (entry.updatedBy) {
                            const user = users.find(u => u.id === entry.updatedBy);
                            if (user) {
                                return {
                                    ...entry,
                                    updatedByUser: {
                                        id: user.id,
                                        fullName: user.fullName,
                                        email: user.email,
                                        department: user.department?.name,
                                        // position: user.position?.title
                                    }
                                };
                            }
                        }
                        return entry;
                    });
                    
                    return res.status(200).json(enrichedHistory);
                }
            }
            
            // Nếu không có người thay đổi hoặc không có lịch sử, trả về dữ liệu gốc
            res.status(200).json(historyData);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Xóa một mục trong lịch sử thay đổi lương
    async deletePayrollHistoryEntry(req: Request, res: Response) {
        try {
            const { payrollId, timestamp } = req.params;
            
            // Lấy thông tin người thực hiện từ token
            const tokenPayload = req.user as { userId: number };
            if (!tokenPayload || !tokenPayload.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }
            
            const result = await payrollService.deletePayrollHistoryEntry(
                parseInt(payrollId),
                timestamp,
                tokenPayload.userId
            );
            
            res.status(200).json({ 
                message: "Đã xóa thành công", 
                success: true
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message, success: false });
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
            
            // Lấy thông tin người thực hiện từ token
            const tokenPayload = req.user as { userId: number };
            if (tokenPayload && tokenPayload.userId) {
                updateData.updatedBy = tokenPayload.userId;
            }
            
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