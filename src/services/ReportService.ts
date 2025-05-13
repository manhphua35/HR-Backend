import { AppDataSource } from '../config/data-source';
import { DepartmentReport } from '../entities/report/DepartmentReport';
import { Department } from '../entities/core/Department';
import { User } from '../entities/core/User';
import { Payroll } from '../entities/payroll/Payroll';
import { Leave, LeaveStatus } from '../entities/leave/Leave';
import { TrainingCourse } from '../entities/training/TrainingCourse';
import { PerformanceReview, ReviewStatus } from '../entities/performance/PerformanceReview';
import { Between, LessThanOrEqual, MoreThanOrEqual, In, IsNull, MoreThan } from 'typeorm';
import { Attendance } from '../entities/attendance/Attendance';

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

    async getEmployeeDashboardData(employeeId: number, month: number, year: number): Promise<any> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the given month

        // Lấy thông tin nhân viên
        const employee = await this.userRepo.findOne({
            where: { id: employeeId },
            relations: ['department', 'position']
        });

        if (!employee) {
            throw new Error('Không tìm thấy nhân viên');
        }

        // Lấy dữ liệu chấm công
        const attendances = await this.findAttendances(employee.id, startDate, endDate);
        const totalWorkDays = this.getWorkDaysInMonth(month, year);
        const presentDays = attendances.filter(a => a.status === 'PRESENT').length;
        const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
        const lateDays = attendances.filter(a => a.status === 'LATE').length;

        // Lấy thông tin nghỉ phép
        const leaves = await this.leaveRepo.find({
            where: {
                user: { id: employee.id }
            }
        });
        
        const usedLeaveDays = leaves
            .filter(leave => leave.status === LeaveStatus.APPROVED && leave.startDate && leave.endDate)
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
                } else {
                    console.warn(`Skipping leave ID ${leave.id} due to invalid dates: start=${leave.startDate}, end=${leave.endDate}`);
                    return total; // Skip this leave record if dates are invalid
                }
            }, 0);
        
        const pendingLeaves = leaves.filter(leave => leave.status === LeaveStatus.PENDING).length;

        // Lấy payroll gần nhất
        const payroll = await this.payrollRepo.findOne({
            where: {
                user: { id: employee.id },
                month,
                year
            }
        });

        // Lấy khóa đào tạo đang diễn ra
        const trainings = await this.trainingRepo.find({
            where: {
                user: { id: employee.id },
                startDate: LessThanOrEqual(endDate),
                endDate: MoreThanOrEqual(startDate)
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
        const review = await this.performanceRepo.findOne({
            where: {
                employee: { id: employee.id },
                status: ReviewStatus.APPROVED
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
                    strengths: review.strengths?.split(',').map(s => s.trim()) || [],
                    improvements: review.improvement?.split(',').map(s => s.trim()) || []
                };
            } else {
                 console.warn(`Skipping performance review ID ${review.id} for plan ${review.plan.id} due to invalid plan dates: start=${review.plan.startDate}, end=${review.plan.endDate}`);
            }
        }

        return {
            employee: {
                id: employee.id,
                fullName: employee.fullName,
                email: employee.email,
                department: employee.department?.name,
                position: employee.position?.title
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
    }

    private getWorkDaysInMonth(month: number, year: number): number {
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

    private async findAttendances(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
        const attendanceRepository = AppDataSource.getRepository(Attendance);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        try {
            return await attendanceRepository.find({
                where: {
                    user: { id: userId },
                    date: Between(startDateStr, endDateStr)
                }
            });
        } catch (error) {
            console.error('Error fetching attendances:', error);
            return [];
        }
    }
}

export const reportService = ReportService.getInstance();