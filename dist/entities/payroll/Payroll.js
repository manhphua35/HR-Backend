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
exports.Payroll = exports.ComponentType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../core/User");
var ComponentType;
(function (ComponentType) {
    ComponentType["ALLOWANCE"] = "ALLOWANCE";
    ComponentType["DEDUCTION"] = "DEDUCTION";
    ComponentType["BENEFIT"] = "BENEFIT"; // Phúc lợi
})(ComponentType || (exports.ComponentType = ComponentType = {}));
let Payroll = class Payroll {
};
exports.Payroll = Payroll;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Payroll.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], Payroll.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "user_id" }),
    __metadata("design:type", Number)
], Payroll.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Payroll.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Payroll.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "base_salary", type: "decimal", precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "baseSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_allowance", type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "totalAllowance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_deduction", type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "totalDeduction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_benefit", type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "totalBenefit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "leave_deduction_amount", type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "leaveDeductionAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "late_penalty_amount", type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "latePenaltyAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "bonus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "tax", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "net_salary", type: "decimal", precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Payroll.prototype, "netSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "payment_date", type: "date", nullable: true }),
    __metadata("design:type", Date)
], Payroll.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Payroll.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_finalized", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Payroll.prototype, "isFinalized", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "update_history", type: "json", nullable: true }),
    __metadata("design:type", Array)
], Payroll.prototype, "updateHistory", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], Payroll.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], Payroll.prototype, "updatedAt", void 0);
exports.Payroll = Payroll = __decorate([
    (0, typeorm_1.Entity)("payrolls")
], Payroll);
