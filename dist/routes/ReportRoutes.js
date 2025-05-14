"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReportController_1 = require("../controllers/ReportController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Tạo báo cáo cho toàn công ty - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.post('/company', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => ReportController_1.reportController.generateCompanyReport(req, res));
// Lấy báo cáo toàn công ty - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.get('/company', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => ReportController_1.reportController.getCompanyReports(req, res));
// Tạo báo cáo phòng ban - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.post('/departments', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => ReportController_1.reportController.generateDepartmentReport(req, res));
// Lấy báo cáo phòng ban theo thời gian - HR_STAFF, SYSTEM_ADMIN và DEPARTMENT_HEAD có quyền
router.get('/departments/:departmentId', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.DEPARTMENT_HEAD]), (req, res) => ReportController_1.reportController.getDepartmentReports(req, res));
// Thống kê chi phí nhân sự - Chỉ HR_STAFF và SYSTEM_ADMIN có quyền
router.get('/hr-cost', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => ReportController_1.reportController.getHRCostStatistics(req, res));
// Lấy dữ liệu tổng hợp cho dashboard - HR_STAFF, SYSTEM_ADMIN và DEPARTMENT_HEAD có quyền
router.get('/dashboard-data', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.DEPARTMENT_HEAD]), (req, res) => ReportController_1.reportController.getDashboardData(req, res));
// Lấy dữ liệu dashboard cho nhân viên cụ thể - Tất cả role đều có thể truy cập, nhưng phân quyền ở controller
router.get('/employee-dashboard/:employeeId', authMiddleware_1.authenticateToken, (req, res) => ReportController_1.reportController.getEmployeeDashboardData(req, res));
// Lấy dữ liệu dashboard cho trưởng phòng - Chỉ DEPARTMENT_HEAD có quyền
router.get('/department-dashboard/:departmentId', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => ReportController_1.reportController.getDepartmentManagerDashboard(req, res));
exports.default = router;
