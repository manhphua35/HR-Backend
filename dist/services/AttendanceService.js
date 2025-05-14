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
exports.AttendanceService = void 0;
const typeorm_1 = require("typeorm"); // Added IsNull, Not
const Attendance_1 = require("../entities/attendance/Attendance");
const data_source_1 = require("../config/data-source"); // Import AppDataSource
const Leave_1 = require("../entities/leave/Leave"); // Import Leave entity
const Role_1 = require("../entities/auth/Role"); // Import RoleType
class AttendanceService {
    constructor(attendanceRepository, userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.leaveRepository = data_source_1.AppDataSource.getRepository(Leave_1.Leave); // Initialize leave repository
    }
    // Helper function to check view permissions using AuthenticatedUser
    checkViewPermission(requestingUser, targetUserId, targetDepartmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;
            if (roleType === Role_1.RoleType.SYSTEM_ADMIN || roleType === Role_1.RoleType.HR_STAFF) {
                return true; // Admin/HR can view all
            }
            if (roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                if (!reqUserDeptId)
                    return false; // Manager must belong to a department
                // Check if viewing own department or specific user within own department
                if (targetDepartmentId && targetDepartmentId === reqUserDeptId) {
                    return true; // Can view own department data
                }
                if (targetUserId) {
                    // Check if the target user belongs to the manager's department
                    const targetUser = yield this.userRepository.findOne({ where: { id: targetUserId, department: { id: reqUserDeptId } } });
                    return !!targetUser; // Return true if the user exists in their department
                }
                // Manager viewing general list - allow if filtered implicitly to their department later
                return !targetUserId && !targetDepartmentId; // Allow if no specific target outside dept is requested
            }
            // Regular employee (EMPLOYEE)
            if (targetUserId && targetUserId === userId) {
                return true; // Can view own data
            }
            // Allow viewing own data implicitly when no filters are applied by employee
            if (!targetUserId && !targetDepartmentId) {
                return true; // Let the main query handle filtering by requestingUser.userId
            }
            return false; // Default deny
        });
    }
    // Helper function to check edit/delete permissions using AuthenticatedUser
    checkModifyPermission(requestingUser, attendanceRecord) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;
            if (roleType === Role_1.RoleType.SYSTEM_ADMIN || roleType === Role_1.RoleType.HR_STAFF) {
                return true; // Admin/HR can modify all
            }
            // Potentially allow managers to modify records in their department?
            if (roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                if (!reqUserDeptId)
                    return false; // Manager must belong to a department
                // Check if the record belongs to a user in the manager's department
                // Need to ensure attendanceRecord.user.department is loaded or query it
                const recordUserId = (_a = attendanceRecord.user) === null || _a === void 0 ? void 0 : _a.id; // Use optional chaining
                if (!recordUserId)
                    return false; // Should not happen if relation is loaded
                // Efficient check: see if user exists in the department
                const userExistsInDept = yield this.userRepository.exists({ where: { id: recordUserId, department: { id: reqUserDeptId } } });
                return userExistsInDept; // Allow if user is in their department
            }
            // Allow users to modify their *own* records under certain conditions?
            if (((_b = attendanceRecord.user) === null || _b === void 0 ? void 0 : _b.id) === userId) { // Use optional chaining
                // Example: Allow only adding notes, not changing times after a certain period
                // For now, let's allow full modification of own record for simplicity
                return true;
            }
            return false; // Default deny
        });
    }
    // Get attendances with permission checks using AuthenticatedUser
    getAttendances(requestingUser, // Changed to AuthenticatedUser
    userId, departmentId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { userId: requestingUserId, roleType, departmentId: managerDepartmentId } = requestingUser;
            const options = {
                relations: ['user', 'user.role', 'user.department', 'leaveRequest'],
                order: { date: 'DESC', checkInTime: 'ASC' },
            };
            const where = {};
            // --- Input Parsing ---
            const targetUserIdNum = userId ? parseInt(userId, 10) : undefined;
            const targetDepartmentIdNum = departmentId ? parseInt(departmentId, 10) : undefined;
            if (userId && isNaN(targetUserIdNum))
                throw new Error('User ID không hợp lệ.');
            if (departmentId && isNaN(targetDepartmentIdNum))
                throw new Error('Department ID không hợp lệ.');
            // --- Date range filtering ---
            if (startDate && endDate) {
                where.date = (0, typeorm_1.Between)(startDate, endDate);
            }
            else if (startDate) {
                where.date = (0, typeorm_1.Between)(startDate, new Date().toISOString().split('T')[0]);
            }
            // --- Permission-Based Filtering ---
            if (roleType === Role_1.RoleType.SYSTEM_ADMIN || roleType === Role_1.RoleType.HR_STAFF) {
                // Admin/HR can view all, apply filters if provided
                if (targetUserIdNum)
                    where.user = { id: targetUserIdNum };
                if (targetDepartmentIdNum) {
                    if ((_a = where.user) === null || _a === void 0 ? void 0 : _a.id) { // Combine filters if both exist
                        where.user.department = { id: targetDepartmentIdNum };
                    }
                    else {
                        where.user = { department: { id: targetDepartmentIdNum } };
                    }
                }
            }
            else if (roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                if (!managerDepartmentId)
                    throw new Error('Trưởng phòng không thuộc phòng ban nào.');
                where.user = { department: { id: managerDepartmentId } }; // Base filter: own department
                if (targetUserIdNum) {
                    // Ensure the target user is actually in the manager's department
                    if (!(yield this.userRepository.exists({ where: { id: targetUserIdNum, department: { id: managerDepartmentId } } }))) {
                        return []; // User not in manager's department
                    }
                    where.user.id = targetUserIdNum; // Add specific user filter
                }
                // If departmentId is provided, it must match the manager's department (already handled by base filter)
                if (targetDepartmentIdNum && targetDepartmentIdNum !== managerDepartmentId) {
                    return []; // Trying to query outside own department
                }
            }
            else { // Employee
                where.user = { id: requestingUserId }; // Can only view their own
                // If they try to filter by another userId or departmentId, deny access (return empty)
                if ((targetUserIdNum && targetUserIdNum !== requestingUserId) || targetDepartmentIdNum) {
                    return [];
                }
            }
            options.where = where;
            return this.attendanceRepository.find(options);
        });
    }
    // Get single attendance by ID with permission check using AuthenticatedUser
    getAttendanceById(requestingUser, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const attendance = yield this.attendanceRepository.findOne({
                where: { id },
                relations: ['user', 'user.role', 'user.department', 'leaveRequest'], // Ensure department is loaded for user
            });
            if (!attendance)
                return null;
            // Check permission based on the record's user/department
            const canView = yield this.checkViewPermission(requestingUser, (_a = attendance.user) === null || _a === void 0 ? void 0 : _a.id, (_c = (_b = attendance.user) === null || _b === void 0 ? void 0 : _b.department) === null || _c === void 0 ? void 0 : _c.id); // Use optional chaining
            if (!canView)
                throw new Error('Forbidden');
            return attendance;
        });
    }
    // Create or Update Attendance Record (e.g., for manual entry or corrections by HR/Admin)
    // This method might not need requestingUser if permissions are checked in controller or a dedicated method
    createOrUpdateAttendance(attendanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Permission should ideally be checked before calling this method (e.g., in controller)
            // based on who is allowed to create/update records for others.
            var _a;
            const { userId, date } = attendanceData, restData = __rest(attendanceData, ["userId", "date"]);
            const userIdNum = parseInt(userId, 10);
            if (isNaN(userIdNum) || !date) {
                throw new Error('User ID và Ngày là bắt buộc và User ID phải là số.');
            }
            const user = yield this.userRepository.findOneBy({ id: userIdNum });
            if (!user)
                throw new Error(`Không tìm thấy người dùng với ID ${userIdNum}`);
            let attendance = yield this.attendanceRepository.findOne({ where: { user: { id: userIdNum }, date } });
            if (attendance) { // Update existing record
                // Consider if status should be automatically updated based on times
                Object.assign(attendance, restData);
                if (attendance.checkInTime && attendance.checkOutTime) {
                    attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
                }
                else {
                    attendance.workHours = null; // Reset if check-in or check-out is removed
                }
                // If status is manually set to leave, clear times and set workHours
                if (restData.status === Attendance_1.AttendanceStatus.LEAVE) {
                    attendance.checkInTime = null;
                    attendance.checkOutTime = null;
                    attendance.workHours = 0; // Or null
                    // Link leave request if provided
                    if (restData.leaveRequest)
                        attendance.leaveRequest = restData.leaveRequest;
                }
                else if (restData.status === Attendance_1.AttendanceStatus.PRESENT && attendance.checkInTime && !attendance.checkOutTime) {
                    // If marked present manually, ensure work hours are null until checkout
                    attendance.workHours = null;
                    attendance.leaveRequest = null; // Unlink leave if marked present
                }
                else if (restData.status === Attendance_1.AttendanceStatus.ABSENT) {
                    attendance.checkInTime = null;
                    attendance.checkOutTime = null;
                    attendance.workHours = 0; // Or null
                    attendance.leaveRequest = null;
                }
            }
            else { // Create new record
                attendance = this.attendanceRepository.create(Object.assign(Object.assign({}, restData), { user: user, date: date, workHours: (restData.checkInTime && restData.checkOutTime)
                        ? this.calculateWorkHours(restData.checkInTime, restData.checkOutTime)
                        : (restData.status === Attendance_1.AttendanceStatus.LEAVE ? 0 : null), 
                    // Ensure status matches times if possible, default to ABSENT if no info
                    status: (_a = restData.status) !== null && _a !== void 0 ? _a : (restData.checkInTime ? Attendance_1.AttendanceStatus.PRESENT : Attendance_1.AttendanceStatus.ABSENT) }));
                // If created as leave, clear times
                if (attendance.status === Attendance_1.AttendanceStatus.LEAVE) {
                    attendance.checkInTime = null;
                    attendance.checkOutTime = null;
                }
            }
            return this.attendanceRepository.save(attendance);
        });
    }
    // Update an existing attendance record with permission check using AuthenticatedUser
    updateAttendance(requestingUser, id, attendanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const attendance = yield this.attendanceRepository.findOne({
                where: { id },
                relations: ['user', 'user.department'] // Ensure user and department are loaded
            });
            if (!attendance)
                return null; // Not found
            const canModify = yield this.checkModifyPermission(requestingUser, attendance);
            if (!canModify)
                throw new Error('Forbidden');
            // Prevent changing the user or date via this method
            delete attendanceData.user;
            delete attendanceData.date;
            delete attendanceData.id; // Cannot change ID
            // Prevent employee from changing status or times directly? Only allow notes?
            if (requestingUser.roleType === Role_1.RoleType.EMPLOYEE && requestingUser.userId === ((_a = attendance.user) === null || _a === void 0 ? void 0 : _a.id)) {
                // Allow only notes update for employees?
                const allowedUpdates = {};
                if (attendanceData.notes !== undefined) {
                    allowedUpdates.notes = attendanceData.notes;
                }
                // Maybe allow correcting check-in/out within a short timeframe? (More complex)
                attendanceData = allowedUpdates; // Restrict updates
                if (Object.keys(attendanceData).length === 0)
                    return attendance; // No allowed fields to update
            }
            Object.assign(attendance, attendanceData);
            // Recalculate work hours if checkIn and checkOut times are updated
            if (attendanceData.checkInTime !== undefined || attendanceData.checkOutTime !== undefined) {
                if (attendance.checkInTime && attendance.checkOutTime) {
                    attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
                }
                else {
                    attendance.workHours = null; // Reset if one is missing
                }
            }
            // If status is manually set to leave, clear times and set workHours
            if (attendanceData.status === Attendance_1.AttendanceStatus.LEAVE) {
                attendance.checkInTime = null;
                attendance.checkOutTime = null;
                attendance.workHours = 0; // Or null
                // Link leave request if provided
                if (attendanceData.leaveRequest)
                    attendance.leaveRequest = attendanceData.leaveRequest;
            }
            else if (attendanceData.status === Attendance_1.AttendanceStatus.ABSENT) {
                attendance.checkInTime = null;
                attendance.checkOutTime = null;
                attendance.workHours = 0; // Or null
                attendance.leaveRequest = null;
            }
            else if (attendanceData.status === Attendance_1.AttendanceStatus.PRESENT) {
                // If marked present, ensure leave request is unlinked
                attendance.leaveRequest = null;
            }
            return this.attendanceRepository.save(attendance);
        });
    }
    // Delete attendance record with permission check using AuthenticatedUser
    deleteAttendance(requestingUser, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const attendance = yield this.attendanceRepository.findOne({
                where: { id },
                relations: ['user', 'user.department'] // Load relations needed for permission check
            });
            if (!attendance)
                return false; // Not found
            const canModify = yield this.checkModifyPermission(requestingUser, attendance);
            if (!canModify)
                throw new Error('Forbidden');
            const deleteResult = yield this.attendanceRepository.delete(id);
            return !!deleteResult.affected && deleteResult.affected > 0;
        });
    }
    // --- Check-in/Check-out Logic ---
    // These methods operate on a specific userId, permission is checked in controller
    getCurrentDate() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }
    getCurrentTime() {
        const now = new Date();
        // Ensure HH:MM:SS format even if seconds/minutes are single digit
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`; // HH:MM:SS
    }
    // Calculate work hours (simple example, might need refinement based on break times etc.)
    calculateWorkHours(checkIn, checkOut) {
        try {
            // Use today's date just to parse time correctly, avoid timezone issues across days
            const todayStr = this.getCurrentDate(); // Use current date for calculation context
            const checkInDateTime = new Date(`${todayStr}T${checkIn}`);
            const checkOutDateTime = new Date(`${todayStr}T${checkOut}`);
            if (isNaN(checkInDateTime.getTime()) || isNaN(checkOutDateTime.getTime()) || checkOutDateTime <= checkInDateTime) {
                console.warn(`Invalid times for work hour calculation: In: ${checkIn}, Out: ${checkOut}`);
                return null; // Invalid times or checkout before checkin
            }
            const diffMilliseconds = checkOutDateTime.getTime() - checkInDateTime.getTime();
            const diffHours = diffMilliseconds / (1000 * 60 * 60);
            // Consider rounding rules, e.g., round to nearest quarter hour?
            return parseFloat(diffHours.toFixed(2)); // Return hours with 2 decimal places
        }
        catch (e) {
            console.error("Error calculating work hours:", e);
            return null;
        }
    }
    checkIn(userId, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = this.getCurrentDate();
            const now = this.getCurrentTime();
            const user = yield this.userRepository.findOneBy({ id: userId });
            if (!user)
                throw new Error(`Không tìm thấy người dùng với ID ${userId}`);
            let attendance = yield this.attendanceRepository.findOne({ where: { user: { id: userId }, date: today } });
            if (attendance) { // Record exists for today
                if (attendance.checkInTime)
                    throw new Error('Bạn đã check-in hôm nay rồi.');
                // If record exists (e.g., from leave) but no check-in, update it
                attendance.checkInTime = now;
                // TODO: Add logic for LATE status based on expected start time
                attendance.status = Attendance_1.AttendanceStatus.PRESENT;
                attendance.notes = notes !== null && notes !== void 0 ? notes : attendance.notes; // Append or replace notes? Let's replace for now.
                attendance.leaveRequest = null; // Remove leave link if checking in
                attendance.workHours = null; // Reset work hours until checkout
            }
            else { // Create new record
                attendance = this.attendanceRepository.create({
                    user: user,
                    date: today,
                    checkInTime: now,
                    // TODO: Add logic for LATE status
                    status: Attendance_1.AttendanceStatus.PRESENT,
                    notes: notes,
                });
            }
            return this.attendanceRepository.save(attendance);
        });
    }
    checkOut(userId, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = this.getCurrentDate();
            const now = this.getCurrentTime();
            const attendance = yield this.attendanceRepository.findOne({ where: { user: { id: userId }, date: today } });
            if (!attendance)
                throw new Error('Bạn chưa check-in hôm nay.');
            if (!attendance.checkInTime)
                throw new Error('Bản ghi chấm công hôm nay không có giờ check-in. Vui lòng liên hệ HR.');
            if (attendance.checkOutTime)
                throw new Error('Bạn đã check-out hôm nay rồi.');
            attendance.checkOutTime = now;
            // TODO: Add logic for EARLY_LEAVE status based on expected end time
            attendance.notes = notes !== null && notes !== void 0 ? notes : attendance.notes; // Replace notes for now.
            // Calculate work hours
            attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
            // Update status if needed based on work hours? (e.g., if less than expected)
            return this.attendanceRepository.save(attendance);
        });
    }
    // Mark attendance as Leave - potentially called when a leave request is approved
    markAsLeave(userId, date, leaveRequestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findOneBy({ id: userId });
            if (!user)
                throw new Error(`Không tìm thấy người dùng với ID ${userId}`);
            const leaveRequest = yield this.leaveRepository.findOneBy({ id: leaveRequestId });
            if (!leaveRequest)
                throw new Error(`Không tìm thấy đơn nghỉ phép với ID ${leaveRequestId}`);
            let attendance = yield this.attendanceRepository.findOne({ where: { user: { id: userId }, date } });
            if (attendance) { // Update existing record
                attendance.status = Attendance_1.AttendanceStatus.LEAVE;
                attendance.checkInTime = null;
                attendance.checkOutTime = null;
                attendance.workHours = 0; // Or null
                attendance.leaveRequest = leaveRequest;
                attendance.notes = `Nghỉ phép - Đơn: ${leaveRequestId}`; // Overwrite notes
            }
            else { // Create new record marked as leave
                attendance = this.attendanceRepository.create({
                    user: user,
                    date: date,
                    status: Attendance_1.AttendanceStatus.LEAVE,
                    workHours: 0, // Or null
                    leaveRequest: leaveRequest,
                    notes: `Nghỉ phép - Đơn: ${leaveRequestId}`,
                });
            }
            yield this.attendanceRepository.save(attendance);
        });
    }
    // Get attendance history by day (e.g. last 7 days, 14 days, 30 days)
    getAttendanceHistoryByDay(requestingUser_1) {
        return __awaiter(this, arguments, void 0, function* (requestingUser, days = 30, userId, departmentId) {
            // Tính ngày bắt đầu dựa trên số ngày cần lấy lịch sử
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            // Sử dụng phương thức getAttendances có sẵn với phân quyền
            return this.getAttendances(requestingUser, userId, departmentId, startDateStr, endDateStr);
        });
    }
    // Get attendance history by month
    getAttendanceHistoryByMonth(requestingUser, year, month, userId, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Tính ngày đầu và cuối tháng
            // Lưu ý: month trong JavaScript bắt đầu từ 0 (0 = tháng 1)
            // Nhưng tham số đầu vào month bắt đầu từ 1 (1 = tháng 1)
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Ngày 0 của tháng tiếp theo = ngày cuối của tháng hiện tại
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            // Lấy tất cả bản ghi trong tháng, sắp xếp theo ngày
            const attendances = yield this.getAttendances(requestingUser, userId, departmentId, startDateStr, endDateStr);
            // Sắp xếp lại theo ngày để dễ hiển thị theo lịch
            return attendances.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateA - dateB;
            });
        });
    }
    // Get attendance by specific date
    getAttendanceBySpecificDate(requestingUser, date, userId, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sử dụng phương thức getAttendances có sẵn với phân quyền
            return this.getAttendances(requestingUser, userId, departmentId, date, // Sử dụng ngày cụ thể làm cả startDate và endDate
            date);
        });
    }
}
exports.AttendanceService = AttendanceService;
