import { DataSource } from "typeorm";
import dotenv from 'dotenv';
// Load env variables first
dotenv.config();
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/core/User";
import { Role } from "../entities/auth/Role";
import { Permission } from "../entities/auth/Permission";
import { Department } from "../entities/core/Department";
import { Position } from "../entities/core/Position";
import { Leave } from "../entities/leave/Leave";
import { Payroll } from "../entities/payroll/Payroll";
import { PayrollComponent } from "../entities/payroll/PayrollComponent";
import { MonthlyPayroll } from "../entities/payroll/MonthlyPayroll";
import { PerformanceReview } from "../entities/performance/PerformanceReview";
import { PerformancePlan } from "../entities/performance/PerformancePlan";
import { Notification } from "../entities/notification/Notification";
import { UserNotification } from "../entities/notification/UserNotification";
import { Attendance } from "../entities/attendance/Attendance";
import { DepartmentReport } from "../entities/report/DepartmentReport";
import { TrainingCourse } from "../entities/training/TrainingCourse";
import { TrainingParticipant } from "../entities/training/TrainingParticipant";
import { TrainingResult } from "../entities/training/TrainingResult";
import { CompetencyAssessment } from "../entities/training/CompetencyAssessment";
import { EditRequest } from "../entities/profile/EditRequest";
import { RolePermission } from "../entities/auth/RolePermission";
import { SeedService } from "../services/SeedService";

async function resetAndSeedDatabase() {
    console.log("Starting database reset and seed process...");

    // 1. Create temporary data source with dropSchema option
    // Use AppDataSource's configuration but enable dropSchema
    const tempDataSource = new DataSource({
        ...AppDataSource.options,
        dropSchema: true
    });

    try {
        // 2. Initialize and drop schema
        console.log("Dropping existing database schema...");
        await tempDataSource.initialize();
        console.log("Database schema dropped successfully");
        await tempDataSource.destroy();

        // 3. Initialize AppDataSource for seeding
        console.log("Initializing database for seeding...");
        await AppDataSource.initialize();
        
        // 4. Run the seed service
        console.log("Starting data seeding process...");
        await SeedService.seedAll();
        console.log("Database reset and seed completed successfully!");
        
        // 5. Close connection
        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error during database reset and seed:", error);
        process.exit(1);
    }
}

// Run the reset and seed process
resetAndSeedDatabase().then(() => {
    console.log("Process completed successfully!");
    process.exit(0);
}).catch(error => {
    console.error("Process failed:", error);
    process.exit(1);
});