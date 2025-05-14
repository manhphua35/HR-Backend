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
exports.userController = void 0;
const UserService_1 = require("../services/UserService");
const Role_1 = require("../entities/auth/Role");
class UserController {
    static getInstance() {
        if (!UserController.instance) {
            UserController.instance = new UserController();
        }
        return UserController.instance;
    }
    createUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Kiểm tra xem người dùng hiện tại có quyền SYSTEM_ADMIN không
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.SYSTEM_ADMIN) {
                    res.status(403).json({
                        success: false,
                        message: 'Only system administrators can create new users'
                    });
                    return;
                }
                const userData = {
                    username: req.body.username,
                    password: req.body.password,
                    email: req.body.email,
                    fullName: req.body.fullName,
                    phone: req.body.phone,
                    departmentId: req.body.departmentId,
                    positionId: req.body.positionId,
                    roleId: req.body.roleId,
                    hireDate: new Date(req.body.hireDate),
                    remainingLeaves: req.body.remainingLeaves
                };
                // Validate required fields
                const requiredFields = ['username', 'password', 'email', 'fullName', 'roleId', 'hireDate'];
                const missingFields = requiredFields.filter(field => !req.body[field]);
                if (missingFields.length > 0) {
                    res.status(400).json({
                        success: false,
                        message: `Missing required fields: ${missingFields.join(', ')}`
                    });
                    return;
                }
                const newUser = yield UserService_1.userService.createUser(userData);
                res.status(201).json({
                    success: true,
                    data: newUser,
                    message: 'User created successfully'
                });
            }
            catch (error) {
                console.error('Error creating user:', error);
                if (error.message === 'Username or email already exists') {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message === 'Role not found' ||
                    error.message === 'Department not found' ||
                    error.message === 'Position not found') {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getAllUsers(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield UserService_1.userService.getAllUsers();
                res.status(200).json({
                    success: true,
                    data: users
                });
            }
            catch (error) {
                console.error('Error getting users:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getUserById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.id);
                const user = yield UserService_1.userService.getUserById(userId);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: user
                });
            }
            catch (error) {
                console.error('Error getting user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    updateUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(req.body);
            try {
                const userId = parseInt(req.params.id);
                const userData = {
                    email: req.body.email,
                    fullName: req.body.fullName,
                    phone: req.body.phone,
                    departmentId: req.body.departmentId,
                    positionId: req.body.positionId,
                    roleId: req.body.roleId,
                    isActive: req.body.isActive,
                    remainingLeaves: req.body.remainingLeaves
                };
                const updatedUser = yield UserService_1.userService.updateUser(userId, userData);
                if (!updatedUser) {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: updatedUser,
                    message: 'User updated successfully'
                });
            }
            catch (error) {
                console.error('Error updating user:', error);
                if (error.message === 'Role not found' ||
                    error.message === 'Department not found' ||
                    error.message === 'Position not found') {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    deleteUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.id);
                const success = yield UserService_1.userService.deleteUser(userId);
                if (!success) {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'User deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getUsersByDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { departmentId } = req.params;
                // Kiểm tra xem người dùng hiện tại có quyền DEPARTMENT_HEAD không
                // Nếu là DEPARTMENT_HEAD thì chỉ được xem nhân viên trong phòng ban của mình
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) === Role_1.RoleType.DEPARTMENT_HEAD && Number(req.user.departmentId) !== Number(departmentId)) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền xem nhân viên trong phòng ban của mình'
                    });
                    return;
                }
                // Chỉ HR_STAFF và SYSTEM_ADMIN được xem nhân viên của bất kỳ phòng ban nào
                if (!([Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.DEPARTMENT_HEAD].includes((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType))) {
                    res.status(403).json({
                        success: false,
                        message: 'Không có quyền xem danh sách nhân viên theo phòng ban'
                    });
                    return;
                }
                const users = yield UserService_1.userService.getUsersByDepartment(Number(departmentId));
                res.status(200).json({
                    success: true,
                    data: users
                });
            }
            catch (error) {
                console.error('Error getting department users:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
}
exports.userController = UserController.getInstance();
