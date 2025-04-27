import { Router } from 'express';
import { reportController } from '../controllers/ReportController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Tạo báo cáo phòng ban - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.post(
    '/departments',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => reportController.generateDepartmentReport(req, res)
);

// Lấy báo cáo phòng ban theo thời gian - HR_STAFF, SYSTEM_ADMIN và DEPARTMENT_HEAD có quyền
router.get(
    '/departments/:departmentId',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN, RoleType.DEPARTMENT_HEAD]),
    (req, res) => reportController.getDepartmentReports(req, res)
);

// Thống kê chi phí nhân sự - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.get(
    '/hr-cost',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => reportController.getHRCostStatistics(req, res)
);

// Lấy dữ liệu tổng hợp cho dashboard - HR_STAFF, SYSTEM_ADMIN và DEPARTMENT_HEAD có quyền
router.get(
    '/dashboard-data',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN, RoleType.DEPARTMENT_HEAD]),
    (req, res) => reportController.getDashboardData(req, res)
);

export default router;