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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const UserService_1 = require("../services/UserService");
const TokenService_1 = require("../services/TokenService");
const Role_1 = require("../entities/auth/Role");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AuthController {
    static getInstance() {
        if (!AuthController.instance) {
            AuthController.instance = new AuthController();
        }
        return AuthController.instance;
    }
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { username, password } = req.body;
                // Validate input
                if (!username || !password) {
                    res.status(400).json({
                        success: false,
                        message: 'Username and password are required'
                    });
                    return;
                }
                // Find user with role and permissions
                const user = yield UserService_1.userService.findUserByUsername(username);
                if (!user) {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid username or password'
                    });
                    return;
                }
                if (!user.isActive) {
                    res.status(401).json({
                        success: false,
                        message: 'Account is inactive'
                    });
                    return;
                }
                // Verify password
                const isValidPassword = yield bcrypt_1.default.compare(password, user.passwordHash);
                if (!isValidPassword) {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid username or password'
                    });
                    return;
                }
                // Get permissions from rolePermissions
                const permissions = ((_a = user.role.rolePermissions) === null || _a === void 0 ? void 0 : _a.map((rp) => rp.permission.code)) || [];
                // Generate tokens
                const tokenData = {
                    userId: user.id,
                    roleType: user.role.roleType,
                    permissions: permissions,
                    departmentId: user.departmentId
                };
                const tokens = TokenService_1.tokenService.generateTokens(tokenData);
                res.status(200).json({
                    success: true,
                    data: Object.assign(Object.assign({}, tokens), { user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            fullName: user.fullName,
                            roleType: user.role.roleType,
                            permissions: permissions,
                            departmentId: user.departmentId
                        } })
                });
            }
            catch (error) {
                console.error('Error during login:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    refreshToken(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    res.status(400).json({
                        success: false,
                        message: 'Refresh token is required'
                    });
                    return;
                }
                const newTokens = yield TokenService_1.tokenService.refreshAccessToken(refreshToken);
                res.status(200).json({
                    success: true,
                    data: newTokens
                });
            }
            catch (error) {
                console.error('Error refreshing token:', error);
                res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }
        });
    }
    logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Client should delete tokens on their side
                res.status(200).json({
                    success: true,
                    message: 'Logged out successfully'
                });
            }
            catch (error) {
                console.error('Error during logout:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getRoles(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const roles = [
                    { type: Role_1.RoleType.SYSTEM_ADMIN, name: "System Administrator" },
                    { type: Role_1.RoleType.HR_STAFF, name: "HR Staff" },
                    { type: Role_1.RoleType.DEPARTMENT_HEAD, name: "Department Head" },
                    { type: Role_1.RoleType.EMPLOYEE, name: "Employee" }
                ];
                res.status(200).json({
                    success: true,
                    data: roles
                });
            }
            catch (error) {
                console.error('Error getting roles:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
}
exports.authController = AuthController.getInstance();
