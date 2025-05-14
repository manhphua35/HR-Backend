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
exports.trainingService = void 0;
const data_source_1 = require("../config/data-source");
const TrainingCourse_1 = require("../entities/training/TrainingCourse");
const User_1 = require("../entities/core/User");
class TrainingService {
    constructor() {
        this.courseRepo = data_source_1.AppDataSource.getRepository(TrainingCourse_1.TrainingCourse);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    static getInstance() {
        if (!TrainingService.instance) {
            TrainingService.instance = new TrainingService();
        }
        return TrainingService.instance;
    }
    // Tạo khóa đào tạo mới
    createTrainingCourse(courseData) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = this.courseRepo.create(courseData);
            return yield this.courseRepo.save(course);
        });
    }
    // Cập nhật khóa đào tạo
    updateTrainingCourse(id, courseData) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.courseRepo.update(id, courseData);
            const course = yield this.courseRepo.findOneBy({ id });
            if (!course) {
                throw new Error('Training course not found');
            }
            return course;
        });
    }
    // Lấy danh sách khóa đào tạo
    getTrainingCourses(status, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.courseRepo.createQueryBuilder('course')
                .leftJoinAndSelect('course.department', 'department');
            if (status) {
                query.andWhere('course.status = :status', { status });
            }
            if (departmentId) {
                query.andWhere('(course.departmentId = :departmentId OR course.departmentId IS NULL)', { departmentId });
            }
            return yield query.getMany();
        });
    }
    // Lấy chi tiết khóa đào tạo
    getTrainingCourseDetail(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOne({
                where: { id },
                relations: ['department', 'user', 'assessor']
            });
            if (!course) {
                throw new Error('Training course not found');
            }
            return course;
        });
    }
    // Đăng ký tham gia khóa đào tạo
    registerParticipant(courseId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOneBy({ id: courseId });
            if (!course) {
                throw new Error('Training course not found');
            }
            const user = yield this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error('User not found');
            }
            course.userId = userId;
            course.participantStatus = TrainingCourse_1.ParticipantStatus.REGISTERED;
            course.registrationDate = new Date();
            return yield this.courseRepo.save(course);
        });
    }
    // Ghi nhận kết quả đào tạo
    recordTrainingResult(courseId, resultData) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOneBy({ id: courseId });
            if (!course) {
                throw new Error('Training course not found');
            }
            Object.assign(course, resultData);
            course.completionDate = new Date();
            return yield this.courseRepo.save(course);
        });
    }
    // Đánh giá năng lực
    assessCompetency(courseId, assessorId, assessmentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOneBy({ id: courseId });
            if (!course) {
                throw new Error('Training course not found');
            }
            const assessor = yield this.userRepo.findOneBy({ id: assessorId });
            if (!assessor) {
                throw new Error('Assessor not found');
            }
            Object.assign(course, assessmentData);
            course.assessorId = assessorId;
            course.assessmentDate = new Date();
            return yield this.courseRepo.save(course);
        });
    }
    // Xóa khóa đào tạo
    deleteTrainingCourse(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOneBy({ id });
            if (!course) {
                throw new Error('Training course not found');
            }
            // TODO: Consider implications:
            // 1. What happens to participants if a course is deleted?
            // 2. Should there be a soft delete mechanism instead?
            // For now, performing a hard delete.
            yield this.courseRepo.remove(course);
        });
    }
    // Gửi thông báo đào tạo
    sendTrainingNotification(courseId) {
        return __awaiter(this, void 0, void 0, function* () {
            const course = yield this.courseRepo.findOne({
                where: { id: courseId },
                relations: ['user', 'department']
            });
            if (!course) {
                throw new Error('Course not found');
            }
            // TODO: Implement email notification logic
            // This would typically integrate with an email service
        });
    }
    // Xuất báo cáo năng lực
    exportCompetencyReport(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.courseRepo.find({
                where: { userId },
                relations: ['department', 'assessor'],
                order: { assessmentDate: 'DESC' }
            });
        });
    }
}
exports.trainingService = TrainingService.getInstance();
