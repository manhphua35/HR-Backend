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
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveService = void 0;
const data_source_1 = require("../config/data-source");
const Leave_1 = require("../entities/leave/Leave");
const User_1 = require("../entities/core/User");
const typeorm_1 = require("typeorm");
class LeaveService {
    constructor() {
        this.leaveRepository = data_source_1.AppDataSource.getRepository(Leave_1.Leave);
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    static getInstance() {
        if (!LeaveService.instance) {
            LeaveService.instance = new LeaveService();
        }
        return LeaveService.instance;
    }
    // Helper function để kiểm tra quyền xem
    checkViewPermission(requestingUser, targetUserId, targetDepartmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;
            // Admin và HR có thể xem tất cả
            if (roleType === 'SYSTEM_ADMIN' || roleType === 'HR_STAFF') {
                return true;
            }
            // Trưởng phòng chỉ xem được phòng mình
            if (roleType === 'DEPARTMENT_HEAD') {
                if (!reqUserDeptId)
                    return false;
                // Kiểm tra xem có đang xem phòng ban của mình không
                if (targetDepartmentId && targetDepartmentId === reqUserDeptId) {
                    return true;
                }
                // Kiểm tra xem user có thuộc phòng ban của mình không
                if (targetUserId) {
                    const targetUser = yield this.userRepository.findOne({
                        where: { id: targetUserId, department: { id: reqUserDeptId } }
                    });
                    return !!targetUser;
                }
                // Cho phép xem chung nếu sau này sẽ lọc theo phòng ban
                return !targetUserId && !targetDepartmentId;
            }
            // Nhân viên chỉ xem được đơn của mình
            if (targetUserId && targetUserId === userId) {
                return true;
            }
            // Cho phép xem của bản thân khi không có filter
            if (!targetUserId && !targetDepartmentId) {
                return true;
            }
            return false;
        });
    }
    // Phương thức để lấy tất cả leave với phân quyền
    getLeaves(requestingUser_1) {
        return __awaiter(this, arguments, void 0, function* (requestingUser, filters = {}) {
            const { userId: requestingUserId, roleType, departmentId: reqUserDeptId } = requestingUser;
            const { userId, departmentId } = filters, otherFilters = __rest(filters, ["userId", "departmentId"]);
            const query = this.leaveRepository.createQueryBuilder('leave')
                .leftJoinAndSelect('leave.user', 'user')
                .leftJoinAndSelect('user.department', 'department')
                .leftJoinAndSelect('leave.approver', 'approver')
                .orderBy('leave.createdAt', 'DESC');
            // Áp dụng các filter cơ bản
            if (otherFilters.startDate && otherFilters.endDate) {
                query.andWhere('(leave.startDate BETWEEN :startDate AND :endDate OR leave.endDate BETWEEN :startDate AND :endDate)', { startDate: otherFilters.startDate, endDate: otherFilters.endDate });
            }
            if (otherFilters.status) {
                query.andWhere('leave.status = :status', { status: otherFilters.status });
            }
            if (otherFilters.type) {
                query.andWhere('leave.type = :type', { type: otherFilters.type });
            }
            // Áp dụng phân quyền
            if (roleType === 'SYSTEM_ADMIN' || roleType === 'HR_STAFF') {
                // Admin và HR xem được hết
                if (userId) {
                    query.andWhere('user.id = :userId', { userId });
                }
                if (departmentId) {
                    query.andWhere('department.id = :departmentId', { departmentId });
                }
            }
            else if (roleType === 'DEPARTMENT_HEAD') {
                // Trưởng phòng chỉ xem được phòng mình
                if (!reqUserDeptId) {
                    return []; // Trưởng phòng phải thuộc một phòng ban
                }
                query.andWhere('department.id = :departmentId', { departmentId: reqUserDeptId });
                if (userId) {
                    // Kiểm tra xem userId có thuộc phòng ban không
                    const userInDept = yield this.userRepository.findOne({
                        where: { id: userId, department: { id: reqUserDeptId } }
                    });
                    if (!userInDept) {
                        return [];
                    }
                    query.andWhere('user.id = :userId', { userId });
                }
            }
            else {
                // Nhân viên chỉ xem được đơn của mình
                query.andWhere('user.id = :userId', { userId: requestingUserId });
            }
            return yield query.getMany();
        });
    }
    // Lấy đơn nghỉ phép theo ngày cụ thể
    getLeavesBySpecificDate(requestingUser, date, userId, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getLeaves(requestingUser, {
                startDate: date,
                endDate: date,
                userId,
                departmentId
            });
        });
    }
    // Lấy đơn nghỉ phép theo tháng
    getLeavesByMonth(requestingUser, year, month, userId, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Tính ngày đầu và cuối tháng
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const leaves = yield this.getLeaves(requestingUser, {
                startDate: startDateStr,
                endDate: endDateStr,
                userId,
                departmentId
            });
            // Sắp xếp theo ngày bắt đầu
            return leaves.sort((a, b) => {
                const dateA = new Date(a.startDate).getTime();
                const dateB = new Date(b.startDate).getTime();
                return dateA - dateB;
            });
        });
    }
    createLeave(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if user exists
                const user = yield this.userRepository.findOneBy({ id: data.userId });
                if (!user) {
                    throw new Error('User not found');
                }
                // Check if user has enough remaining leaves for ANNUAL type
                if (data.type === Leave_1.LeaveType.ANNUAL) {
                    if (user.remainingLeaves < data.numberOfDays) {
                        throw new Error('Insufficient remaining leave days');
                    }
                }
                // Check for overlapping leave requests
                const overlappingLeave = yield this.leaveRepository.findOne({
                    where: [
                        {
                            userId: data.userId,
                            startDate: (0, typeorm_1.LessThanOrEqual)(data.endDate),
                            endDate: (0, typeorm_1.MoreThanOrEqual)(data.startDate),
                            status: Leave_1.LeaveStatus.PENDING
                        },
                        {
                            userId: data.userId,
                            startDate: (0, typeorm_1.LessThanOrEqual)(data.endDate),
                            endDate: (0, typeorm_1.MoreThanOrEqual)(data.startDate),
                            status: Leave_1.LeaveStatus.APPROVED
                        }
                    ]
                });
                if (overlappingLeave) {
                    throw new Error('Overlapping leave request exists');
                }
                // Create new leave request
                const leave = this.leaveRepository.create(Object.assign(Object.assign({}, data), { status: Leave_1.LeaveStatus.PENDING }));
                yield this.leaveRepository.save(leave);
                return leave;
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateLeaveStatus(leaveId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const leave = yield this.leaveRepository.findOne({
                    where: { id: leaveId },
                    relations: ['user']
                });
                if (!leave) {
                    throw new Error('Leave request not found');
                }
                if (leave.status !== Leave_1.LeaveStatus.PENDING) {
                    throw new Error('Leave request has already been processed');
                }
                // Update leave status
                leave.status = data.status;
                leave.approverId = data.approverId;
                if (data.status === Leave_1.LeaveStatus.REJECTED && data.rejectionReason) {
                    leave.rejectionReason = data.rejectionReason;
                }
                // If approved and it's annual leave, update user's remaining leaves
                if (data.status === Leave_1.LeaveStatus.APPROVED && leave.type === Leave_1.LeaveType.ANNUAL) {
                    const user = leave.user;
                    user.remainingLeaves -= leave.numberOfDays;
                    yield this.userRepository.save(user);
                }
                yield this.leaveRepository.save(leave);
                return leave;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getPendingLeaves() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.leaveRepository.find({
                    where: { status: Leave_1.LeaveStatus.PENDING },
                    relations: ['user', 'approver'],
                    order: { createdAt: 'ASC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getUserLeaves(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.leaveRepository
                    .createQueryBuilder('leave')
                    .leftJoinAndSelect('leave.user', 'user')
                    .leftJoinAndSelect('leave.approver', 'approver')
                    .leftJoinAndSelect('user.department', 'department')
                    .where('leave.userId = :userId', { userId })
                    .orderBy('leave.createdAt', 'DESC')
                    .getMany();
            }
            catch (error) {
                throw error;
            }
        });
    }
    getLeavesByDateRange(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.leaveRepository.find({
                    where: {
                        startDate: (0, typeorm_1.Between)(startDate, endDate),
                        status: Leave_1.LeaveStatus.APPROVED
                    },
                    relations: ['user', 'approver'],
                    order: { startDate: 'ASC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getLeaveById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if the provided ID is a valid number
                if (isNaN(id) || !Number.isInteger(id)) {
                    console.error(`Invalid ID passed to getLeaveById: ${id}`);
                    return null; // Return null if ID is not a valid integer
                }
                return yield this.leaveRepository.findOne({
                    where: { id },
                    relations: ['user', 'approver']
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllLeaves(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = this.leaveRepository.createQueryBuilder('leave')
                    .leftJoinAndSelect('leave.user', 'user')
                    .leftJoinAndSelect('leave.approver', 'approver')
                    .orderBy('leave.createdAt', 'DESC');
                if (filters.startDate && filters.endDate) {
                    query.andWhere('(leave.startDate BETWEEN :startDate AND :endDate OR leave.endDate BETWEEN :startDate AND :endDate)', { startDate: filters.startDate, endDate: filters.endDate });
                }
                if (filters.status) {
                    query.andWhere('leave.status = :status', { status: filters.status });
                }
                if (filters.type) {
                    query.andWhere('leave.type = :type', { type: filters.type });
                }
                return yield query.getMany();
            }
            catch (error) {
                throw error;
            }
        });
    }
    deleteLeave(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if the leave exists
                const leave = yield this.getLeaveById(id);
                if (!leave) {
                    throw new Error('Leave request not found');
                }
                // Delete the leave
                const result = yield this.leaveRepository.delete(id);
                return result.affected === 1;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.leaveService = LeaveService.getInstance();
