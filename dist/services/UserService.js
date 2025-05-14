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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/core/User");
const Role_1 = require("../entities/auth/Role");
const Department_1 = require("../entities/core/Department");
const Position_1 = require("../entities/core/Position");
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserService {
    constructor() {
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        this.roleRepository = data_source_1.AppDataSource.getRepository(Role_1.Role);
        this.departmentRepository = data_source_1.AppDataSource.getRepository(Department_1.Department);
        this.positionRepository = data_source_1.AppDataSource.getRepository(Position_1.Position);
    }
    static getInstance() {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }
    findUserByUsername(username) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.userRepository.findOne({
                    where: { username },
                    relations: {
                        role: {
                            rolePermissions: {
                                permission: true
                            }
                        }
                    }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    createUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate unique username and email
                const existingUser = yield this.userRepository.findOne({
                    where: [
                        { username: data.username },
                        { email: data.email }
                    ]
                });
                if (existingUser) {
                    throw new Error('Username or email already exists');
                }
                // Check if role exists
                const role = yield this.roleRepository.findOneBy({ id: data.roleId });
                if (!role) {
                    throw new Error('Role not found');
                }
                // Check department if provided
                if (data.departmentId) {
                    const department = yield this.departmentRepository.findOneBy({ id: data.departmentId });
                    if (!department) {
                        throw new Error('Department not found');
                    }
                }
                // Check position if provided
                if (data.positionId) {
                    const position = yield this.positionRepository.findOneBy({ id: data.positionId });
                    if (!position) {
                        throw new Error('Position not found');
                    }
                }
                // Hash password
                const salt = yield bcrypt_1.default.genSalt(10);
                const passwordHash = yield bcrypt_1.default.hash(data.password, salt);
                // Create new user object with all required fields
                const user = this.userRepository.create({
                    username: data.username,
                    passwordHash: passwordHash,
                    email: data.email,
                    fullName: data.fullName,
                    roleId: data.roleId,
                    hireDate: data.hireDate,
                    remainingLeaves: data.remainingLeaves || 0,
                    isActive: true
                });
                // Add optional fields if provided
                if (data.phone !== undefined) {
                    user.phone = data.phone;
                }
                if (data.departmentId !== undefined) {
                    user.departmentId = data.departmentId;
                }
                if (data.positionId !== undefined) {
                    user.positionId = data.positionId;
                }
                yield this.userRepository.save(user);
                // Return user without password hash
                const { passwordHash: _ } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
                return userWithoutPassword;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield this.userRepository.find({
                    relations: {
                        department: true,
                        position: true,
                        role: true
                    }
                });
                // Remove password hashes
                return users.map(user => {
                    const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
                    return userWithoutPassword;
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOne({
                    where: { id },
                    relations: {
                        department: true,
                        position: true,
                        role: true
                    }
                });
                if (!user)
                    return null;
                // Remove password hash
                const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
                return userWithoutPassword;
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateUser(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOneBy({ id });
                if (!user)
                    return null;
                // Check role if provided
                if (data.roleId) {
                    const role = yield this.roleRepository.findOneBy({ id: data.roleId });
                    if (!role) {
                        throw new Error('Role not found');
                    }
                }
                // Check department if provided
                if (data.departmentId) {
                    const department = yield this.departmentRepository.findOneBy({ id: data.departmentId });
                    if (!department) {
                        throw new Error('Department not found');
                    }
                }
                // Check position if provided
                if (data.positionId) {
                    const position = yield this.positionRepository.findOneBy({ id: data.positionId });
                    if (!position) {
                        throw new Error('Position not found');
                    }
                }
                // Update user fields
                Object.assign(user, data);
                yield this.userRepository.save(user);
                // Return updated user without password hash
                const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
                return userWithoutPassword;
            }
            catch (error) {
                throw error;
            }
        });
    }
    deleteUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.userRepository.findOneBy({ id });
                if (!user)
                    return false;
                yield this.userRepository.remove(user);
                return true;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getUsersByDepartment(departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield this.userRepository.find({
                    where: {
                        departmentId,
                        isActive: true
                    },
                    relations: {
                        department: true,
                        position: true,
                        role: true
                    },
                    order: {
                        fullName: 'ASC'
                    }
                });
                // Remove password hashes
                return users.map(user => {
                    const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
                    return userWithoutPassword;
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.userService = UserService.getInstance();
