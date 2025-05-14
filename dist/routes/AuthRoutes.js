"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Login route
router.post('/login', (req, res) => AuthController_1.authController.login(req, res));
// Refresh token route
router.post('/refresh-token', (req, res) => AuthController_1.authController.refreshToken(req, res));
// Logout route (requires authentication)
router.post('/logout', authMiddleware_1.authenticateToken, (req, res) => AuthController_1.authController.logout(req, res));
// Get all roles
router.get('/roles', (req, res) => AuthController_1.authController.getRoles(req, res));
exports.default = router;
