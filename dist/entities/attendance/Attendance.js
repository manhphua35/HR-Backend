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
exports.Attendance = exports.AttendanceStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../core/User");
const Leave_1 = require("../leave/Leave"); // Giả sử bạn có entity Leave
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["LEAVE"] = "leave";
    AttendanceStatus["LATE"] = "late";
    AttendanceStatus["EARLY_LEAVE"] = "early_leave";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
let Attendance = class Attendance {
};
exports.Attendance = Attendance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Attendance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true }) // eager: true để tự động load thông tin user khi query attendance
    ,
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_1.User)
], Attendance.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Attendance.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "checkInTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "checkOutTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AttendanceStatus,
        default: AttendanceStatus.ABSENT, // Mặc định là vắng mặt
    }),
    __metadata("design:type", String)
], Attendance.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', nullable: true }) // Số giờ làm việc thực tế
    ,
    __metadata("design:type", Object)
], Attendance.prototype, "workHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Leave_1.Leave, { nullable: true }) // Liên kết với đơn nghỉ phép nếu status là LEAVE
    ,
    (0, typeorm_1.JoinColumn)({ name: 'leave_request_id' }),
    __metadata("design:type", Object)
], Attendance.prototype, "leaveRequest", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Attendance.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Attendance.prototype, "updatedAt", void 0);
exports.Attendance = Attendance = __decorate([
    (0, typeorm_1.Entity)('attendances')
], Attendance);
