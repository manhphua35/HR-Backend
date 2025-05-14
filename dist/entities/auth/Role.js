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
exports.Role = exports.RoleType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../core/User");
const RolePermission_1 = require("./RolePermission");
var RoleType;
(function (RoleType) {
    RoleType["SYSTEM_ADMIN"] = "SYSTEM_ADMIN";
    RoleType["HR_STAFF"] = "HR_STAFF";
    RoleType["DEPARTMENT_HEAD"] = "DEPARTMENT_HEAD";
    RoleType["EMPLOYEE"] = "EMPLOYEE";
})(RoleType || (exports.RoleType = RoleType = {}));
let Role = class Role {
};
exports.Role = Role;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Role.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: RoleType,
        default: RoleType.EMPLOYEE
    }),
    __metadata("design:type", String)
], Role.prototype, "roleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Role.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Role.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => User_1.User, user => user.role),
    __metadata("design:type", Array)
], Role.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => RolePermission_1.RolePermission, rp => rp.role),
    __metadata("design:type", Array)
], Role.prototype, "rolePermissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], Role.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], Role.prototype, "updatedAt", void 0);
exports.Role = Role = __decorate([
    (0, typeorm_1.Entity)("roles")
], Role);
