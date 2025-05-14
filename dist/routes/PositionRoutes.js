"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PositionController_1 = require("../controllers/PositionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Create new position - Only SYSTEM_ADMIN or HR_STAFF can access
router.post('/create', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PositionController_1.positionController.createPosition(req, res));
// Get all positions - All authenticated users can access
router.get('/list', authMiddleware_1.authenticateToken, (req, res) => PositionController_1.positionController.getAllPositions(req, res));
// Get positions by department - All authenticated users can access
router.get('/department/:departmentId', authMiddleware_1.authenticateToken, (req, res) => PositionController_1.positionController.getPositionsByDepartment(req, res));
exports.default = router;
