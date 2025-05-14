"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TrainingController_1 = require("../controllers/TrainingController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Lấy danh sách phòng ban - Tất cả user đã đăng nhập
router.get('/departments', authMiddleware_1.authenticateToken, (req, res) => TrainingController_1.trainingController.getAllDepartments(req, res));
// Quản lý khóa đào tạo - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post('/courses', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.createTrainingCourse(req, res));
router.put('/courses/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.updateTrainingCourse(req, res));
// Xóa khóa đào tạo
router.delete('/courses/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.deleteTrainingCourse(req, res));
// Lấy danh sách và chi tiết khóa đào tạo - Tất cả user đã đăng nhập
router.get('/courses', authMiddleware_1.authenticateToken, (req, res) => TrainingController_1.trainingController.getTrainingCourses(req, res));
router.get('/courses/:id', authMiddleware_1.authenticateToken, (req, res) => TrainingController_1.trainingController.getTrainingCourseDetail(req, res));
// Đăng ký tham gia - HR_STAFF và DEPARTMENT_HEAD có quyền đăng ký cho nhân viên
router.post('/register', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.registerParticipant(req, res));
// Ghi nhận kết quả - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post('/results', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.recordTrainingResult(req, res));
// Đánh giá năng lực - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post('/competency', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.assessCompetency(req, res));
// Gửi thông báo đào tạo - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post('/notify/:courseId', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF, Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => TrainingController_1.trainingController.sendTrainingNotification(req, res));
// Xuất báo cáo năng lực - HR_STAFF, DEPARTMENT_HEAD và chủ sở hữu
router.get('/report/:userId', authMiddleware_1.authenticateToken, (req, res) => TrainingController_1.trainingController.exportCompetencyReport(req, res));
exports.default = router;
