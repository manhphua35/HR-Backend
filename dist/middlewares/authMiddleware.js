"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDepartmentAccess = exports.checkPermission = exports.checkRole = exports.authenticateToken = void 0;
const TokenService_1 = require("../services/TokenService");
const AuthService_1 = require("../services/AuthService");
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token not found'
            });
            return;
        }
        try {
            const decoded = TokenService_1.tokenService.verifyAccessToken(token);
            req.user = {
                userId: decoded.userId,
                roleType: decoded.roleType,
                permissions: decoded.permissions,
                departmentId: decoded.departmentId
            };
            next();
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token expired or invalid',
                code: 'TOKEN_EXPIRED'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error authenticating token'
        });
    }
});
exports.authenticateToken = authenticateToken;
const checkRole = (requiredRoles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const hasRole = yield AuthService_1.authService.hasRole(req.user.userId, requiredRoles);
            if (!hasRole) {
                res.status(403).json({
                    success: false,
                    message: 'Insufficient role permissions'
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking role permissions'
            });
        }
    });
};
exports.checkRole = checkRole;
const checkPermission = (requiredPermissions) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const hasPermission = yield AuthService_1.authService.hasPermission(req.user.userId, requiredPermissions);
            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    });
};
exports.checkPermission = checkPermission;
const checkDepartmentAccess = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const departmentId = parseInt(req.params.departmentId) || req.body.departmentId;
            if (!departmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Department ID is required'
                });
                return;
            }
            const hasAccess = yield AuthService_1.authService.checkDepartmentAccess(req.user.userId, departmentId);
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    message: 'Access to this department is restricted'
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking department access'
            });
        }
    });
};
exports.checkDepartmentAccess = checkDepartmentAccess;
