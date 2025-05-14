"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AttendanceController_1 = require("../controllers/AttendanceController");
const authMiddleware_1 = require("../middlewares/authMiddleware"); // Import middleware xác thực
const router = (0, express_1.Router)();
const attendanceController = new AttendanceController_1.AttendanceController();
// Áp dụng authenticateToken cho tất cả các route chấm công
router.use(authMiddleware_1.authenticateToken);
// --- Các Route CRUD cơ bản ---
// GET /api/attendances - Lấy danh sách chấm công (có phân quyền trong service)
// Query params: userId, departmentId, startDate, endDate
router.get('/', attendanceController.getAttendances.bind(attendanceController));
// --- API lịch sử chấm công mới ---
// Đặt trước route '/:id' để tránh bị bắt nhầm
// GET /api/attendances/history/day - Lấy lịch sử chấm công theo ngày (30 ngày gần nhất hoặc theo thông số)
// Query params: days (số ngày), userId, departmentId
router.get('/history/day', attendanceController.getAttendanceHistoryByDay.bind(attendanceController));
// GET /api/attendances/history/month - Lấy lịch sử chấm công theo tháng
// Query params: year, month, userId, departmentId
router.get('/history/month', attendanceController.getAttendanceHistoryByMonth.bind(attendanceController));
// GET /api/attendances/by-date - Lấy dữ liệu chấm công theo ngày cụ thể
// Query params: date (YYYY-MM-DD), userId, departmentId
router.get('/by-date', attendanceController.getAttendanceBySpecificDate.bind(attendanceController));
// GET /api/attendances/:id - Lấy chi tiết chấm công theo ID (có phân quyền trong service)
router.get('/:id', attendanceController.getAttendanceById.bind(attendanceController));
// POST /api/attendances - Tạo bản ghi chấm công mới (ví dụ: HR/Admin nhập tay)
// Chỉ Admin/HR mới được phép (Cần thêm kiểm tra quyền trong controller/service nếu logic phức tạp)
router.post('/', attendanceController.createAttendance.bind(attendanceController));
// PUT /api/attendances/:id - Cập nhật bản ghi chấm công (ví dụ: HR/Admin sửa)
// Chỉ Admin/HR hoặc người dùng tự sửa ghi chú của mình (Cần phân quyền trong service)
router.put('/:id', attendanceController.updateAttendance.bind(attendanceController));
// DELETE /api/attendances/:id - Xóa bản ghi chấm công (Cẩn thận khi sử dụng)
// Chỉ Admin/HR (Cần phân quyền trong service)
router.delete('/:id', attendanceController.deleteAttendance.bind(attendanceController));
// --- Các Route Check-in/Check-out tiện lợi ---
// POST /api/attendances/check-in - Nhân viên tự check-in
router.post('/check-in', attendanceController.checkIn.bind(attendanceController));
// POST /api/attendances/check-out - Nhân viên tự check-out
router.post('/check-out', attendanceController.checkOut.bind(attendanceController));
exports.default = router;
