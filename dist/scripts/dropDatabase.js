"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/core/User");
const Role_1 = require("../entities/auth/Role");
const Permission_1 = require("../entities/auth/Permission");
const Department_1 = require("../entities/core/Department");
const Position_1 = require("../entities/core/Position");
const Leave_1 = require("../entities/leave/Leave");
const Payroll_1 = require("../entities/payroll/Payroll");
const PerformanceReview_1 = require("../entities/performance/PerformanceReview");
const PerformancePlan_1 = require("../entities/performance/PerformancePlan");
const Notification_1 = require("../entities/notification/Notification");
const UserNotification_1 = require("../entities/notification/UserNotification");
const Attendance_1 = require("../entities/attendance/Attendance");
const DepartmentReport_1 = require("../entities/report/DepartmentReport");
const TrainingCourse_1 = require("../entities/training/TrainingCourse");
const EditRequest_1 = require("../entities/profile/EditRequest");
const RolePermission_1 = require("../entities/auth/RolePermission");
// Tạo data source mới với dropSchema: true
const tempDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "Manhphu593",
    database: "EmployeeDatabase",
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [
        User_1.User,
        Role_1.Role,
        Permission_1.Permission,
        RolePermission_1.RolePermission,
        Department_1.Department,
        Position_1.Position,
        Leave_1.Leave,
        Payroll_1.Payroll,
        PerformanceReview_1.PerformanceReview,
        PerformancePlan_1.PerformancePlan,
        Notification_1.Notification,
        UserNotification_1.UserNotification,
        Attendance_1.Attendance,
        DepartmentReport_1.DepartmentReport,
        TrainingCourse_1.TrainingCourse,
        EditRequest_1.EditRequest
    ],
});
tempDataSource.initialize().then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Database has been dropped and recreated.");
    yield tempDataSource.destroy();
    process.exit(0);
})).catch(error => {
    console.error("Error during database drop:", error);
    process.exit(1);
});
