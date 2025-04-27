import { Router } from 'express';
import { departmentController } from '../controllers/DepartmentController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create new department - Only SYSTEM_ADMIN can access
router.post(
    '/create',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN]),
    (req, res) => departmentController.createDepartment(req, res)
);

// Get all departments - All authenticated users can access
router.get(
    '/list',
    authenticateToken,
    (req, res) => departmentController.getAllDepartments(req, res)
);

export default router;