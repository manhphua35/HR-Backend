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
exports.trainingController = void 0;
const TrainingService_1 = require("../services/TrainingService");
const DepartmentService_1 = require("../services/DepartmentService");
class TrainingController {
    constructor() { }
    static getInstance() {
        if (!TrainingController.instance) {
            TrainingController.instance = new TrainingController();
        }
        return TrainingController.instance;
    }
    // Lấy danh sách phòng ban
    getAllDepartments(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const departments = yield DepartmentService_1.departmentService.getAllDepartments();
                res.status(200).json({
                    success: true,
                    data: departments
                });
            }
            catch (error) {
                console.error('Error getting departments:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    // Tạo khóa đào tạo mới
    createTrainingCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const courseData = req.body;
                const result = yield TrainingService_1.trainingService.createTrainingCourse(courseData);
                res.status(201).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Cập nhật khóa đào tạo
    updateTrainingCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const courseData = req.body;
                const result = yield TrainingService_1.trainingService.updateTrainingCourse(parseInt(id), courseData);
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Lấy danh sách khóa đào tạo
    getTrainingCourses(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status, departmentId } = req.query;
                const result = yield TrainingService_1.trainingService.getTrainingCourses(status, departmentId ? parseInt(departmentId) : undefined);
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Lấy chi tiết khóa đào tạo
    getTrainingCourseDetail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield TrainingService_1.trainingService.getTrainingCourseDetail(parseInt(id));
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Đăng ký tham gia khóa đào tạo
    registerParticipant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { courseId, userId } = req.body;
                const result = yield TrainingService_1.trainingService.registerParticipant(courseId, userId);
                res.status(201).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Ghi nhận kết quả đào tạo
    recordTrainingResult(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { courseId } = _a, resultData = __rest(_a, ["courseId"]);
                const result = yield TrainingService_1.trainingService.recordTrainingResult(courseId, resultData);
                res.status(201).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Đánh giá năng lực
    assessCompetency(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { courseId, assessorId } = _a, assessmentData = __rest(_a, ["courseId", "assessorId"]);
                const result = yield TrainingService_1.trainingService.assessCompetency(courseId, assessorId, assessmentData);
                res.status(201).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Gửi thông báo đào tạo
    sendTrainingNotification(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { courseId } = req.params;
                yield TrainingService_1.trainingService.sendTrainingNotification(parseInt(courseId));
                res.status(200).json({
                    success: true,
                    message: 'Notification sent successfully'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Xuất báo cáo năng lực
    exportCompetencyReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const report = yield TrainingService_1.trainingService.exportCompetencyReport(parseInt(userId));
                res.status(200).json({
                    success: true,
                    data: report
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Xóa khóa đào tạo
    deleteTrainingCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield TrainingService_1.trainingService.deleteTrainingCourse(parseInt(id));
                res.status(200).json({
                    success: true,
                    message: 'Training course deleted successfully'
                });
            }
            catch (error) {
                if (error.message === 'Training course not found') {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Error deleting training course: ' + error.message
                    });
                }
            }
        });
    }
}
exports.trainingController = TrainingController.getInstance();
