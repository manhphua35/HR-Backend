import { AppDataSource } from '../config/data-source';
import { DepartmentReport } from '../entities/report/DepartmentReport';
import { Department } from '../entities/core/Department';
import { User } from '../entities/core/User';
import { Payroll } from '../entities/payroll/Payroll';
import { Leave, LeaveStatus } from '../entities/leave/Leave';
import { TrainingCourse } from '../entities/training/TrainingCourse';
import { PerformanceReview, ReviewStatus } from '../entities/performance/PerformanceReview';
import { Between, LessThanOrEqual, MoreThanOrEqual, In, IsNull, MoreThan } from 'typeorm';

class ReportService {
    private static instance: ReportService;
    private departmentRepo = AppDataSource.getRepository(Department);
    private userRepo = AppDataSource.getRepository(User);
    private payrollRepo = AppDataSource.getRepository(Payroll);
    private leaveRepo = AppDataSource.getRepository(Leave);
    private trainingRepo = AppDataSource.getRepository(TrainingCourse);
    private performanceRepo = AppDataSource.getRepository(PerformanceReview);
    private reportRepo = AppDataSource.getRepository(DepartmentReport);

    private constructor() {}

    public static getInstance(): ReportService {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }

    // Tạo báo cáo cho toàn công ty
    async generateCompanyReport(startDate: Date, endDate: Date): Promise<DepartmentReport[]> {
        const departments = await this.departmentRepo.find();
        const reports: DepartmentReport[] = [];

        for (const dept of departments) {
            try {
                const report = await this.generateDepartmentReport(dept.id, startDate, endDate);
                reports.push(report);
            } catch (error) {
                console.error(`Error generating report for department ${dept.id}:`, error);
            }
        }

        return reports;
    }

    // Tạo báo cáo phòng ban
    async generateDepartmentReport(departmentId: number, startDate: Date, endDate: Date): Promise<DepartmentReport> {
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

        // Đếm nhân viên nghỉ việc
        const resignedEmployees = await this.userRepo.count({
            where: {
                departmentId,
                resignationDate: Between(startDate, endDate)
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
                month: startDate.getMonth() + 1,
                year: startDate.getFullYear()
            }
        });
        const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.baseSalary), 0);
        const totalAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalAllowance), 0);
        const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeduction), 0);

        // Lấy danh sách người dùng trong phòng ban
        const users = await this.userRepo.find({
            where: { departmentId }
        });
        const userIds = users.map(u => u.id);

        // Tính giờ đào tạo
        const trainings = await this.trainingRepo.find({
            where: {
                userId: In(userIds),
                completionDate: Between(startDate, endDate)
            }
        });
        const totalTrainingHours = trainings.length * 8;

        // Tính điểm đánh giá trung bình
        const reviews = await this.performanceRepo.find({
            where: {
                employee: { departmentId },
                reviewDate: Between(startDate, endDate)
            }
        });
        const averageRating = reviews.length > 0
            ? Number((reviews.reduce((sum, r) => sum + Number(r.totalScore), 0) / reviews.length).toFixed(2))
            : 0;

        // Tạo báo cáo mới
        const report = new DepartmentReport();
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

        return await this.reportRepo.save(report);
    }

    // Lấy báo cáo theo khoảng thời gian
    async getDepartmentReports(departmentId: number | null, startDate: Date, endDate: Date): Promise<DepartmentReport[]> {
        // Nếu không có departmentId (null), lấy tất cả báo cáo phòng ban trong khoảng thời gian
        if (departmentId === null) {
            return await this.reportRepo.find({
                where: {
                    reportDate: Between(startDate, endDate)
                },
                order: { reportDate: 'DESC' }
            });
        }
        
        // Nếu có departmentId, lấy báo cáo của phòng ban cụ thể
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
        const periodEndDate = new Date(year, month, 0); // Last day of the given month

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

            const activeEmployeesInDept = await this.userRepo.count({
                where: [
                    {
                        departmentId: dept.id,
                        isActive: true,
                        hireDate: LessThanOrEqual(periodEndDate),
                        resignationDate: IsNull()
                    },
                    {
                        departmentId: dept.id,
                        isActive: true,
                        hireDate: LessThanOrEqual(periodEndDate),
                        resignationDate: MoreThan(periodEndDate)
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
    }

    // Thống kê tổng hợp cho dashboard
    async getDashboardData(month: number, year: number): Promise<any> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the given month
        const currentDate = new Date();

        // Thực hiện tất cả các queries song song để tối ưu hiệu suất
        const [
            totalActiveEmployees, // Renamed from totalEmployees for clarity
            departments,
            activeLeaves,
            currentTrainings,
            totalPayroll,
            performanceReviews
        ] = await Promise.all([
            // Tổng số nhân viên còn làm việc
            this.userRepo.count({
                where: [
                    {
                        isActive: true,
                        hireDate: LessThanOrEqual(endDate),
                        resignationDate: IsNull()
                    },
                    {
                        isActive: true,
                        hireDate: LessThanOrEqual(endDate),
                        resignationDate: MoreThan(endDate)
                    }
                ]
            }),

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
                const activeDeptEmployees = await this.userRepo.count({
                    where: [
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: LessThanOrEqual(endDate),
                            resignationDate: IsNull()
                        },
                        {
                            departmentId: dept.id,
                            isActive: true,
                            hireDate: LessThanOrEqual(endDate),
                            resignationDate: MoreThan(endDate)
                        }
                    ]
                });
                const deptPayroll = totalPayroll.filter(p => p.user?.departmentId === dept.id);
                const deptLeaves = activeLeaves.filter(l => l.user?.departmentId === dept.id);
                const deptTrainings = currentTrainings.filter(t => t.user?.departmentId === dept.id);
                const deptReviews = performanceReviews.filter(r => r.employee?.departmentId === dept.id);
                
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
            })
        );

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
    }
}

export const reportService = ReportService.getInstance();