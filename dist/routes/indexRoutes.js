"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthRoutes_1 = __importDefault(require("./AuthRoutes"));
const UserRoutes_1 = __importDefault(require("./UserRoutes"));
const DepartmentRoutes_1 = __importDefault(require("./DepartmentRoutes"));
const PositionRoutes_1 = __importDefault(require("./PositionRoutes"));
const LeaveRoutes_1 = __importDefault(require("./LeaveRoutes"));
const PerformanceRoutes_1 = __importDefault(require("./PerformanceRoutes"));
const PayrollRoutes_1 = __importDefault(require("./PayrollRoutes"));
const TrainingRoutes_1 = __importDefault(require("./TrainingRoutes"));
const ProfileRoutes_1 = __importDefault(require("./ProfileRoutes"));
const ReportRoutes_1 = __importDefault(require("./ReportRoutes"));
const AttendanceRoutes_1 = __importDefault(require("./AttendanceRoutes")); // Import attendance routes
const router = (0, express_1.Router)();
// Mount routes
router.use('/auth', AuthRoutes_1.default);
router.use('/users', UserRoutes_1.default);
router.use('/departments', DepartmentRoutes_1.default);
router.use('/positions', PositionRoutes_1.default);
router.use('/leaves', LeaveRoutes_1.default);
router.use('/performance', PerformanceRoutes_1.default);
router.use('/payroll', PayrollRoutes_1.default);
router.use('/training', TrainingRoutes_1.default);
router.use('/profile', ProfileRoutes_1.default);
router.use('/reports', ReportRoutes_1.default);
router.use('/attendances', AttendanceRoutes_1.default); // Mount attendance routes
exports.default = router;
