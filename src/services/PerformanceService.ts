import { AppDataSource } from '../config/data-source';
import { PerformancePlan, PlanStatus, PerformanceReview, ReviewStatus } from '../entities/performance/Performance';
import { User } from '../entities/core/User';
import { Department } from '../entities/core/Department';
import { Between, In, IsNull } from 'typeorm';

interface CreatePlanData {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    departmentIds?: number[];
    createdBy: number;
    isCompanyWide?: boolean;
    status?: PlanStatus;
    criteria: {
        id: number;
        name: string;
        weight: number;
        description: string;
    }[];
}

interface CreateReviewData {
    planId: number;
    employeeId: number;
    reviewerId: number;
    reviewDate: Date;
    scores: {
        criteriaId: number;
        score: number;
        comment: string;
    }[];
    comments?: string;
    improvement?: string;
    strengths?: string;
    weaknesses?: string;
}

class PerformanceService {
    private static instance: PerformanceService;
    private planRepository = AppDataSource.getRepository(PerformancePlan);
    private reviewRepository = AppDataSource.getRepository(PerformanceReview);
    private userRepository = AppDataSource.getRepository(User);
    private departmentRepository = AppDataSource.getRepository(Department);

    public static getInstance(): PerformanceService {
        if (!PerformanceService.instance) {
            PerformanceService.instance = new PerformanceService();
        }
        return PerformanceService.instance;
    }

    public async createPlan(data: CreatePlanData): Promise<PerformancePlan> {
        try {
            // Validate dates
            if (data.startDate > data.endDate) {
                throw new Error('End date must be after start date');
            }

            // Validate criteria weights sum to 100
            const totalWeight = data.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
            if (totalWeight !== 100) {
                throw new Error('Criteria weights must sum to 100');
            }

            // Validate departmentIds và isCompanyWide
            if (data.isCompanyWide && data.departmentIds && data.departmentIds.length > 0) {
                throw new Error('Company-wide plans cannot have department IDs');
            }

            if (!data.isCompanyWide && (!data.departmentIds || data.departmentIds.length === 0)) {
                throw new Error('At least one department ID is required for non-company-wide plans');
            }
            
            // Create plan
            const plan = this.planRepository.create({
                title: data.title,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                createdBy: data.createdBy,
                criteria: data.criteria,
                status: data.status || PlanStatus.ACTIVE,
                isCompanyWide: data.isCompanyWide || false
            });

            // Lưu plan trước để có ID
            await this.planRepository.save(plan);
            
            // Nếu không phải company-wide thì thiết lập quan hệ với các phòng ban
            if (!data.isCompanyWide && data.departmentIds && data.departmentIds.length > 0) {
                const departments = await this.departmentRepository.findBy({
                    id: In(data.departmentIds)
                });
                
                if (departments.length !== data.departmentIds.length) {
                    throw new Error('Some department IDs are invalid');
                }
                
                plan.departments = departments;
                await this.planRepository.save(plan);
            }

            return plan;
        } catch (error) {
            throw error;
        }
    }

    public async createReview(data: CreateReviewData): Promise<PerformanceReview> {
        try {
            const plan = await this.planRepository.findOneBy({ id: data.planId });
            if (!plan) {
                throw new Error('Performance plan not found');
            }

            if (plan.status !== PlanStatus.ACTIVE) {
                throw new Error('Performance plan is not active');
            }

            // Calculate total score
            const totalScore = data.scores.reduce((sum, score) => {
                const criterion = plan.criteria.find(c => c.id === score.criteriaId);
                if (!criterion) {
                    throw new Error(`Invalid criteria ID: ${score.criteriaId}`);
                }
                return sum + (score.score * criterion.weight / 100);
            }, 0);

            // Create review
            const review = this.reviewRepository.create({
                ...data,
                status: ReviewStatus.DRAFT,
                totalScore
            });

            await this.reviewRepository.save(review);
            return review;

        } catch (error) {
            throw error;
        }
    }

    public async updateReviewStatus(
        reviewId: number,
        status: ReviewStatus,
        reviewerId: number
    ): Promise<PerformanceReview> {
        try {
            const review = await this.reviewRepository.findOneBy({ id: reviewId });
            if (!review) {
                throw new Error('Performance review not found');
            }

            if (review.status === ReviewStatus.APPROVED) {
                throw new Error('Cannot modify an approved review');
            }

            review.status = status;
            if (status === ReviewStatus.APPROVED || status === ReviewStatus.REJECTED) {
                review.reviewerId = reviewerId;
            }

            await this.reviewRepository.save(review);
            return review;

        } catch (error) {
            throw error;
        }
    }

    public async getDepartmentPlans(departmentId: number): Promise<PerformancePlan[]> {
        try {
            // Lấy cả kế hoạch của phòng ban cụ thể và kế hoạch toàn công ty
            const plans = await this.planRepository
                .createQueryBuilder("plan")
                .leftJoinAndSelect("plan.departments", "department")
                .leftJoinAndSelect("plan.creator", "creator")
                .where("plan.isCompanyWide = :isCompanyWide", { isCompanyWide: true })
                .orWhere(qb => {
                    const subQuery = qb
                        .subQuery()
                        .select("pd.plan_id")
                        .from("performance_plan_departments", "pd")
                        .where("pd.department_id = :departmentId", { departmentId })
                        .getQuery();
                    return "plan.id IN " + subQuery;
                })
                .orderBy("plan.createdAt", "DESC")
                .getMany();
                
            return plans;
        } catch (error) {
            throw error;
        }
    }

    public async getAllDepartmentPlans(): Promise<PerformancePlan[]> {
        try {
            // Fetch plans from all departments with department information
            return await this.planRepository.find({
                relations: ['departments', 'creator'],
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getCompanyWidePlans(): Promise<PerformancePlan[]> {
        try {
            return await this.planRepository.find({
                where: { isCompanyWide: true },
                relations: ['creator'],
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getActivePlan(departmentId?: number): Promise<PerformancePlan | null> {
        try {
            // Nếu có departmentId, tìm kế hoạch cho phòng ban đó hoặc kế hoạch toàn công ty
            if (departmentId) {
                return await this.planRepository
                    .createQueryBuilder("plan")
                    .leftJoinAndSelect("plan.departments", "department")
                    .where("plan.isCompanyWide = :isCompanyWide", { isCompanyWide: true })
                    .andWhere("plan.status = :status", { status: PlanStatus.ACTIVE })
                    .andWhere("plan.endDate >= :now", { now: new Date() })
                    .andWhere("plan.endDate <= :maxDate", { 
                        maxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) 
                    })
                    .orWhere(qb => {
                        const subQuery = qb
                            .subQuery()
                            .select("pd.plan_id")
                            .from("performance_plan_departments", "pd")
                            .where("pd.department_id = :departmentId", { departmentId })
                            .getQuery();
                        return "plan.id IN " + subQuery;
                    })
                    .andWhere("plan.status = :status", { status: PlanStatus.ACTIVE })
                    .andWhere("plan.endDate >= :now", { now: new Date() })
                    .andWhere("plan.endDate <= :maxDate", { 
                        maxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) 
                    })
                    .orderBy("plan.createdAt", "DESC")
                    .getOne();
            } 
            // Nếu không có departmentId, chỉ tìm kế hoạch toàn công ty
            else {
                return await this.planRepository.findOne({
                    where: {
                        isCompanyWide: true,
                        status: PlanStatus.ACTIVE,
                        endDate: Between(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                    }
                });
            }
        } catch (error) {
            throw error;
        }
    }

    public async getEmployeeReviews(employeeId: number): Promise<PerformanceReview[]> {
        try {
            return await this.reviewRepository.find({
                where: { employeeId },
                relations: ['plan', 'reviewer'],
                order: { reviewDate: 'DESC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getDepartmentReviews(
        departmentId: number,
        planId: number
    ): Promise<PerformanceReview[]> {
        try {
            const reviews = await this.reviewRepository.find({
                where: {
                    employee: { departmentId },
                    planId
                },
                relations: ['employee', 'reviewer', 'plan']
            });
            return reviews;
        } catch (error) {
            throw error;
        }
    }

    public async getAllReviewsForPlan(planId: number): Promise<PerformanceReview[]> {
        try {
            const reviews = await this.reviewRepository.find({
                where: { planId },
                relations: ['employee', 'reviewer', 'plan']
            });
            return reviews;
        } catch (error) {
            throw error;
        }
    }

    public async getOverallDepartmentPerformance(): Promise<any[]> { // Return type might need adjustment based on desired output
        try {
            // Fetch all approved reviews with employee and department info
            const reviews = await this.reviewRepository.find({
                where: { status: ReviewStatus.APPROVED },
                relations: ['employee', 'employee.department', 'plan'], // Include department relation
                order: { reviewDate: 'DESC' } // Order by date only for now
            });

            // Group or process data as needed. For now, return raw reviews with department info.
            // Example processing: Group by department
            const performanceByDepartment: { [key: string]: any[] } = {};
            reviews.forEach(review => {
                const deptName = review.employee?.department?.name || 'Unknown Department';
                if (!performanceByDepartment[deptName]) {
                    performanceByDepartment[deptName] = [];
                }
                // Optionally simplify the returned review object
                performanceByDepartment[deptName].push({
                    reviewId: review.id,
                    employeeName: review.employee?.fullName, // Use fullName
                    planTitle: review.plan?.title,
                    reviewDate: review.reviewDate,
                    totalScore: review.totalScore,
                    // Add other relevant fields
                });
            });

            // Return the grouped data or the raw list depending on requirements
            // Returning grouped data for this example:
             return Object.entries(performanceByDepartment).map(([department, reviews]) => ({
                 department,
                 reviews
             }));

            // Or return the raw list:
            // return reviews;

        } catch (error) {
            console.error('Error fetching overall department performance:', error);
            throw error; // Re-throw the error to be caught by the controller
        }
    }

    public async deletePlan(id: number): Promise<boolean> {
        try {
            // Kiểm tra kế hoạch có tồn tại không
            const plan = await this.planRepository.findOneBy({ id });
            if (!plan) {
                console.log(`Performance plan with ID ${id} not found`);
                return false; // Thay vì ném lỗi, trả về false để controller xử lý
            }

            // Lấy tất cả reviews liên quan đến plan này
            const reviews = await this.reviewRepository.find({
                where: { planId: id }
            });

            // Xóa tất cả reviews liên quan trước
            if (reviews.length > 0) {
                await this.reviewRepository.delete({ planId: id });
            }

            // Sau đó xóa plan
            const result = await this.planRepository.delete(id);
            return result.affected === 1;
        } catch (error) {
            console.error(`Error deleting performance plan with ID ${id}:`, error);
            throw error;
        }
    }

    public async deleteReview(id: number): Promise<boolean> {
        try {
            const review = await this.reviewRepository.findOneBy({ id });
            if (!review) {
                throw new Error('Performance review not found');
            }

            const result = await this.reviewRepository.delete(id);
            return result.affected === 1;
        } catch (error) {
            throw error;
        }
    }

    public async getReviewDetails(reviewId: number): Promise<PerformanceReview | null> {
        try {
            return await this.reviewRepository.findOne({
                where: { id: reviewId },
                relations: [
                    'plan', 
                    'employee', 
                    'reviewer', 
                    'employee.department', 
                    'employee.user',
                    'reviewer.department'
                ],
            });
        } catch (error) {
            console.error('Error fetching review details:', error);
            throw error;
        }
    }
}

export const performanceService = PerformanceService.getInstance();