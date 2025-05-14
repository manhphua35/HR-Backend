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
exports.leaveController = void 0;
const LeaveService_1 = require("../services/LeaveService");
const Leave_1 = require("../entities/leave/Leave");
const Role_1 = require("../entities/auth/Role");
class LeaveController {
    static getInstance() {
        if (!LeaveController.instance) {
            LeaveController.instance = new LeaveController();
        }
        return LeaveController.instance;
    }
    // Lấy nghỉ phép theo ngày cụ thể
    getLeavesBySpecificDate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({
                        success: false,
                        message: 'Unauthorized'
                    });
                    return;
                }
                const { date, userId, departmentId } = req.query;
                // Kiểm tra tham số date
                if (!date) {
                    res.status(400).json({
                        success: false,
                        message: 'Date parameter is required'
                    });
                    return;
                }
                // Kiểm tra định dạng ngày (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(date)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid date format. Use YYYY-MM-DD'
                    });
                    return;
                }
                const userIdNum = userId ? parseInt(userId) : undefined;
                const departmentIdNum = departmentId ? parseInt(departmentId) : undefined;
                const leaves = yield LeaveService_1.leaveService.getLeavesBySpecificDate(requestingUser, date, userIdNum, departmentIdNum);
                res.status(200).json({
                    success: true,
                    data: leaves
                });
            }
            catch (error) {
                console.error('Error getting leaves by specific date:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    // Lấy nghỉ phép theo tháng
    getLeavesByMonth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({
                        success: false,
                        message: 'Unauthorized'
                    });
                    return;
                }
                const { year, month, userId, departmentId } = req.query;
                // Kiểm tra tham số year và month
                if (!year || !month) {
                    res.status(400).json({
                        success: false,
                        message: 'Year and month parameters are required'
                    });
                    return;
                }
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid year or month'
                    });
                    return;
                }
                const userIdNum = userId ? parseInt(userId) : undefined;
                const departmentIdNum = departmentId ? parseInt(departmentId) : undefined;
                const leaves = yield LeaveService_1.leaveService.getLeavesByMonth(requestingUser, yearNum, monthNum, userIdNum, departmentIdNum);
                res.status(200).json({
                    success: true,
                    data: leaves
                });
            }
            catch (error) {
                console.error('Error getting leaves by month:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    createLeave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { startDate, endDate, type, reason, numberOfDays } = req.body;
                // Validate required fields
                if (!startDate || !endDate || !type || !numberOfDays) {
                    res.status(400).json({
                        success: false,
                        message: 'Start date, end date, type and number of days are required'
                    });
                    return;
                }
                // Validate date format and range
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid date format'
                    });
                    return;
                }
                if (start > end) {
                    res.status(400).json({
                        success: false,
                        message: 'End date must be after start date'
                    });
                    return;
                }
                // Validate leave type
                if (!Object.values(Leave_1.LeaveType).includes(type)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid leave type'
                    });
                    return;
                }
                const leave = yield LeaveService_1.leaveService.createLeave({
                    userId: req.user.userId,
                    startDate: start,
                    endDate: end,
                    type,
                    reason,
                    numberOfDays
                });
                res.status(201).json({
                    success: true,
                    data: leave,
                    message: 'Leave request created successfully'
                });
            }
            catch (error) {
                console.error('Error creating leave request:', error);
                if (error.message === 'Insufficient remaining leave days' ||
                    error.message === 'Overlapping leave request exists') {
                    res.status(400).json({
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
    updateLeaveStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Check if user is HR staff
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.HR_STAFF && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) !== Role_1.RoleType.SYSTEM_ADMIN) {
                    res.status(403).json({
                        success: false,
                        message: 'Only HR staff can approve/reject leave requests'
                    });
                    return;
                }
                const leaveId = parseInt(req.params.id);
                const { status, rejectionReason } = req.body;
                // Validate status
                if (!Object.values(Leave_1.LeaveStatus).includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid leave status'
                    });
                    return;
                }
                // Validate rejection reason when rejecting
                if (status === Leave_1.LeaveStatus.REJECTED && !rejectionReason) {
                    res.status(400).json({
                        success: false,
                        message: 'Rejection reason is required when rejecting a leave request'
                    });
                    return;
                }
                const updatedLeave = yield LeaveService_1.leaveService.updateLeaveStatus(leaveId, {
                    status,
                    approverId: req.user.userId,
                    rejectionReason
                });
                res.status(200).json({
                    success: true,
                    data: updatedLeave,
                    message: `Leave request ${status.toLowerCase()} successfully`
                });
            }
            catch (error) {
                console.error('Error updating leave status:', error);
                if (error.message === 'Leave request not found') {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message === 'Leave request has already been processed') {
                    res.status(400).json({
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
    getPendingLeaves(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Check if user is HR staff
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.HR_STAFF) {
                    res.status(403).json({
                        success: false,
                        message: 'Only HR staff can view pending leave requests'
                    });
                    return;
                }
                const leaves = yield LeaveService_1.leaveService.getPendingLeaves();
                res.status(200).json({
                    success: true,
                    data: leaves
                });
            }
            catch (error) {
                console.error('Error getting pending leaves:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getUserLeaves(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const leaves = yield LeaveService_1.leaveService.getUserLeaves(req.user.userId);
                res.status(200).json({
                    success: true,
                    data: leaves
                });
            }
            catch (error) {
                console.error('Error getting user leaves:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getLeaveById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const leaveId = parseInt(req.params.id);
                const leave = yield LeaveService_1.leaveService.getLeaveById(leaveId);
                if (!leave) {
                    res.status(404).json({
                        success: false,
                        message: 'Leave request not found'
                    });
                    return;
                }
                // Check if user has permission to view this leave
                if (leave.userId !== req.user.userId &&
                    ((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.HR_STAFF) {
                    res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: leave
                });
            }
            catch (error) {
                console.error('Error getting leave:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getAllLeaves(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                    return;
                }
                // Check if user has permission
                if (![Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF].includes(req.user.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'Only system administrators and HR staff can view all leave requests'
                    });
                    return;
                }
                // Get filter parameters from query
                const { startDate, endDate, status, type } = req.query;
                const leaves = yield LeaveService_1.leaveService.getAllLeaves({
                    startDate: startDate,
                    endDate: endDate,
                    status: status,
                    type: type
                });
                res.status(200).json({
                    success: true,
                    data: leaves
                });
            }
            catch (error) {
                console.error('Error getting all leaves:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    deleteLeave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const leaveId = parseInt(req.params.id);
                // Check if leave exists
                const leave = yield LeaveService_1.leaveService.getLeaveById(leaveId);
                if (!leave) {
                    res.status(404).json({
                        success: false,
                        message: 'Leave request not found'
                    });
                    return;
                }
                // Check if user has permission to delete this leave
                const hasPermission = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) === Role_1.RoleType.SYSTEM_ADMIN ||
                    ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) === Role_1.RoleType.HR_STAFF ||
                    (((_c = req.user) === null || _c === void 0 ? void 0 : _c.roleType) === Role_1.RoleType.DEPARTMENT_HEAD &&
                        ((_d = req.user) === null || _d === void 0 ? void 0 : _d.departmentId) === leave.user.departmentId);
                if (!hasPermission) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to delete this leave request'
                    });
                    return;
                }
                const result = yield LeaveService_1.leaveService.deleteLeave(leaveId);
                if (result) {
                    res.status(200).json({
                        success: true,
                        message: 'Leave request deleted successfully'
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to delete leave request'
                    });
                }
            }
            catch (error) {
                console.error('Error deleting leave:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
}
exports.leaveController = LeaveController.getInstance();
