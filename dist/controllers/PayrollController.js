"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollController = void 0;
const PayrollService_1 = require("../services/PayrollService");
// ComponentType có thể không cần thiết nữa nếu các hàm quản lý component bị xóa
// import { ComponentType } from '../entities/payroll/PayrollComponent';
const User_1 = require("../entities/core/User"); // Cần User để ép kiểu req.user
const data_source_1 = require("../config/data-source"); // Import AppDataSource
const typeorm_1 = require("typeorm");
class PayrollController {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User); // Khởi tạo userRepo
    }
    static getInstance() {
        if (!PayrollController.instance) {
            PayrollController.instance = new PayrollController();
        }
        return PayrollController.instance;
    }
    // API mới để xử lý tính lương hàng loạt
    handleProcessBatchPayroll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.body;
                // req.user từ authMiddleware có thể có cấu trúc khác User entity đầy đủ
                // Nó có vẻ chứa: { userId: number; roleType: RoleType; permissions: string[]; departmentId?: number; ... }
                const tokenPayload = req.user; // Điều chỉnh theo cấu trúc thực tế từ lỗi
                if (!tokenPayload || tokenPayload.userId === undefined) {
                    return res.status(401).json({ message: "User not authenticated or user ID not found in token." });
                }
                // Lấy thông tin User đầy đủ từ DB
                const requestingUser = yield this.userRepo.findOne({
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
                const result = yield PayrollService_1.payrollService.processBatchPayrollCalculation(requestingUser, numMonth, numYear);
                res.status(200).json({ message: "Payroll calculation processed.", data: result });
            }
            catch (error) {
                console.error("Error in handleProcessBatchPayroll:", error);
                res.status(500).json({ message: error.message || "An unexpected error occurred during payroll processing." });
            }
        });
    }
    // Lấy chi tiết bảng lương tháng (Giữ lại nếu vẫn cần)
    getPayrollDetail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, month, year } = req.params;
                const result = yield PayrollService_1.payrollService.getPayrollDetail(parseInt(userId), parseInt(month), parseInt(year));
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Lấy lịch sử thay đổi của bảng lương
    getPayrollHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { payrollId } = req.params;
                const historyData = yield PayrollService_1.payrollService.getPayrollHistory(parseInt(payrollId));
                // Nếu có lịch sử thay đổi và có ID người thay đổi, lấy thông tin chi tiết
                if (historyData && historyData.length > 0) {
                    const userIds = historyData
                        .filter(entry => entry.updatedBy !== undefined)
                        .map(entry => entry.updatedBy);
                    if (userIds.length > 0) {
                        // Lấy thông tin người dùng từ database
                        const users = yield this.userRepo.findBy({ id: (0, typeorm_1.In)(userIds) });
                        // Map thông tin người dùng vào kết quả
                        const enrichedHistory = historyData.map(entry => {
                            var _a, _b;
                            if (entry.updatedBy) {
                                const user = users.find(u => u.id === entry.updatedBy);
                                if (user) {
                                    return Object.assign(Object.assign({}, entry), { updatedByUser: {
                                            id: user.id,
                                            fullName: user.fullName,
                                            email: user.email,
                                            department: (_a = user.department) === null || _a === void 0 ? void 0 : _a.name,
                                            position: (_b = user.position) === null || _b === void 0 ? void 0 : _b.title
                                        } });
                                }
                            }
                            return entry;
                        });
                        return res.status(200).json(enrichedHistory);
                    }
                }
                // Nếu không có người thay đổi hoặc không có lịch sử, trả về dữ liệu gốc
                res.status(200).json(historyData);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Xóa một mục trong lịch sử thay đổi lương
    deletePayrollHistoryEntry(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { payrollId, timestamp } = req.params;
                // Lấy thông tin người thực hiện từ token
                const tokenPayload = req.user;
                if (!tokenPayload || !tokenPayload.userId) {
                    return res.status(401).json({ message: "User not authenticated" });
                }
                const result = yield PayrollService_1.payrollService.deletePayrollHistoryEntry(parseInt(payrollId), timestamp, tokenPayload.userId);
                res.status(200).json({
                    message: "Đã xóa thành công",
                    success: true
                });
            }
            catch (error) {
                res.status(500).json({ message: error.message, success: false });
            }
        });
    }
    // Hoàn tất bảng lương tháng
    finalizePayroll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield PayrollService_1.payrollService.finalizePayroll(parseInt(id));
                res.status(200).json({ message: "Payroll finalized successfully" });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Cập nhật bảng lương
    updatePayroll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                // Lấy thông tin người thực hiện từ token
                const tokenPayload = req.user;
                if (tokenPayload && tokenPayload.userId) {
                    updateData.updatedBy = tokenPayload.userId;
                }
                const result = yield PayrollService_1.payrollService.updatePayroll(parseInt(id), updateData);
                res.status(200).json({ message: "Payroll updated successfully", data: result });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Thiết lập ngày thanh toán
    setPaymentDate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { paymentDate } = req.body;
                const result = yield PayrollService_1.payrollService.setPaymentDate(parseInt(id), new Date(paymentDate));
                res.status(200).json({ message: "Payment date set successfully", data: result });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.payrollController = PayrollController.getInstance();
