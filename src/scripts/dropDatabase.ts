import { DataSource } from "typeorm";
import { User } from "../entities/core/User";
import { Role } from "../entities/auth/Role";
import { Permission } from "../entities/auth/Permission";
import { Department } from "../entities/core/Department";
import { Position } from "../entities/core/Position";
import { Leave } from "../entities/leave/Leave";
import { Payroll } from "../entities/payroll/Payroll";
import { PerformanceReview } from "../entities/performance/PerformanceReview";
import { PerformancePlan } from "../entities/performance/PerformancePlan";
import { Notification } from "../entities/notification/Notification";
import { UserNotification } from "../entities/notification/UserNotification";
import { Attendance } from "../entities/attendance/Attendance";
import { DepartmentReport } from "../entities/report/DepartmentReport";
import { TrainingCourse } from "../entities/training/TrainingCourse";
import { EditRequest } from "../entities/profile/EditRequest";
import { RolePermission } from "../entities/auth/RolePermission";

// Tạo data source mới với dropSchema: true
const tempDataSource = new DataSource({
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
        User,
        Role,
        Permission,
        RolePermission,
        Department,
        Position,
        Leave,
        Payroll,
        PerformanceReview,
        PerformancePlan,
        Notification,
        UserNotification,
        Attendance,
        DepartmentReport,
        TrainingCourse,
        EditRequest
    ],
});

tempDataSource.initialize().then(async () => {
    console.log("Database has been dropped and recreated.");
    await tempDataSource.destroy();
    process.exit(0);
}).catch(error => {
    console.error("Error during database drop:", error);
    process.exit(1);
});