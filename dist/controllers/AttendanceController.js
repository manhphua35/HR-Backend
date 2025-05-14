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
exports.AttendanceController = void 0;
const data_source_1 = require("../config/data-source");
const Attendance_1 = require("../entities/attendance/Attendance");
const User_1 = require("../entities/core/User"); // Vẫn cần User repo
const AttendanceService_1 = require("../services/AttendanceService");
const Role_1 = require("../entities/auth/Role"); // Import RoleType
class AttendanceController {
    constructor() {
        // Khởi tạo service với repository tương ứng
        this.attendanceService = new AttendanceService_1.AttendanceService(data_source_1.AppDataSource.getRepository(Attendance_1.Attendance), data_source_1.AppDataSource.getRepository(User_1.User) // Truyền User repository vào service
        );
    }
    // Lấy danh sách chấm công (có phân quyền)
    getAttendances(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lấy thông tin user từ request (đã được thêm vào bởi authMiddleware)
                const requestingUser = req.user; // Sử dụng kiểu đã định nghĩa
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { userId, departmentId, startDate, endDate } = req.query; // Thêm các query params để lọc
                const attendances = yield this.attendanceService.getAttendances(requestingUser, // Truyền thông tin user đã xác thực
                userId, departmentId, startDate, endDate);
                res.status(200).json(attendances);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi lấy dữ liệu chấm công', error: error.message });
            }
        });
    }
    // Lấy chi tiết chấm công theo ID
    getAttendanceById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { id } = req.params;
                const attendance = yield this.attendanceService.getAttendanceById(requestingUser, id);
                if (attendance) {
                    res.status(200).json(attendance);
                }
                else {
                    res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công' });
                }
            }
            catch (error) {
                if (error.message === 'Forbidden') {
                    res.status(403).json({ message: 'Bạn không có quyền xem bản ghi này' });
                }
                else {
                    res.status(500).json({ message: 'Lỗi khi lấy chi tiết chấm công', error: error.message });
                }
            }
        });
    }
    // Tạo bản ghi chấm công mới (ví dụ: check-in)
    createAttendance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const attendanceData = req.body;
                // Gán user ID vào dữ liệu chấm công nếu chưa có
                if (!attendanceData.userId) {
                    attendanceData.userId = requestingUser.userId.toString(); // userId trong body thường là string
                }
                else {
                    // Kiểm tra quyền nếu chấm công cho người khác
                    const targetUserId = parseInt(attendanceData.userId, 10);
                    if (isNaN(targetUserId)) {
                        res.status(400).json({ message: 'User ID không hợp lệ.' });
                        return;
                    }
                    if (targetUserId !== requestingUser.userId &&
                        ![Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF].includes(requestingUser.roleType)) { // Sử dụng RoleType đã import
                        // Chỉ Admin/HR mới được chấm công cho người khác
                        res.status(403).json({ message: 'Bạn không có quyền chấm công cho người dùng này' });
                        return;
                    }
                }
                const newAttendance = yield this.attendanceService.createOrUpdateAttendance(attendanceData);
                res.status(201).json(newAttendance);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi tạo bản ghi chấm công', error: error.message });
            }
        });
    }
    // Cập nhật bản ghi chấm công (ví dụ: check-out, sửa đổi)
    updateAttendance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { id } = req.params;
                const attendanceData = req.body;
                // Truyền requestingUser vào service để kiểm tra quyền
                const updatedAttendance = yield this.attendanceService.updateAttendance(requestingUser, id, attendanceData);
                if (updatedAttendance) {
                    res.status(200).json(updatedAttendance);
                }
                else {
                    res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền cập nhật bản ghi chấm công' });
                }
            }
            catch (error) {
                if (error.message === 'Forbidden') {
                    res.status(403).json({ message: 'Bạn không có quyền cập nhật bản ghi này' });
                }
                else {
                    res.status(500).json({ message: 'Lỗi khi cập nhật bản ghi chấm công', error: error.message });
                }
            }
        });
    }
    // Xóa bản ghi chấm công (thường ít dùng, nên cân nhắc)
    deleteAttendance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { id } = req.params;
                // Truyền requestingUser vào service để kiểm tra quyền
                const success = yield this.attendanceService.deleteAttendance(requestingUser, id);
                if (success) {
                    res.status(204).send(); // No Content
                }
                else {
                    res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền xóa bản ghi chấm công' });
                }
            }
            catch (error) {
                if (error.message === 'Forbidden') {
                    res.status(403).json({ message: 'Bạn không có quyền xóa bản ghi này' });
                }
                else {
                    res.status(500).json({ message: 'Lỗi khi xóa bản ghi chấm công', error: error.message });
                }
            }
        });
    }
    // Endpoint riêng cho check-in
    checkIn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { notes } = req.body;
                // Sử dụng userId từ user đã xác thực
                const result = yield this.attendanceService.checkIn(requestingUser.userId, notes);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi check-in', error: error.message });
            }
        });
    }
    // Endpoint riêng cho check-out
    checkOut(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { notes } = req.body;
                // Sử dụng userId từ user đã xác thực
                const result = yield this.attendanceService.checkOut(requestingUser.userId, notes);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi check-out', error: error.message });
            }
        });
    }
    // Endpoint cho lịch sử chấm công theo ngày (mặc định 30 ngày gần nhất)
    getAttendanceHistoryByDay(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { days, userId, departmentId } = req.query;
                // Chuyển đổi days từ string sang number, mặc định là 30 ngày
                const daysNum = days ? parseInt(days, 10) : 30;
                if (isNaN(daysNum) || daysNum <= 0) {
                    res.status(400).json({ message: 'Tham số days không hợp lệ. Phải là số nguyên dương.' });
                    return;
                }
                const attendances = yield this.attendanceService.getAttendanceHistoryByDay(requestingUser, daysNum, userId, departmentId);
                res.status(200).json(attendances);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi lấy lịch sử chấm công theo ngày', error: error.message });
            }
        });
    }
    // Endpoint cho lịch sử chấm công theo tháng
    getAttendanceHistoryByMonth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { year, month, userId, departmentId } = req.query;
                // Kiểm tra và chuyển đổi tham số
                if (!year || !month) {
                    res.status(400).json({ message: 'Thiếu tham số year hoặc month.' });
                    return;
                }
                const yearNum = parseInt(year, 10);
                const monthNum = parseInt(month, 10);
                if (isNaN(yearNum) || isNaN(monthNum) ||
                    monthNum < 1 || monthNum > 12 ||
                    yearNum < 2000 || yearNum > 2100) {
                    res.status(400).json({ message: 'Tham số year hoặc month không hợp lệ.' });
                    return;
                }
                const attendances = yield this.attendanceService.getAttendanceHistoryByMonth(requestingUser, yearNum, monthNum, userId, departmentId);
                res.status(200).json(attendances);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi lấy lịch sử chấm công theo tháng', error: error.message });
            }
        });
    }
    // Endpoint cho lấy dữ liệu chấm công theo ngày cụ thể
    getAttendanceBySpecificDate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ message: 'Yêu cầu xác thực.' });
                    return;
                }
                const { date, userId, departmentId } = req.query;
                // Kiểm tra ngày
                if (!date) {
                    res.status(400).json({ message: 'Ngày không được để trống.' });
                    return;
                }
                // Kiểm tra định dạng ngày (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(date)) {
                    res.status(400).json({ message: 'Định dạng ngày không hợp lệ. Phải là YYYY-MM-DD.' });
                    return;
                }
                const attendances = yield this.attendanceService.getAttendanceBySpecificDate(requestingUser, date, userId, departmentId);
                res.status(200).json(attendances);
            }
            catch (error) {
                res.status(500).json({ message: 'Lỗi khi lấy dữ liệu chấm công theo ngày', error: error.message });
            }
        });
    }
}
exports.AttendanceController = AttendanceController;
