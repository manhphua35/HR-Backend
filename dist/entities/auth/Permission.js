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
exports.Permission = exports.PermissionType = void 0;
const typeorm_1 = require("typeorm");
const Role_1 = require("./Role");
var PermissionType;
(function (PermissionType) {
    // User Management
    PermissionType["VIEW_USERS"] = "VIEW_USERS";
    PermissionType["CREATE_USER"] = "CREATE_USER";
    PermissionType["UPDATE_USER"] = "UPDATE_USER";
    PermissionType["DELETE_USER"] = "DELETE_USER";
    // Leave Management
    PermissionType["VIEW_LEAVES"] = "VIEW_LEAVES";
    PermissionType["APPROVE_LEAVES"] = "APPROVE_LEAVES";
    PermissionType["CREATE_LEAVE"] = "CREATE_LEAVE";
    // Performance Management
    PermissionType["VIEW_PERFORMANCE"] = "VIEW_PERFORMANCE";
    PermissionType["CREATE_PERFORMANCE_REVIEW"] = "CREATE_PERFORMANCE_REVIEW";
    PermissionType["UPDATE_PERFORMANCE_REVIEW"] = "UPDATE_PERFORMANCE_REVIEW";
    // Payroll Management
    PermissionType["VIEW_PAYROLL"] = "VIEW_PAYROLL";
    PermissionType["MANAGE_PAYROLL"] = "MANAGE_PAYROLL";
    // Department Management
    PermissionType["VIEW_DEPARTMENTS"] = "VIEW_DEPARTMENTS";
    PermissionType["MANAGE_DEPARTMENTS"] = "MANAGE_DEPARTMENTS";
    // System Administration
    PermissionType["MANAGE_ROLES"] = "MANAGE_ROLES";
    PermissionType["MANAGE_PERMISSIONS"] = "MANAGE_PERMISSIONS";
})(PermissionType || (exports.PermissionType = PermissionType = {}));
let Permission = class Permission {
};
exports.Permission = Permission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Permission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], Permission.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], Permission.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Role_1.Role, role => role.permissions),
    __metadata("design:type", Array)
], Permission.prototype, "roles", void 0);
exports.Permission = Permission = __decorate([
    (0, typeorm_1.Entity)("permissions")
], Permission);
