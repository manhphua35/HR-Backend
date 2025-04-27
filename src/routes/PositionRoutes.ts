import { Router } from 'express';
import { positionController } from '../controllers/PositionController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create new position - Only SYSTEM_ADMIN or HR_STAFF can access
router.post(
    '/create',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => positionController.createPosition(req, res)
);

// Get all positions - All authenticated users can access
router.get(
    '/list',
    authenticateToken,
    (req, res) => positionController.getAllPositions(req, res)
);

// Get positions by department - All authenticated users can access
router.get(
    '/department/:departmentId',
    authenticateToken,
    (req, res) => positionController.getPositionsByDepartment(req, res)
);

export default router;