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
exports.DepartmentReport = void 0;
const typeorm_1 = require("typeorm");
const Department_1 = require("../core/Department");
let DepartmentReport = class DepartmentReport {
};
exports.DepartmentReport = DepartmentReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "department_id" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department),
    (0, typeorm_1.JoinColumn)({ name: "department_id" }),
    __metadata("design:type", Department_1.Department)
], DepartmentReport.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "report_date", type: "date" }),
    __metadata("design:type", Date)
], DepartmentReport.prototype, "reportDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_employees" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalEmployees", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "new_employees" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "newEmployees", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "resigned_employees" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "resignedEmployees", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_leaves" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalLeaves", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_training_hours" }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalTrainingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_allowances", type: "decimal", precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalAllowances", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_deductions", type: "decimal", precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "totalDeductions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "performance_rating", type: "decimal", precision: 3, scale: 2 }),
    __metadata("design:type", Number)
], DepartmentReport.prototype, "averagePerformanceRating", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "generated_at" }),
    __metadata("design:type", Date)
], DepartmentReport.prototype, "generatedAt", void 0);
exports.DepartmentReport = DepartmentReport = __decorate([
    (0, typeorm_1.Entity)("department_reports")
], DepartmentReport);
