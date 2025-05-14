"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PayrollController_1 = require("../controllers/PayrollController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// API xử lý tính lương hàng loạt
router.post('/process-batch', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([
    Role_1.RoleType.SYSTEM_ADMIN,
    Role_1.RoleType.HR_STAFF,
    Role_1.RoleType.DEPARTMENT_HEAD
]), (req, res) => PayrollController_1.payrollController.handleProcessBatchPayroll(req, res));
// Lấy chi tiết bảng lương của nhân viên
router.get('/detail/:userId/:month/:year', authMiddleware_1.authenticateToken, (req, res) => PayrollController_1.payrollController.getPayrollDetail(req, res));
// Lấy lịch sử thay đổi bảng lương
router.get('/history/:payrollId', authMiddleware_1.authenticateToken, (req, res) => PayrollController_1.payrollController.getPayrollHistory(req, res));
// Xóa một mục trong lịch sử thay đổi
router.delete('/history/:payrollId/:timestamp', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PayrollController_1.payrollController.deletePayrollHistoryEntry(req, res));
// Hoàn tất bảng lương - Chỉ SYSTEM_ADMIN, HR_STAFF có quyền
router.put('/finalize/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PayrollController_1.payrollController.finalizePayroll(req, res));
// Cập nhật bảng lương (thêm bonus, allowance, benefit)
router.put('/update/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PayrollController_1.payrollController.updatePayroll(req, res));
// Thiết lập ngày thanh toán
router.put('/payment-date/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PayrollController_1.payrollController.setPaymentDate(req, res));
// Các route liên quan đến /components và /calculate (cũ) đã được loại bỏ.
exports.default = router;
