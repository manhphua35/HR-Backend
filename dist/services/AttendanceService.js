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
exports.AttendanceService = void 0;
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
    getAttendances(requestingUser, userId, departmentId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Xây dựng câu query chung
                const queryBuilder = this.attendanceRepository
                    .createQueryBuilder('attendance')
                    .leftJoinAndSelect('attendance.user', 'user')
                    .leftJoinAndSelect('user.department', 'department')
                    .leftJoinAndSelect('attendance.leaveRequest', 'leaveRequest');
                // Điều kiện lọc theo userId, nếu được chỉ định
                if (userId) {
                    queryBuilder.andWhere('user.id = :userId', { userId: parseInt(userId, 10) });
                }
                // Điều kiện lọc theo departmentId, nếu được chỉ định
                else if (departmentId) {
                    queryBuilder.andWhere('user.departmentId = :departmentId', { departmentId: parseInt(departmentId, 10) });
                }
                // Nếu không có userId hoặc departmentId, áp dụng phân quyền
                else {
                    // Người dùng có vai trò EMPLOYEE chỉ xem dữ liệu của chính mình
                    if (requestingUser.roleType === Role_1.RoleType.EMPLOYEE) {
                        queryBuilder.andWhere('user.id = :userId', { userId: requestingUser.userId });
                    }
                    // Người dùng là DEPARTMENT_HEAD chỉ xem dữ liệu của phòng ban mình
                    else if (requestingUser.roleType === Role_1.RoleType.DEPARTMENT_HEAD && requestingUser.departmentId) {
                        queryBuilder.andWhere('user.departmentId = :departmentId', { departmentId: requestingUser.departmentId });
                    }
                    // HR_STAFF và SYSTEM_ADMIN có thể xem tất cả dữ liệu
                }
                // Lọc theo thời gian nếu có
                if (startDate) {
                    queryBuilder.andWhere('attendance.date >= :startDate', { startDate });
                }
                if (endDate) {
                    queryBuilder.andWhere('attendance.date <= :endDate', { endDate });
                }
                // Thực hiện truy vấn và trả về kết quả
                return yield queryBuilder
                    .orderBy('attendance.date', 'DESC')
                    .addOrderBy('user.fullName', 'ASC')
                    .getMany();
            }
            catch (error) {
                console.error('Error in getAttendances:', error);
                throw error;
            }
        });
    }
    // Get single attendance by ID with permission check using AuthenticatedUser
    getAttendanceById(requestingUser, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const attendance = yield this.attendanceRepository.findOne({
                    where: { id },
                    relations: ['user', 'user.department', 'leaveRequest']
                });
                if (!attendance)
                    return null;
                // Kiểm tra quyền truy cập
                // Nếu là EMPLOYEE, chỉ cho phép xem dữ liệu của bản thân
                if (requestingUser.roleType === Role_1.RoleType.EMPLOYEE && attendance.user.id !== requestingUser.userId) {
                    throw new Error('Forbidden');
                }
                // Nếu là DEPARTMENT_HEAD, chỉ cho phép xem dữ liệu của phòng ban mình
                if (requestingUser.roleType === Role_1.RoleType.DEPARTMENT_HEAD &&
                    attendance.user.departmentId !== requestingUser.departmentId) {
                    throw new Error('Forbidden');
                }
                return attendance;
            }
            catch (error) {
                console.error(`Error in getAttendanceById: ${error}`);
                throw error;
            }
        });
    }
    // Create or Update Attendance Record (e.g., for manual entry or corrections by HR/Admin)
    // This method might not need requestingUser if permissions are checked in controller or a dedicated method
    createOrUpdateAttendance(attendanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tạo đối tượng Attendance mới hoặc cập nhật
                const attendance = new Attendance_1.Attendance();
                // Gán các giá trị từ dữ liệu gửi lên
                if (attendanceData.userId) {
                    const user = yield this.userRepository.findOneBy({ id: parseInt(attendanceData.userId, 10) });
                    if (!user) {
                        throw new Error('User not found');
                    }
                    attendance.user = user;
                }
                // Kiểm tra và gán các giá trị với kiểu dữ liệu phù hợp
                if (attendanceData.date) {
                    attendance.date = attendanceData.date;
                }
                else {
                    throw new Error('Date is required');
                }
                attendance.checkInTime = attendanceData.checkInTime || null;
                attendance.checkOutTime = attendanceData.checkOutTime || null;
                if (attendanceData.status) {
                    attendance.status = attendanceData.status;
                }
                else {
                    attendance.status = Attendance_1.AttendanceStatus.ABSENT; // Giá trị mặc định
                }
                attendance.notes = attendanceData.notes || null;
                // Tính toán số giờ làm việc nếu có check-in và check-out
                if (attendance.checkInTime && attendance.checkOutTime) {
                    attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
                }
                // Lưu vào database
                return yield this.attendanceRepository.save(attendance);
            }
            catch (error) {
                console.error('Error in createOrUpdateAttendance:', error);
                throw error;
            }
        });
    }
    // Update an existing attendance record with permission check using AuthenticatedUser
    updateAttendance(requestingUser, id, attendanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tìm bản ghi chấm công cần cập nhật
                const attendance = yield this.attendanceRepository.findOne({
                    where: { id },
                    relations: ['user', 'user.department']
                });
                if (!attendance)
                    return null;
                // Kiểm tra quyền truy cập/cập nhật
                if (requestingUser.roleType === Role_1.RoleType.EMPLOYEE) {
                    // Nhân viên chỉ được cập nhật bản ghi của mình và chỉ được sửa ghi chú
                    if (attendance.user.id !== requestingUser.userId) {
                        throw new Error('Forbidden');
                    }
                    // Nhân viên chỉ được phép cập nhật ghi chú
                    if (Object.keys(attendanceData).some(key => key !== 'notes')) {
                        throw new Error('Forbidden: Employees can only update notes');
                    }
                    // Gán ghi chú với kiểm tra null
                    attendance.notes = attendanceData.notes || null;
                }
                else if (requestingUser.roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                    // Trưởng phòng chỉ được cập nhật bản ghi của nhân viên trong phòng
                    if (attendance.user.departmentId !== requestingUser.departmentId) {
                        throw new Error('Forbidden');
                    }
                    // Cập nhật các trường được phép
                    if (attendanceData.checkInTime !== undefined)
                        attendance.checkInTime = attendanceData.checkInTime || null;
                    if (attendanceData.checkOutTime !== undefined)
                        attendance.checkOutTime = attendanceData.checkOutTime || null;
                    if (attendanceData.status !== undefined)
                        attendance.status = attendanceData.status;
                    if (attendanceData.notes !== undefined)
                        attendance.notes = attendanceData.notes || null;
                    // Tính lại giờ làm việc nếu có cả check-in và check-out
                    if (attendance.checkInTime && attendance.checkOutTime) {
                        attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
                    }
                }
                else {
                    // Admin và HR có toàn quyền cập nhật
                    if (attendanceData.checkInTime !== undefined)
                        attendance.checkInTime = attendanceData.checkInTime || null;
                    if (attendanceData.checkOutTime !== undefined)
                        attendance.checkOutTime = attendanceData.checkOutTime || null;
                    if (attendanceData.status !== undefined)
                        attendance.status = attendanceData.status;
                    if (attendanceData.notes !== undefined)
                        attendance.notes = attendanceData.notes || null;
                    if (attendanceData.date !== undefined)
                        attendance.date = attendanceData.date;
                    // Tính lại giờ làm việc nếu có cả check-in và check-out
                    if (attendance.checkInTime && attendance.checkOutTime) {
                        attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
                    }
                }
                // Lưu vào database
                return yield this.attendanceRepository.save(attendance);
            }
            catch (error) {
                console.error(`Error in updateAttendance: ${error}`);
                throw error;
            }
        });
    }
    // Delete attendance record with permission check using AuthenticatedUser
    deleteAttendance(requestingUser, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tìm bản ghi chấm công cần xóa
                const attendance = yield this.attendanceRepository.findOne({
                    where: { id },
                    relations: ['user', 'user.department']
                });
                if (!attendance)
                    return false;
                // Kiểm tra quyền truy cập/xóa
                if (requestingUser.roleType === Role_1.RoleType.EMPLOYEE) {
                    // Nhân viên không được xóa bản ghi chấm công
                    throw new Error('Forbidden');
                }
                else if (requestingUser.roleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                    // Trưởng phòng chỉ được xóa bản ghi của nhân viên trong phòng
                    if (attendance.user.departmentId !== requestingUser.departmentId) {
                        throw new Error('Forbidden');
                    }
                }
                // Admin và HR có thể xóa bất kỳ bản ghi nào
                // Thực hiện xóa
                yield this.attendanceRepository.remove(attendance);
                return true;
            }
            catch (error) {
                console.error(`Error in deleteAttendance: ${error}`);
                throw error;
            }
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
    markAsLeave(userId, date, leaveId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findOneBy({ id: userId });
            if (!user)
                throw new Error(`Không tìm thấy người dùng với ID ${userId}`);
            const leaveRequest = yield this.leaveRepository.findOneBy({ id: leaveId });
            if (!leaveRequest)
                throw new Error(`Không tìm thấy đơn nghỉ phép với ID ${leaveId}`);
            let attendance = yield this.attendanceRepository.findOne({ where: { user: { id: userId }, date } });
            if (attendance) { // Update existing record
                attendance.status = Attendance_1.AttendanceStatus.LEAVE;
                attendance.checkInTime = null;
                attendance.checkOutTime = null;
                attendance.workHours = 0; // Or null
                // Lưu tham chiếu đến đối tượng Leave 
                attendance.leaveRequest = leaveRequest;
                attendance.notes = `Nghỉ phép - Đơn: ${leaveId}`; // Overwrite notes
            }
            else { // Create new record marked as leave
                attendance = this.attendanceRepository.create({
                    user: user,
                    date: date,
                    status: Attendance_1.AttendanceStatus.LEAVE,
                    workHours: 0, // Or null
                    leaveRequest: leaveRequest,
                    notes: `Nghỉ phép - Đơn: ${leaveId}`,
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
