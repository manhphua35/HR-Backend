import { AppDataSource } from '../config/data-source';
import { PerformancePlan, PlanStatus } from '../entities/performance/PerformancePlan';
import { PerformanceReview, ReviewStatus } from '../entities/performance/PerformanceReview';
import { User } from '../entities/core/User';
import { Between, In } from 'typeorm';

interface CreatePlanData {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    departmentId: number;
    createdBy: number;
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

            // Create plan
            const plan = this.planRepository.create(data);

            await this.planRepository.save(plan);
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
            return await this.planRepository.find({
                where: { departmentId },
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getActivePlan(departmentId: number): Promise<PerformancePlan | null> {
        try {
            return await this.planRepository.findOne({
                where: {
                    departmentId,
                    status: PlanStatus.ACTIVE,
                    endDate: Between(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                }
            });
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
            // Get all employees in the department
            const employees = await this.userRepository.find({
                where: { departmentId }
            });

            return await this.reviewRepository.find({
                where: {
                    planId,
                    employeeId: In(employees.map(e => e.id))
                },
                relations: ['employee', 'reviewer'],
                order: { employeeId: 'ASC' }
            });
        } catch (error) {
            throw error;
        }
    }
}

export const performanceService = PerformanceService.getInstance();