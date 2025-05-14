"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DepartmentController_1 = require("../controllers/DepartmentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Create new department - Only SYSTEM_ADMIN can access
router.post('/create', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => DepartmentController_1.departmentController.createDepartment(req, res));
// Get all departments - All authenticated users can access
router.get('/list', authMiddleware_1.authenticateToken, (req, res) => DepartmentController_1.departmentController.getAllDepartments(req, res));
exports.default = router;
