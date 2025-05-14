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
exports.authService = void 0;
const User_1 = require("../entities/core/User");
const data_source_1 = require("../config/data-source");
const Role_1 = require("../entities/auth/Role");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AuthService {
    constructor() {
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    validateUser(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOne({
                    where: { username },
                    relations: {
                        role: {
                            rolePermissions: {
                                permission: true
                            }
                        }
                    }
                });
                if (!user || !user.isActive) {
                    return null;
                }
                const isValidPassword = yield bcrypt_1.default.compare(password, user.passwordHash);
                if (!isValidPassword) {
                    return null;
                }
                return user;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getUserPermissions(user) {
        var _a;
        if (!((_a = user.role) === null || _a === void 0 ? void 0 : _a.rolePermissions)) {
            return [];
        }
        return user.role.rolePermissions.map(rp => rp.permission.code);
    }
    hasRole(userId, requiredRoles) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOne({
                    where: { id: userId },
                    relations: { role: true }
                });
                if (!user || !user.role) {
                    return false;
                }
                return requiredRoles.includes(user.role.roleType);
            }
            catch (error) {
                throw error;
            }
        });
    }
    hasPermission(userId, requiredPermissions) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = yield this.userRepository.findOne({
                    where: { id: userId },
                    relations: {
                        role: {
                            rolePermissions: {
                                permission: true
                            }
                        }
                    }
                });
                if (!user || !((_a = user.role) === null || _a === void 0 ? void 0 : _a.rolePermissions)) {
                    return false;
                }
                const userPermissions = this.getUserPermissions(user);
                return requiredPermissions.every(permission => userPermissions.includes(permission));
            }
            catch (error) {
                throw error;
            }
        });
    }
    checkDepartmentAccess(userId, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOne({
                    where: { id: userId },
                    relations: { role: true }
                });
                if (!user || !user.role) {
                    return false;
                }
                // System admin and HR staff have access to all departments
                if (user.role.roleType === Role_1.RoleType.SYSTEM_ADMIN ||
                    user.role.roleType === Role_1.RoleType.HR_STAFF) {
                    return true;
                }
                // Department manager can only access their own department
                if (user.role.roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                    return user.departmentId === Number(departmentId);
                }
                // Regular employees can only access their own department's data
                return user.departmentId === Number(departmentId);
            }
            catch (error) {
                throw error;
            }
        });
    }
    isAuthorizedForUser(requestingUserId, targetUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Users can always access their own data
                if (requestingUserId === targetUserId) {
                    return true;
                }
                const requestingUser = yield this.userRepository.findOne({
                    where: { id: requestingUserId },
                    relations: { role: true }
                });
                if (!requestingUser || !requestingUser.role) {
                    return false;
                }
                // System admin and HR staff can access all user data
                if (requestingUser.role.roleType === Role_1.RoleType.SYSTEM_ADMIN ||
                    requestingUser.role.roleType === Role_1.RoleType.HR_STAFF) {
                    return true;
                }
                // If requester is a manager, they can only access their department's users
                if (requestingUser.role.roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                    const targetUser = yield this.userRepository.findOneBy({ id: targetUserId });
                    if (!targetUser) {
                        return false;
                    }
                    return requestingUser.departmentId === targetUser.departmentId;
                }
                // Regular employees can't access other users' data
                return false;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.authService = AuthService.getInstance();
