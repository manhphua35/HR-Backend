import { Router } from 'express';
import { payrollController } from '../controllers/PayrollController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// API xử lý tính lương hàng loạt
router.post(
    '/process-batch',
    authenticateToken,
    checkRole([
        RoleType.SYSTEM_ADMIN,
        RoleType.HR_STAFF,
        RoleType.DEPARTMENT_HEAD
    ]),
    (req, res) => payrollController.handleProcessBatchPayroll(req, res)
);

// Lấy chi tiết bảng lương của nhân viên
router.get(
    '/detail/:userId/:month/:year',
    authenticateToken,
    (req, res) => payrollController.getPayrollDetail(req, res)
);

// Hoàn tất bảng lương - Chỉ SYSTEM_ADMIN, HR_STAFF có quyền
router.put(
    '/finalize/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => payrollController.finalizePayroll(req, res)
);

// Cập nhật bảng lương (thêm bonus, allowance, benefit)
router.put(
    '/update/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => payrollController.updatePayroll(req, res)
);

// Thiết lập ngày thanh toán
router.put(
    '/payment-date/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => payrollController.setPaymentDate(req, res)
);

// Các route liên quan đến /components và /calculate (cũ) đã được loại bỏ.

export default router;