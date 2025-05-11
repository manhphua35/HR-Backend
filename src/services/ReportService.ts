import { AppDataSource } from '../config/data-source';
import { DepartmentReport } from '../entities/report/DepartmentReport';
import { Department } from '../entities/core/Department';
import { User } from '../entities/core/User';
import { Payroll } from '../entities/payroll/Payroll';
import { Leave, LeaveStatus } from '../entities/leave/Leave';
import { TrainingResult } from '../entities/training/TrainingResult';
import { PerformanceReview, ReviewStatus } from '../entities/performance/PerformanceReview';
import { Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';

class ReportService {
    private static instance: ReportService;
    private departmentRepo = AppDataSource.getRepository(Department);
    private userRepo = AppDataSource.getRepository(User);
    private payrollRepo = AppDataSource.getRepository(Payroll);
    private leaveRepo = AppDataSource.getRepository(Leave);
    private trainingRepo = AppDataSource.getRepository(TrainingResult);
    private performanceRepo = AppDataSource.getRepository(PerformanceReview);
    private reportRepo = AppDataSource.getRepository(DepartmentReport);

    private constructor() {}

    public static getInstance(): ReportService {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }

    // Tạo báo cáo phòng ban theo tháng
    async generateDepartmentReport(departmentId: number, month: number, year: number): Promise<DepartmentReport> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Lấy thông tin phòng ban
        const department = await this.departmentRepo.findOneBy({ id: departmentId });
        if (!department) {
            throw new Error('Department not found');
        }

        // Đếm số nhân viên
        const totalEmployees = await this.userRepo.count({
            where: { departmentId }
        });

        // Đếm nhân viên mới
        const newEmployees = await this.userRepo.count({
            where: {
                departmentId,
                hireDate: Between(startDate, endDate)
            }
        });

        // Tính tổng ngày nghỉ
        const leaves = await this.leaveRepo.find({
            where: {
                user: { departmentId },
                startDate: Between(startDate, endDate)
            }
        });
        const totalLeaves = leaves.reduce((sum, leave) => {
            const days = (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
            return sum + days;
        }, 0);

        // Tính lương và phụ cấp
        const payrolls = await this.payrollRepo.find({
            where: {
                user: { departmentId },
                month,
                year
            }
        });
        const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.baseSalary), 0);
        const totalAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalAllowance), 0);
        const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeduction), 0);

        // Tính giờ đào tạo
        const trainings = await this.trainingRepo.find({
            where: {
                user: { departmentId },
                completionDate: Between(startDate, endDate)
            }
        });
        const totalTrainingHours = trainings.length * 8; // Giả sử mỗi khóa đào tạo 8 tiếng

        // Tính điểm đánh giá trung bình
        const reviews = await this.performanceRepo.find({
            where: {
                employee: { departmentId },
                reviewDate: Between(startDate, endDate)
            }
        });
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / reviews.length
            : 0;

        // Tạo báo cáo mới
        const report = new DepartmentReport();
        report.departmentId = departmentId;
        report.reportDate = endDate;
        report.totalEmployees = totalEmployees;
        report.newEmployees = newEmployees;
        report.totalLeaves = totalLeaves;
        report.totalSalary = totalSalary;
        report.totalAllowances = totalAllowances;
        report.totalDeductions = totalDeductions;
        report.totalTrainingHours = totalTrainingHours;
        report.averagePerformanceRating = averageRating;

        return await this.reportRepo.save(report);
    }

    // Lấy báo cáo theo khoảng thời gian
    async getDepartmentReports(departmentId: number, startDate: Date, endDate: Date): Promise<DepartmentReport[]> {
        return await this.reportRepo.find({
            where: {
                departmentId,
                reportDate: Between(startDate, endDate)
            },
            order: { reportDate: 'DESC' }
        });
    }

    // Thống kê chi phí nhân sự theo phòng ban
    async getHRCostStatistics(month: number, year: number): Promise<any[]> {
        const departments = await this.departmentRepo.find();
        const results = [];

        for (const dept of departments) {
            const payrolls = await this.payrollRepo.find({
                where: {
                    user: { departmentId: dept.id },
                    month,
                    year
                }
            });

            const totalCost = payrolls.reduce((sum, p) => 
                sum + Number(p.baseSalary) + Number(p.totalAllowance) - Number(p.totalDeduction) + Number(p.bonus), 0
            );

            results.push({
                department: dept.name,
                totalEmployees: payrolls.length,
                totalCost,
                averageCost: payrolls.length > 0 ? totalCost / payrolls.length : 0
            });
        }

        return results;
    }

    // Thống kê tổng hợp cho dashboard
    async getDashboardData(month: number, year: number): Promise<any> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const currentDate = new Date();

        // Thực hiện tất cả các queries song song để tối ưu hiệu suất
        const [
            totalEmployees,
            departments,
            activeLeaves,
            currentTrainings,
            totalPayroll,
            performanceReviews
        ] = await Promise.all([
            // Tổng số nhân viên
            this.userRepo.count(),

            // Danh sách phòng ban
            this.departmentRepo.find(),

            // Đơn nghỉ phép đang active
            this.leaveRepo.find({
                where: {
                    startDate: LessThanOrEqual(currentDate),
                    endDate: MoreThanOrEqual(currentDate),
                    status: LeaveStatus.APPROVED
                },
                relations: ['user']
            }),

            // Khóa đào tạo đang diễn ra
            this.trainingRepo.find({
                where: {
                    completionDate: Between(startDate, endDate)
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
                    reviewDate: Between(startDate, endDate),
                    status: ReviewStatus.APPROVED
                },
                relations: ['employee']
            })
        ]);

        // Tính toán thống kê theo phòng ban
        const departmentStats = await Promise.all(
            departments.map(async dept => {
                const deptEmployees = await this.userRepo.count({ where: { departmentId: dept.id } });
                const deptPayroll = totalPayroll.filter(p => p.user.departmentId === dept.id);
                const deptLeaves = activeLeaves.filter(l => l.user.departmentId === dept.id);
                const deptTrainings = currentTrainings.filter(t => t.user.departmentId === dept.id);
                const deptReviews = performanceReviews.filter(r => r.employee.departmentId === dept.id);

                return {
                    departmentId: dept.id,
                    departmentName: dept.name,
                    employeeCount: deptEmployees,
                    activeLeaves: deptLeaves.length,
                    ongoingTrainings: deptTrainings.length,
                    averagePerformance: deptReviews.length > 0
                        ? deptReviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / deptReviews.length
                        : 100,
                    totalSalary: deptPayroll.reduce((sum, p) =>
                        sum + Number(p.baseSalary) + Number(p.totalAllowance) - Number(p.totalDeduction) + Number(p.bonus), 0
                    ),
                };
            })
        );

        // Trả về tất cả dữ liệu dashboard
        return {
            overview: {
                totalEmployees,
                totalDepartments: departments.length,
                activeLeaves: activeLeaves.length,
                currentTrainings: currentTrainings.length,
                totalSalary: totalPayroll.reduce((sum, p) =>
                    sum + Number(p.baseSalary) + Number(p.totalAllowance) - Number(p.totalDeduction) + Number(p.bonus), 0
                ),
                averagePerformance: performanceReviews.length > 0
                    ? performanceReviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / performanceReviews.length
                    : 100
            },
            departmentStats,
            leaveStats: {
                total: activeLeaves.length,
                details: activeLeaves.map(leave => ({
                    id: leave.id,
                    employeeName: leave.user.fullName,
                    departmentName: departments.find(d => d.id === leave.user.departmentId)?.name || 'Unknown',
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    reason: leave.reason
                }))
            },
            trainingStats: {
                total: currentTrainings.length,
                details: currentTrainings.map(training => ({
                    id: training.id,
                    employeeName: training.user.fullName,
                    departmentName: departments.find(d => d.id === training.user.departmentId)?.name || 'Unknown',
                    courseName: training.courseId.toString(), // Lưu ý: Có thể cần join với bảng Training Course
                    score: training.score,
                    completionDate: training.completionDate
                }))
            },
            payrollStats: {
                total: totalPayroll.reduce((sum, p) => 
                    sum + Number(p.baseSalary) + Number(p.totalAllowance) - Number(p.totalDeduction) + Number(p.bonus), 0
                ),
                departmentBreakdown: departmentStats.map(dept => ({
                    departmentName: dept.departmentName,
                    totalSalary: dept.totalSalary
                }))
            }
        };
    }
}

export const reportService = ReportService.getInstance();