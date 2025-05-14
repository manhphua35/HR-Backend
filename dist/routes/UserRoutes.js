"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Create new user - Only SYSTEM_ADMIN can access
router.post('/create', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => UserController_1.userController.createUser(req, res));
// Get all users
router.get('/list', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => UserController_1.userController.getAllUsers(req, res));
// Get user by ID
router.get('/detail/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => UserController_1.userController.getUserById(req, res));
// Update user
router.put('/update/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => UserController_1.userController.updateUser(req, res));
// Delete user
router.delete('/delete/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => UserController_1.userController.deleteUser(req, res));
// Lấy danh sách nhân viên theo phòng ban
router.get('/department/:departmentId', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD]), (req, res) => UserController_1.userController.getUsersByDepartment(req, res));
exports.default = router;
