import { Router } from 'express';
import { payrollController } from '../controllers/PayrollController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Tính lương tháng cho nhân viên - Chỉ HR_STAFF có quyền
router.post(
    '/calculate',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => payrollController.calculateMonthlyPayroll(req, res)
);

// Thêm thành phần lương mới - Chỉ HR_STAFF có quyền
router.post(
    '/components',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => payrollController.addPayrollComponent(req, res)
);

// Cập nhật thành phần lương - Chỉ HR_STAFF có quyền
router.put(
    '/components/:id',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => payrollController.updatePayrollComponent(req, res)
);

// Xóa thành phần lương - Chỉ HR_STAFF có quyền
router.delete(
    '/components/:id',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => payrollController.deletePayrollComponent(req, res)
);

// Lấy danh sách thành phần lương theo loại - HR_STAFF và SYSTEM_ADMIN có quyền
router.get(
    '/components/:type',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => payrollController.getPayrollComponentsByType(req, res)
);

// Lấy chi tiết bảng lương tháng - HR_STAFF và chủ sở hữu có quyền
router.get(
    '/monthly/:userId/:month/:year',
    authenticateToken,
    (req, res) => payrollController.getMonthlyPayrollDetail(req, res)
);

// Hoàn tất bảng lương tháng - Chỉ HR_STAFF có quyền
router.put(
    '/finalize/:id',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => payrollController.finalizeMonthlyPayroll(req, res)
);

export default router;