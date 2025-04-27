import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create new user - Only SYSTEM_ADMIN can access
router.post(
    '/create',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN]),
    (req, res) => userController.createUser(req, res)
);

// Get all users
router.get(
    '/list',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => userController.getAllUsers(req, res)
);

// Get user by ID
router.get(
    '/detail/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => userController.getUserById(req, res)
);

// Update user
router.put(
    '/update/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN]),
    (req, res) => userController.updateUser(req, res)
);

// Delete user
router.delete(
    '/delete/:id',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN]),
    (req, res) => userController.deleteUser(req, res)
);

export default router;