"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingCourse = exports.CompetencyLevel = exports.ParticipantStatus = exports.TrainingStatus = void 0;
const typeorm_1 = require("typeorm");
const Department_1 = require("../core/Department");
const User_1 = require("../core/User");
var TrainingStatus;
(function (TrainingStatus) {
    TrainingStatus["PLANNED"] = "PLANNED";
    TrainingStatus["ONGOING"] = "ONGOING";
    TrainingStatus["COMPLETED"] = "COMPLETED";
    TrainingStatus["CANCELLED"] = "CANCELLED";
})(TrainingStatus || (exports.TrainingStatus = TrainingStatus = {}));
var ParticipantStatus;
(function (ParticipantStatus) {
    ParticipantStatus["REGISTERED"] = "REGISTERED";
    ParticipantStatus["CONFIRMED"] = "CONFIRMED";
    ParticipantStatus["ATTENDED"] = "ATTENDED";
    ParticipantStatus["CANCELLED"] = "CANCELLED";
})(ParticipantStatus || (exports.ParticipantStatus = ParticipantStatus = {}));
var CompetencyLevel;
(function (CompetencyLevel) {
    CompetencyLevel["BEGINNER"] = "BEGINNER";
    CompetencyLevel["INTERMEDIATE"] = "INTERMEDIATE";
    CompetencyLevel["ADVANCED"] = "ADVANCED";
    CompetencyLevel["EXPERT"] = "EXPERT";
})(CompetencyLevel || (exports.CompetencyLevel = CompetencyLevel = {}));
let TrainingCourse = class TrainingCourse {
};
exports.TrainingCourse = TrainingCourse;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "start_date", type: "date" }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "end_date", type: "date" }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: TrainingStatus, default: TrainingStatus.PLANNED }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "instructor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "department_id", nullable: true }),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department),
    (0, typeorm_1.JoinColumn)({ name: "department_id" }),
    __metadata("design:type", Department_1.Department)
], TrainingCourse.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "participant_status", type: "enum", enum: ParticipantStatus, default: ParticipantStatus.REGISTERED }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "participantStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "registration_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "registrationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "participant_notes", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "participantNotes", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "evaluation", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "evaluation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "completion_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "completionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "feedback", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "feedback", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "skills_gained", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "skillsGained", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "improvement_areas", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "improvementAreas", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "certificate_issued", default: false }),
    __metadata("design:type", Boolean)
], TrainingCourse.prototype, "certificateIssued", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "certificate_number", length: 50, nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "certificateNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "competency_level", type: "enum", enum: CompetencyLevel, default: CompetencyLevel.BEGINNER }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "competencyLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "assessment_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "assessmentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "skills_demonstrated", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "skillsDemonstrated", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "performance_indicators", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "performanceIndicators", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "recommendations", type: "text", nullable: true }),
    __metadata("design:type", String)
], TrainingCourse.prototype, "recommendations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "next_assessment_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "nextAssessmentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "user_id", nullable: true }),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], TrainingCourse.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "assessor_id", nullable: true }),
    __metadata("design:type", Number)
], TrainingCourse.prototype, "assessorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "assessor_id" }),
    __metadata("design:type", User_1.User)
], TrainingCourse.prototype, "assessor", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], TrainingCourse.prototype, "updatedAt", void 0);
exports.TrainingCourse = TrainingCourse = __decorate([
    (0, typeorm_1.Entity)("training_courses")
], TrainingCourse);
