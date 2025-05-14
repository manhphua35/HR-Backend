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
exports.Position = void 0;
const typeorm_1 = require("typeorm"); // Added ManyToOne, JoinColumn
const User_1 = require("./User");
const uuid_1 = require("uuid");
const Department_1 = require("./Department"); // Added Department import
let Position = class Position {
    generateId() {
        this.id = (0, uuid_1.v4)();
    }
};
exports.Position = Position;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 36 }),
    __metadata("design:type", String)
], Position.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Position.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Position.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "department_id" }),
    __metadata("design:type", Number)
], Position.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department, department => department.positions),
    (0, typeorm_1.JoinColumn)({ name: "department_id" }) // Links this relationship to the departmentId column
    ,
    __metadata("design:type", Department_1.Department)
], Position.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => User_1.User, user => user.position),
    __metadata("design:type", Array)
], Position.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Position.prototype, "generateId", null);
exports.Position = Position = __decorate([
    (0, typeorm_1.Entity)("positions")
], Position);
