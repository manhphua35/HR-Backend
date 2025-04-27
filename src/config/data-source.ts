import { DataSource } from "typeorm";
import { User } from "../entities/core/User";
import { Department } from "../entities/core/Department";
import { Position } from "../entities/core/Position";
import { Role } from "../entities/auth/Role";
import { Permission } from "../entities/auth/Permission";
import { RolePermission } from "../entities/auth/RolePermission";
import { Leave } from "../entities/leave/Leave";
import { PayrollComponent } from "../entities/payroll/PayrollComponent";
import { MonthlyPayroll } from "../entities/payroll/MonthlyPayroll";
import { TrainingCourse } from "../entities/training/TrainingCourse";
import { TrainingParticipant } from "../entities/training/TrainingParticipant";
import { TrainingResult } from "../entities/training/TrainingResult";
import { CompetencyAssessment } from "../entities/training/CompetencyAssessment";
import { EditRequest } from "../entities/profile/EditRequest";
import { DepartmentReport } from "../entities/report/DepartmentReport";
import { PerformanceReview } from "../entities/performance/PerformanceReview";
import { PerformancePlan } from "../entities/performance/PerformancePlan";
import { Notification } from "../entities/notification/Notification";
import { UserNotification } from "../entities/notification/UserNotification";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "EmployeeDatabase",
    synchronize: true,
    logging: true,
    entities: [
        User,
        Department,
        Position,
        Role,
        Permission,
        RolePermission,
        Leave,
        PayrollComponent,
        MonthlyPayroll,
        TrainingCourse,
        TrainingParticipant,
        TrainingResult,
        CompetencyAssessment,
        EditRequest,
        DepartmentReport,
        PerformanceReview,
        PerformancePlan,
        Notification,
        UserNotification
    ],
    subscribers: [],
    migrations: [],
});

export default AppDataSource;
