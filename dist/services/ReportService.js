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
exports.reportService = void 0;
const data_source_1 = require("../config/data-source");
const DepartmentReport_1 = require("../entities/report/DepartmentReport");
const Department_1 = require("../entities/core/Department");
const User_1 = require("../entities/core/User");
const Payroll_1 = require("../entities/payroll/Payroll");
const Leave_1 = require("../entities/leave/Leave");
const TrainingCourse_1 = require("../entities/training/TrainingCourse");
const PerformanceReview_1 = require("../entities/performance/PerformanceReview");
const PerformancePlan_1 = require("../entities/performance/PerformancePlan");
const typeorm_1 = require("typeorm");
const Attendance_1 = require("../entities/attendance/Attendance");
class ReportService {
    constructor() {
        this.departmentRepo = data_source_1.AppDataSource.getRepository(Department_1.Department);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.payrollRepo = data_source_1.AppDataSource.getRepository(Payroll_1.Payroll);
        this.leaveRepo = data_source_1.AppDataSource.getRepository(Leave_1.Leave);
        this.trainingRepo = data_source_1.AppDataSource.getRepository(TrainingCourse_1.TrainingCourse);
        this.performanceRepo = data_source_1.AppDataSource.getRepository(PerformanceReview_1.PerformanceReview);
        this.performancePlanRepo = data_source_1.AppDataSource.getRepository(PerformancePlan_1.PerformancePlan);
        this.reportRepo = data_source_1.AppDataSource.getRepository(DepartmentReport_1.DepartmentReport);
        this.attendanceRepo = data_source_1.AppDataSource.getRepository(Attendance_1.Attendance);
    }
    static getInstance() {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }
    // Tạo báo cáo cho toàn công ty
    generateCompanyReport(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const departments = yield this.departmentRepo.find();
            const reports = [];
            for (const dept of departments) {
                try {
                    const report = yield this.generateDepartmentReport(dept.id, startDate, endDate);
                    reports.push(report);
                }
                catch (error) {
                    console.error(`Error generating report for department ${dept.id}:`, error);
                }
            }
            return reports;
        });
    }
    // Tạo báo cáo phòng ban
    generateDepartmentReport(departmentId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Lấy thông tin phòng ban
            const department = yield this.departmentRepo.findOneBy({ id: departmentId });
            if (!department) {
                throw new Error('Department not found');
            }
            // Đếm số nhân viên
            const totalEmployees = yield this.userRepo.count({
                where: { departmentId }
            });
            // Đếm nhân viên mới
            const newEmployees = yield this.userRepo.count({
                where: {
                    departmentId,
                    hireDate: (0, typeorm_1.Between)(startDate, endDate)
                }
            });
            // Đếm nhân viên nghỉ việc
            const resignedEmployees = yield this.userRepo.count({
                where: {
                    departmentId,
                    resignationDate: (0, typeorm_1.Between)(startDate, endDate)
                }
            });
            // Tính tổng ngày nghỉ
            const leaves = yield this.leaveRepo.find({
                where: {
                    user: { departmentId },
                    startDate: (0, typeorm_1.Between)(startDate, endDate)
                }
            });
            const totalLeaves = leaves.reduce((sum, leave) => {
                const days = (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
                return sum + days;
            }, 0);
            // Tính lương và phụ cấp
            const payrolls = yield this.payrollRepo.find({
                where: {
                    user: { departmentId },
                    month: startDate.getMonth() + 1,
                    year: startDate.getFullYear()
                }
            });
            const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.baseSalary), 0);
            const totalAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalAllowance), 0);
            const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeduction), 0);
            // Lấy danh sách người dùng trong phòng ban
            const users = yield this.userRepo.find({
                where: { departmentId }
            });
            const userIds = users.map(u => u.id);
            // Tính giờ đào tạo
            const trainings = yield this.trainingRepo.find({
                where: {
                    userId: (0, typeorm_1.In)(userIds),
                    completionDate: (0, typeorm_1.Between)(startDate, endDate)
                }
            });
            const totalTrainingHours = trainings.length * 8;
            // Tính điểm đánh giá trung bình
            const reviews = yield this.performanceRepo.find({
                where: {
                    employee: { departmentId },
                    reviewDate: (0, typeorm_1.Between)(startDate, endDate)
                }
            });
            const averageRating = reviews.length > 0
                ? Number((reviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / reviews.length).toFixed(2))
                : 0;
            // Tạo báo cáo mới
            const report = new DepartmentReport_1.DepartmentReport();
            report.departmentId = departmentId;
            report.reportDate = endDate;
            report.totalEmployees = totalEmployees;
            report.newEmployees = newEmployees;
            report.resignedEmployees = resignedEmployees;
            report.totalLeaves = totalLeaves;
            report.totalSalary = totalSalary;
            report.totalAllowances = totalAllowances;
            report.totalDeductions = totalDeductions;
            report.totalTrainingHours = totalTrainingHours;
            report.averagePerformanceRating = averageRating;
            return yield this.reportRepo.save(report);
        });
    }
    // Lấy báo cáo theo khoảng thời gian
    getDepartmentReports(departmentId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Nếu không có departmentId (null), lấy tất cả báo cáo phòng ban trong khoảng thời gian
            if (departmentId === null) {
                return yield this.reportRepo.find({
                    where: {
                        reportDate: (0, typeorm_1.Between)(startDate, endDate)
                    },
                    order: { reportDate: 'DESC' }
                });
            }
            // Nếu có departmentId, lấy báo cáo của phòng ban cụ thể
            return yield this.reportRepo.find({
                where: {
                    departmentId,
                    reportDate: (0, typeorm_1.Between)(startDate, endDate)
                },
                order: { reportDate: 'DESC' }
            });
        });
    }
    // Thống kê chi phí nhân sự theo phòng ban
    getHRCostStatistics(month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            const departments = yield this.departmentRepo.find();
            const results = [];
            const periodEndDate = new Date(year, month, 0); // Last day of the given month
            for (const dept of departments) {
                const payrolls = yield this.payrollRepo.find({
                    where: {
                        user: { departmentId: dept.id },
                        month,
                        year
                    }
                });
                const totalCost = payrolls.reduce((sum, p) => sum + Number(p.baseSalary) + Number(p.totalAllowance) - Number(p.totalDeduction) + Number(p.bonus), 0);
                const activeEmployeesInDept = yield this.userRepo.count({
                    where: [
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(periodEndDate),
                            resignationDate: (0, typeorm_1.IsNull)()
                        },
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(periodEndDate),
                            resignationDate: (0, typeorm_1.MoreThan)(periodEndDate)
                        }
                    ]
                });
                results.push({
                    department: dept.name,
                    totalEmployees: activeEmployeesInDept,
                    totalCost,
                    averageCost: activeEmployeesInDept > 0 ? totalCost / activeEmployeesInDept : 0
                });
            }
            return results;
        });
    }
    // Thống kê tổng hợp cho dashboard
    getDashboardData(month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of the given month
            const currentDate = new Date();
            // Thực hiện tất cả các queries song song để tối ưu hiệu suất
            const [totalActiveEmployees, // Renamed from totalEmployees for clarity
            departments, activeLeaves, currentTrainings, totalPayroll, performanceReviews] = yield Promise.all([
                // Tổng số nhân viên còn làm việc
                this.userRepo.count({
                    where: [
                        {
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                            resignationDate: (0, typeorm_1.IsNull)()
                        },
                        {
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                            resignationDate: (0, typeorm_1.MoreThan)(endDate)
                        }
                    ]
                }),
                // Danh sách phòng ban
                this.departmentRepo.find(),
                // Đơn nghỉ phép đang active
                this.leaveRepo.find({
                    where: {
                        startDate: (0, typeorm_1.LessThanOrEqual)(currentDate),
                        endDate: (0, typeorm_1.MoreThanOrEqual)(currentDate),
                        status: Leave_1.LeaveStatus.APPROVED
                    },
                    relations: ['user']
                }),
                // Khóa đào tạo đang diễn ra
                this.trainingRepo.find({
                    where: {
                        completionDate: (0, typeorm_1.Between)(startDate, endDate)
                    },
                    relations: ['user']
                }),
                // Tổng chi phí lương tháng
                this.payrollRepo.find({
                    where: { month, year },
                    relations: ['user']
                }),
                // Đánh giá hiệu suất
                this.performanceRepo.find({
                    where: {
                        reviewDate: (0, typeorm_1.Between)(startDate, endDate),
                        status: PerformanceReview_1.ReviewStatus.APPROVED
                    },
                    relations: ['employee']
                })
            ]);
            // Tính toán thống kê theo phòng ban
            const departmentStats = yield Promise.all(departments.map((dept) => __awaiter(this, void 0, void 0, function* () {
                const activeDeptEmployees = yield this.userRepo.count({
                    where: [
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                            resignationDate: (0, typeorm_1.IsNull)()
                        },
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                            resignationDate: (0, typeorm_1.MoreThan)(endDate)
                        }
                    ]
                });
                const deptPayroll = totalPayroll.filter(p => { var _a; return ((_a = p.user) === null || _a === void 0 ? void 0 : _a.departmentId) === dept.id; });
                const deptLeaves = activeLeaves.filter(l => { var _a; return ((_a = l.user) === null || _a === void 0 ? void 0 : _a.departmentId) === dept.id; });
                const deptTrainings = currentTrainings.filter(t => { var _a; return ((_a = t.user) === null || _a === void 0 ? void 0 : _a.departmentId) === dept.id; });
                const deptReviews = performanceReviews.filter(r => { var _a; return ((_a = r.employee) === null || _a === void 0 ? void 0 : _a.departmentId) === dept.id; });
                return {
                    department: dept.name,
                    employeeCount: activeDeptEmployees,
                    leaveCount: deptLeaves.length,
                    trainingCount: deptTrainings.length,
                    totalSalary: deptPayroll.reduce((sum, p) => sum + (Number(p.baseSalary || 0) + Number(p.totalAllowance || 0) + Number(p.bonus || 0) - Number(p.totalDeduction || 0)), 0),
                    avgPerformance: deptReviews.length > 0
                        ? Number((deptReviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / deptReviews.length).toFixed(2))
                        : 0
                };
            })));
            return {
                summary: {
                    totalEmployees: totalActiveEmployees, // Use the new count
                    activeLeaves: activeLeaves.length,
                    ongoingTrainings: currentTrainings.length,
                    totalSalary: totalPayroll.reduce((sum, p) => sum + (Number(p.baseSalary || 0) + Number(p.totalAllowance || 0) + Number(p.bonus || 0) - Number(p.totalDeduction || 0)), 0),
                    avgPerformance: performanceReviews.length > 0
                        ? Number((performanceReviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / performanceReviews.length).toFixed(2))
                        : 0
                },
                departments: departmentStats
            };
        });
    }
    // Lấy dữ liệu dashboard cho Trưởng phòng
    getDepartmentManagerDashboard(departmentId, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Ngày cuối cùng của tháng
            const currentDate = new Date();
            // Đảm bảo departmentId tồn tại
            const department = yield this.departmentRepo.findOneBy({ id: departmentId });
            if (!department) {
                throw new Error('Không tìm thấy phòng ban');
            }
            // 1. Tính tổng số nhân viên trong phòng ban
            const employeeCount = yield this.userRepo.count({
                where: [
                    {
                        departmentId,
                        isActive: true,
                        hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                        resignationDate: (0, typeorm_1.IsNull)()
                    },
                    {
                        departmentId,
                        isActive: true,
                        hireDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                        resignationDate: (0, typeorm_1.MoreThan)(endDate)
                    }
                ]
            });
            // 2. Đếm số đơn nghỉ phép đang chờ duyệt
            const pendingLeaveRequests = yield this.leaveRepo.count({
                where: {
                    user: { departmentId },
                    status: Leave_1.LeaveStatus.PENDING
                }
            });
            // 3. Tính tỷ lệ chấm công trong tháng
            const employees = yield this.userRepo.find({
                where: {
                    departmentId,
                    isActive: true
                }
            });
            const employeeIds = employees.map(e => e.id);
            const attendanceData = yield this.attendanceRepo.find({
                where: {
                    user: { id: (0, typeorm_1.In)(employeeIds) },
                    date: (0, typeorm_1.Between)(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
                }
            });
            const totalWorkDays = this.getWorkDaysInMonth(month, year) * employeeCount;
            // Sử dụng enum AttendanceStatus
            const presentDays = attendanceData.filter(a => a.status === Attendance_1.AttendanceStatus.PRESENT).length;
            // 4. Tính điểm đánh giá hiệu suất trung bình
            const performanceReviews = yield this.performanceRepo.find({
                where: {
                    employee: { departmentId },
                    reviewDate: (0, typeorm_1.Between)(startDate, endDate),
                    status: PerformanceReview_1.ReviewStatus.APPROVED
                }
            });
            const averagePerformance = performanceReviews.length > 0
                ? Math.round((performanceReviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / performanceReviews.length) * 100) / 100
                : 0;
            // 5. Tính tỷ lệ hoàn thành kế hoạch hiệu suất
            const performancePlans = yield this.performancePlanRepo.find({
                where: {
                    departmentId,
                    endDate: (0, typeorm_1.MoreThanOrEqual)(startDate),
                    startDate: (0, typeorm_1.LessThanOrEqual)(endDate)
                }
            });
            const completedPlans = performancePlans.filter(p => p.status === PerformancePlan_1.PlanStatus.COMPLETED).length;
            const projectCompletion = performancePlans.length > 0
                ? Math.round((completedPlans / performancePlans.length) * 100)
                : 0;
            // 6. Tính tỷ lệ hoàn thành đào tạo
            const trainings = yield this.trainingRepo.find({
                where: {
                    departmentId,
                    endDate: (0, typeorm_1.MoreThanOrEqual)(startDate),
                    startDate: (0, typeorm_1.LessThanOrEqual)(endDate)
                }
            });
            const completedTrainings = trainings.filter(t => t.status === TrainingCourse_1.TrainingStatus.COMPLETED).length;
            const trainingProgress = trainings.length > 0
                ? Math.round((completedTrainings / trainings.length) * 100)
                : 0;
            // 7. Đếm số dự án/kế hoạch đang hoạt động
            const activeProjects = yield this.performancePlanRepo.count({
                where: {
                    departmentId,
                    status: PerformancePlan_1.PlanStatus.ACTIVE
                }
            });
            return {
                employeeCount,
                pendingLeaveRequests,
                averagePerformance,
                attendance: {
                    present: presentDays,
                    total: totalWorkDays
                },
                projectCompletion,
                trainingProgress,
                activeProjects
            };
        });
    }
    getEmployeeDashboardData(employeeId, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of the given month
            // Lấy thông tin nhân viên
            const employee = yield this.userRepo.findOne({
                where: { id: employeeId },
                relations: ['department', 'position']
            });
            if (!employee) {
                throw new Error('Không tìm thấy nhân viên');
            }
            // Lấy dữ liệu chấm công
            const attendances = yield this.findAttendances(employee.id, startDate, endDate);
            const totalWorkDays = this.getWorkDaysInMonth(month, year);
            const presentDays = attendances.filter(a => a.status === 'PRESENT').length;
            const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
            const lateDays = attendances.filter(a => a.status === 'LATE').length;
            // Lấy thông tin nghỉ phép
            const leaves = yield this.leaveRepo.find({
                where: {
                    user: { id: employee.id }
                }
            });
            const usedLeaveDays = leaves
                .filter(leave => leave.status === Leave_1.LeaveStatus.APPROVED && leave.startDate && leave.endDate)
                .reduce((total, leave) => {
                // Ensure startDate and endDate are valid Date objects
                const startDate = typeof leave.startDate === 'string' ? new Date(leave.startDate) : leave.startDate;
                const endDate = typeof leave.endDate === 'string' ? new Date(leave.endDate) : leave.endDate;
                if (startDate instanceof Date && endDate instanceof Date && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    // Calculate the difference in days (inclusive)
                    const diffTime = endDate.getTime() - startDate.getTime();
                    // Add 1 because the difference is exclusive of the end date, and we need inclusive days
                    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return total + days;
                }
                else {
                    console.warn(`Skipping leave ID ${leave.id} due to invalid dates: start=${leave.startDate}, end=${leave.endDate}`);
                    return total; // Skip this leave record if dates are invalid
                }
            }, 0);
            const pendingLeaves = leaves.filter(leave => leave.status === Leave_1.LeaveStatus.PENDING).length;
            // Lấy payroll gần nhất
            const payroll = yield this.payrollRepo.findOne({
                where: {
                    user: { id: employee.id },
                    month,
                    year
                }
            });
            // Lấy khóa đào tạo đang diễn ra
            const trainings = yield this.trainingRepo.find({
                where: {
                    user: { id: employee.id },
                    startDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                    endDate: (0, typeorm_1.MoreThanOrEqual)(startDate)
                }
            });
            const mappedTrainings = trainings.map(course => ({
                id: course.id,
                name: course.name,
                startDate: course.startDate,
                endDate: course.endDate,
                progress: course.score ? (course.score / 100) * 100 : 0
            }));
            // Lấy đánh giá hiệu suất gần nhất
            const review = yield this.performanceRepo.findOne({
                where: {
                    employee: { id: employee.id },
                    status: PerformanceReview_1.ReviewStatus.APPROVED
                },
                relations: ['plan'],
                order: {
                    reviewDate: 'DESC'
                }
            });
            let performanceData = null;
            if (review && review.plan && review.plan.startDate && review.plan.endDate) {
                // Ensure plan dates are valid Date objects
                const planStartDate = typeof review.plan.startDate === 'string' ? new Date(review.plan.startDate) : review.plan.startDate;
                const planEndDate = typeof review.plan.endDate === 'string' ? new Date(review.plan.endDate) : review.plan.endDate;
                if (planStartDate instanceof Date && planEndDate instanceof Date && !isNaN(planStartDate.getTime()) && !isNaN(planEndDate.getTime())) {
                    performanceData = {
                        period: `${planStartDate.toLocaleDateString()} - ${planEndDate.toLocaleDateString()}`,
                        overallScore: review.totalScore,
                        strengths: ((_a = review.strengths) === null || _a === void 0 ? void 0 : _a.split(',').map(s => s.trim())) || [],
                        improvements: ((_b = review.improvement) === null || _b === void 0 ? void 0 : _b.split(',').map(s => s.trim())) || []
                    };
                }
                else {
                    console.warn(`Skipping performance review ID ${review.id} for plan ${review.plan.id} due to invalid plan dates: start=${review.plan.startDate}, end=${review.plan.endDate}`);
                }
            }
            return {
                employee: {
                    id: employee.id,
                    fullName: employee.fullName,
                    email: employee.email,
                    department: (_c = employee.department) === null || _c === void 0 ? void 0 : _c.name,
                    position: (_d = employee.position) === null || _d === void 0 ? void 0 : _d.title
                },
                attendance: {
                    totalWorkDays,
                    presentDays,
                    absentDays,
                    lateDays
                },
                leaves: {
                    used: usedLeaveDays,
                    remaining: employee.remainingLeaves || 0,
                    pending: pendingLeaves
                },
                payroll: payroll ? {
                    month: payroll.month,
                    year: payroll.year,
                    basicSalary: payroll.baseSalary,
                    totalAllowance: payroll.totalAllowance,
                    totalDeduction: payroll.totalDeduction,
                    netSalary: payroll.netSalary
                } : null,
                training: mappedTrainings,
                performance: performanceData
            };
        });
    }
    getWorkDaysInMonth(month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        let workDays = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) { // 0 = Chủ Nhật, 6 = Thứ Bảy
                workDays++;
            }
        }
        return workDays;
    }
    findAttendances(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const attendanceRepository = data_source_1.AppDataSource.getRepository(Attendance_1.Attendance);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            try {
                return yield attendanceRepository.find({
                    where: {
                        user: { id: userId },
                        date: (0, typeorm_1.Between)(startDateStr, endDateStr)
                    }
                });
            }
            catch (error) {
                console.error('Error fetching attendances:', error);
                return [];
            }
        });
    }
}
exports.reportService = ReportService.getInstance();
