"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LeaveController_1 = require("../controllers/LeaveController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Create leave request - All authenticated users can access
router.post('/create', authMiddleware_1.authenticateToken, (req, res) => LeaveController_1.leaveController.createLeave(req, res));
// Update leave status - HR_STAFF có thể duyệt/từ chối đơn
router.put('/:id/status', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => LeaveController_1.leaveController.updateLeaveStatus(req, res));
// Get all pending leave requests - HR_STAFF có thể xem
router.get('/pending', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => LeaveController_1.leaveController.getPendingLeaves(req, res));
// Get current user's leave requests - All authenticated users can access
router.get('/my-leaves', authMiddleware_1.authenticateToken, (req, res) => LeaveController_1.leaveController.getUserLeaves(req, res));
// Get all leave requests - Only SYSTEM_ADMIN and HR_STAFF can access
router.get('/all', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => LeaveController_1.leaveController.getAllLeaves(req, res));
// Get leaves by specific date - All authenticated users can access (phân quyền ở service)
router.get('/by-date', authMiddleware_1.authenticateToken, (req, res) => LeaveController_1.leaveController.getLeavesBySpecificDate(req, res));
// Get leaves by month - All authenticated users can access (phân quyền ở service)
router.get('/by-month', authMiddleware_1.authenticateToken, (req, res) => LeaveController_1.leaveController.getLeavesByMonth(req, res));
// Get leave request by ID - Owner and HR_STAFF can access
router.get('/:id', // This route with a parameter should come after specific routes like /all, /pending, /my-leaves
authMiddleware_1.authenticateToken, (req, res) => LeaveController_1.leaveController.getLeaveById(req, res));
// Delete leave request - SYSTEM_ADMIN, HR_STAFF, and DEPARTMENT_HEAD can access
router.delete('/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD]), (req, res) => LeaveController_1.leaveController.deleteLeave(req, res));
exports.default = router;
