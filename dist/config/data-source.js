"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/core/User");
const Department_1 = require("../entities/core/Department");
const Position_1 = require("../entities/core/Position");
const Role_1 = require("../entities/auth/Role");
const Permission_1 = require("../entities/auth/Permission");
const RolePermission_1 = require("../entities/auth/RolePermission");
const Leave_1 = require("../entities/leave/Leave");
const Payroll_1 = require("../entities/payroll/Payroll");
const TrainingCourse_1 = require("../entities/training/TrainingCourse");
// import { TrainingParticipant } from "../entities/training/TrainingParticipant";
// import { TrainingResult } from "../entities/training/TrainingResult";
// import { CompetencyAssessment } from "../entities/training/CompetencyAssessment";
const EditRequest_1 = require("../entities/profile/EditRequest");
const DepartmentReport_1 = require("../entities/report/DepartmentReport");
const PerformanceReview_1 = require("../entities/performance/PerformanceReview");
const PerformancePlan_1 = require("../entities/performance/PerformancePlan");
const Notification_1 = require("../entities/notification/Notification");
const UserNotification_1 = require("../entities/notification/UserNotification");
const Attendance_1 = require("../entities/attendance/Attendance");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "EmployeeDatabase",
    synchronize: true,
    logging: false,
    entities: [
        User_1.User,
        Department_1.Department,
        Position_1.Position,
        Role_1.Role,
        Permission_1.Permission,
        RolePermission_1.RolePermission,
        Leave_1.Leave,
        Payroll_1.Payroll,
        TrainingCourse_1.TrainingCourse,
        // TrainingParticipant,
        // TrainingResult,
        // CompetencyAssessment,
        EditRequest_1.EditRequest,
        DepartmentReport_1.DepartmentReport,
        PerformanceReview_1.PerformanceReview,
        PerformancePlan_1.PerformancePlan,
        Notification_1.Notification,
        UserNotification_1.UserNotification,
        Attendance_1.Attendance
    ],
    subscribers: [],
    migrations: [],
});
exports.default = exports.AppDataSource;
