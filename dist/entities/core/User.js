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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const Department_1 = require("./Department");
const Position_1 = require("./Position");
const Role_1 = require("../auth/Role");
const Leave_1 = require("../leave/Leave");
const Payroll_1 = require("../payroll/Payroll");
const PerformanceReview_1 = require("../performance/PerformanceReview");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "password_hash", length: 255 }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "full_name", length: 100, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "department_id", nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "position_id", nullable: true }),
    __metadata("design:type", String)
], User.prototype, "positionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "role_id" }),
    __metadata("design:type", Number)
], User.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hire_date", type: "date" }),
    __metadata("design:type", Date)
], User.prototype, "hireDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "resignation_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "resignationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "remaining_leaves", default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "remainingLeaves", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "base_salary", type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "baseSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_active", default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department),
    (0, typeorm_1.JoinColumn)({ name: "department_id" }),
    __metadata("design:type", Department_1.Department)
], User.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Position_1.Position),
    (0, typeorm_1.JoinColumn)({ name: "position_id" }),
    __metadata("design:type", Position_1.Position)
], User.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_1.Role),
    (0, typeorm_1.JoinColumn)({ name: "role_id" }),
    __metadata("design:type", Role_1.Role)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Leave_1.Leave, leave => leave.user),
    __metadata("design:type", Array)
], User.prototype, "leaves", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PerformanceReview_1.PerformanceReview, review => review.employee),
    __metadata("design:type", Array)
], User.prototype, "performanceReviews", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PerformanceReview_1.PerformanceReview, review => review.reviewer),
    __metadata("design:type", Array)
], User.prototype, "reviewedPerformances", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Payroll_1.Payroll, payroll => payroll.user),
    __metadata("design:type", Array)
], User.prototype, "payrolls", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("users")
], User);
