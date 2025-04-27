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

// Update leave status - Only HR_STAFF can access
router.put(
    '/:id/status',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => leaveController.updateLeaveStatus(req, res)
);

// Get all pending leave requests - Only HR_STAFF can access
router.get(
    '/pending',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => leaveController.getPendingLeaves(req, res)
);

// Get current user's leave requests - All authenticated users can access
router.get(
    '/my-leaves',
    authenticateToken,
    (req, res) => leaveController.getUserLeaves(req, res)
);

// Get leave request by ID - Owner and HR_STAFF can access
router.get(
    '/:id',
    authenticateToken,
    (req, res) => leaveController.getLeaveById(req, res)
);

export default router;