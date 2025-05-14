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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
// Load env variables first
dotenv_1.default.config();
const data_source_1 = require("../config/data-source");
// import { User } from "../entities/core/User";
// import { Role } from "../entities/auth/Role";
// import { Permission } from "../entities/auth/Permission";
// import { Department } from "../entities/core/Department";
// import { Position } from "../entities/core/Position";
// import { Leave } from "../entities/leave/Leave";
// import { Payroll } from "../entities/payroll/Payroll";
// import { PerformanceReview } from "../entities/performance/PerformanceReview";
// import { PerformancePlan } from "../entities/performance/PerformancePlan";
// import { Notification } from "../entities/notification/Notification";
// import { UserNotification } from "../entities/notification/UserNotification";
// import { Attendance } from "../entities/attendance/Attendance";
// import { DepartmentReport } from "../entities/report/DepartmentReport";
// import { TrainingCourse } from "../entities/training/TrainingCourse";
// import { EditRequest } from "../entities/profile/EditRequest";
// import { RolePermission } from "../entities/auth/RolePermission";
const SeedService_1 = require("../services/SeedService");
function resetAndSeedDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting database reset and seed process...");
        // 1. Create temporary data source with dropSchema option
        // Use AppDataSource's configuration but enable dropSchema
        const tempDataSource = new typeorm_1.DataSource(Object.assign(Object.assign({}, data_source_1.AppDataSource.options), { dropSchema: true }));
        try {
            // 2. Initialize and drop schema
            console.log("Dropping existing database schema...");
            yield tempDataSource.initialize();
            console.log("Database schema dropped successfully");
            yield tempDataSource.destroy();
            // 3. Initialize AppDataSource for seeding
            console.log("Initializing database for seeding...");
            yield data_source_1.AppDataSource.initialize();
            // 4. Run the seed service
            console.log("Starting data seeding process...");
            yield SeedService_1.SeedService.seedAll();
            console.log("Database reset and seed completed successfully!");
            // 5. Close connection
            yield data_source_1.AppDataSource.destroy();
        }
        catch (error) {
            console.error("Error during database reset and seed:", error);
            process.exit(1);
        }
    });
}
// Run the reset and seed process
resetAndSeedDatabase().then(() => {
    console.log("Process completed successfully!");
    process.exit(0);
}).catch(error => {
    console.error("Process failed:", error);
    process.exit(1);
});
