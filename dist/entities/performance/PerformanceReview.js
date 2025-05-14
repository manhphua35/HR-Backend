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
exports.PerformanceReview = exports.ReviewStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../core/User");
const PerformancePlan_1 = require("./PerformancePlan");
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["DRAFT"] = "DRAFT";
    ReviewStatus["SUBMITTED"] = "SUBMITTED";
    ReviewStatus["APPROVED"] = "APPROVED";
    ReviewStatus["REJECTED"] = "REJECTED";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
let PerformanceReview = class PerformanceReview {
};
exports.PerformanceReview = PerformanceReview;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PerformanceReview.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "plan_id" }),
    __metadata("design:type", Number)
], PerformanceReview.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "employee_id" }),
    __metadata("design:type", Number)
], PerformanceReview.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "reviewer_id" }),
    __metadata("design:type", Number)
], PerformanceReview.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ReviewStatus,
        default: ReviewStatus.DRAFT
    }),
    __metadata("design:type", String)
], PerformanceReview.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json" }),
    __metadata("design:type", Array)
], PerformanceReview.prototype, "scores", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 4, scale: 2 }),
    __metadata("design:type", Number)
], PerformanceReview.prototype, "totalScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PerformanceReview.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PerformanceReview.prototype, "improvement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PerformanceReview.prototype, "strengths", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], PerformanceReview.prototype, "weaknesses", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "review_date", type: "date" }),
    __metadata("design:type", Date)
], PerformanceReview.prototype, "reviewDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], PerformanceReview.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], PerformanceReview.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PerformancePlan_1.PerformancePlan),
    (0, typeorm_1.JoinColumn)({ name: "plan_id" }),
    __metadata("design:type", PerformancePlan_1.PerformancePlan)
], PerformanceReview.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "employee_id" }),
    __metadata("design:type", User_1.User)
], PerformanceReview.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "reviewer_id" }),
    __metadata("design:type", User_1.User)
], PerformanceReview.prototype, "reviewer", void 0);
exports.PerformanceReview = PerformanceReview = __decorate([
    (0, typeorm_1.Entity)("performance_reviews")
], PerformanceReview);
