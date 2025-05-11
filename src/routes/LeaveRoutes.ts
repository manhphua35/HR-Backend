import { Router } from 'express';
import { leaveController } from '../controllers/LeaveController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create leave request - All authenticated users can access
router.post(
    '/create',
    authenticateToken,
    (req, res) => leaveController.createLeave(req, res)
);

// Update leave status - HR_STAFF có thể duyệt/từ chối đơn
router.put(
    '/:id/status',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => leaveController.updateLeaveStatus(req, res)
);

// Get all pending leave requests - HR_STAFF có thể xem
router.get(
    '/pending',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => leaveController.getPendingLeaves(req, res)
);

// Get current user's leave requests - All authenticated users can access
router.get(
    '/my-leaves',
    authenticateToken,
    (req, res) => leaveController.getUserLeaves(req, res)
);

// Get all leave requests - Only SYSTEM_ADMIN and HR_STAFF can access
router.get(
    '/all',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => leaveController.getAllLeaves(req, res)
);

// Get leaves by specific date - All authenticated users can access (phân quyền ở service)
router.get(
    '/by-date',
    authenticateToken,
    (req, res) => leaveController.getLeavesBySpecificDate(req, res)
);

// Get leaves by month - All authenticated users can access (phân quyền ở service)
router.get(
    '/by-month',
    authenticateToken,
    (req, res) => leaveController.getLeavesByMonth(req, res)
);

// Get leave request by ID - Owner and HR_STAFF can access
router.get(
    '/:id', // This route with a parameter should come after specific routes like /all, /pending, /my-leaves
    authenticateToken,
    (req, res) => leaveController.getLeaveById(req, res)
);

// Delete leave request - SYSTEM_ADMIN, HR_STAFF, and DEPARTMENT_HEAD can access
router.delete(
    '/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD]),
    (req, res) => leaveController.deleteLeave(req, res)
);

export default router;