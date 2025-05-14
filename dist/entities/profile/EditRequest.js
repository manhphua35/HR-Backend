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
exports.EditRequest = exports.EditRequestType = exports.EditRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../core/User");
var EditRequestStatus;
(function (EditRequestStatus) {
    EditRequestStatus["PENDING"] = "PENDING";
    EditRequestStatus["APPROVED"] = "APPROVED";
    EditRequestStatus["REJECTED"] = "REJECTED";
})(EditRequestStatus || (exports.EditRequestStatus = EditRequestStatus = {}));
var EditRequestType;
(function (EditRequestType) {
    EditRequestType["PERSONAL_INFO"] = "PERSONAL_INFO";
    EditRequestType["CONTACT_INFO"] = "CONTACT_INFO";
    EditRequestType["DEPARTMENT"] = "DEPARTMENT";
    EditRequestType["POSITION"] = "POSITION";
})(EditRequestType || (exports.EditRequestType = EditRequestType = {}));
let EditRequest = class EditRequest {
};
exports.EditRequest = EditRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EditRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "user_id" }),
    __metadata("design:type", Number)
], EditRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], EditRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: EditRequestType
    }),
    __metadata("design:type", String)
], EditRequest.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json" }),
    __metadata("design:type", Object)
], EditRequest.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], EditRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: EditRequestStatus,
        default: EditRequestStatus.PENDING
    }),
    __metadata("design:type", String)
], EditRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EditRequest.prototype, "reviewNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "reviewer_id", nullable: true }),
    __metadata("design:type", Number)
], EditRequest.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "reviewer_id" }),
    __metadata("design:type", User_1.User)
], EditRequest.prototype, "reviewer", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], EditRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], EditRequest.prototype, "updatedAt", void 0);
exports.EditRequest = EditRequest = __decorate([
    (0, typeorm_1.Entity)("edit_requests")
], EditRequest);
