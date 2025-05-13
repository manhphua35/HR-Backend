import { Request, Response } from 'express';
import { performanceService } from '../services/PerformanceService';
import { PlanStatus } from '../entities/performance/PerformancePlan';
import { ReviewStatus } from '../entities/performance/PerformanceReview';
import { RoleType } from '../entities/auth/Role';

class PerformanceController {
    private static instance: PerformanceController;

    public static getInstance(): PerformanceController {
        if (!PerformanceController.instance) {
            PerformanceController.instance = new PerformanceController();
        }
        return PerformanceController.instance;
    }

    public async createPlan(req: Request, res: Response): Promise<void> {
        try {
            // Verify user has permission (department manager, HR staff, or system admin)
            const allowedRoles = [RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN];
            if (!allowedRoles.includes(req.user?.roleType!)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to create performance plans'
                });
                return;
            }

            const { title, description, startDate, endDate, criteria, departmentId } = req.body;

            // Validate required fields
            if (!title || !description || !startDate || !endDate || !criteria) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            // Determine which department ID to use:
            // If user is department head, use their department
            // If user is HR/Admin and departmentId is provided, use that
            let planDepartmentId: number;

            if (req.user?.roleType === RoleType.DEPARTMENT_HEAD) {
                planDepartmentId = req.user.departmentId!;
            } else if (departmentId) {
                planDepartmentId = departmentId;
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Department ID is required for HR staff and system admins'
                });
                return;
            }

            const plan = await performanceService.createPlan({
                title,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                departmentId: planDepartmentId,
                createdBy: req.user!.userId,
                criteria
            });

            res.status(201).json({
                success: true,
                data: plan,
                message: 'Performance plan created successfully'
            });

        } catch (error: any) {
            console.error('Error creating performance plan:', error);

            if (error.message === 'End date must be after start date' ||
                error.message === 'Criteria weights must sum to 100') {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async createReview(req: Request, res: Response): Promise<void> {
        try {
            // Verify user has permission (department manager, HR staff, or system admin)
            const allowedRoles = [RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN];
            if (!allowedRoles.includes(req.user?.roleType!)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to create performance reviews'
                });
                return;
            }

            const {
                planId,
                employeeId,
                reviewDate,
                scores,
                comments,
                improvement,
                strengths,
                weaknesses
            } = req.body;

            // Validate required fields
            if (!planId || !employeeId || !reviewDate || !scores) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            const review = await performanceService.createReview({
                planId,
                employeeId,
                reviewerId: req.user!.userId,
                reviewDate: new Date(reviewDate),
                scores,
                comments,
                improvement,
                strengths,
                weaknesses
            });

            res.status(201).json({
                success: true,
                data: review,
                message: 'Performance review created successfully'
            });

        } catch (error: any) {
            console.error('Error creating performance review:', error);

            if (error.message === 'Performance plan not found' ||
                error.message === 'Performance plan is not active' ||
                error.message.startsWith('Invalid criteria ID')) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getDepartmentPlans(req: Request, res: Response): Promise<void> {
        try {
            // Verify user has a department
            if (!req.user?.departmentId) {
                res.status(400).json({
                    success: false,
                    message: 'User is not assigned to any department'
                });
                return;
            }

            const plans = await performanceService.getDepartmentPlans(req.user.departmentId);

            res.status(200).json({
                success: true,
                data: plans
            });

        } catch (error) {
            console.error('Error getting department plans:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getAllDepartmentPlans(req: Request, res: Response): Promise<void> {
        try {
            // This endpoint is only accessible to HR staff and system admins (validated in routes)
            const plans = await performanceService.getAllDepartmentPlans();

            res.status(200).json({
                success: true,
                data: plans
            });

        } catch (error) {
            console.error('Error getting all department plans:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getEmployeeReviews(req: Request, res: Response): Promise<void> {
        try {
            // Get the current user's ID
            const employeeId = req.user!.userId;
            
            // Get reviews for this employee
            const reviews = await performanceService.getEmployeeReviews(employeeId);

            res.status(200).json({
                success: true,
                data: reviews
            });

        } catch (error) {
            console.error('Error getting employee reviews:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getReviewDetails(req: Request, res: Response): Promise<void> {
        try {
            const reviewId = parseInt(req.params.reviewId);
            
            if (isNaN(reviewId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid review ID'
                });
                return;
            }
            
            // Lấy thông tin đánh giá
            const review = await performanceService.getReviewDetails(reviewId);
            
            if (!review) {
                res.status(404).json({
                    success: false,
                    message: 'Performance review not found'
                });
                return;
            }
            
            // Kiểm tra quyền truy cập:
            // - Nếu là nhân viên, chỉ được xem đánh giá của chính mình
            // - Nếu là trưởng phòng, chỉ được xem đánh giá của nhân viên trong phòng
            // - Nếu là HR hoặc admin, được xem tất cả đánh giá
            const isOwnReview = req.user?.userId === review.employeeId;
            const isManager = req.user?.roleType === RoleType.DEPARTMENT_HEAD;
            const isAdmin = req.user?.roleType === RoleType.SYSTEM_ADMIN || req.user?.roleType === RoleType.HR_STAFF;
            const isSameDepartment = req.user?.departmentId === review.employee?.departmentId;
            
            if (!isOwnReview && !isAdmin && !(isManager && isSameDepartment)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to view this review'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: review
            });
            
        } catch (error) {
            console.error('Error getting review details:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getDepartmentReviews(req: Request, res: Response): Promise<void> {
        try {
            // Verify user is department manager
            if (!req.user?.departmentId || req.user.roleType !== RoleType.DEPARTMENT_HEAD) {
                res.status(403).json({
                    success: false,
                    message: 'Only department managers can view all department reviews'
                });
                return;
            }

            const planId = parseInt(req.params.planId);
            const reviews = await performanceService.getDepartmentReviews(
                req.user.departmentId,
                planId
            );

            res.status(200).json({
                success: true,
                data: reviews
            });

        } catch (error) {
            console.error('Error getting department reviews:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getOverallDepartmentPerformance(req: Request, res: Response): Promise<void> {
        try {
            // Logic to fetch overall performance data will be in the service
            // For now, assume performanceService.getOverallDepartmentPerformance exists
            const overallPerformance = await performanceService.getOverallDepartmentPerformance();

            res.status(200).json({
                success: true,
                data: overallPerformance
            });

        } catch (error) {
            console.error('Error getting overall department performance:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async deletePlan(req: Request, res: Response): Promise<void> {
        try {
            // Verify user is department manager or HR staff or system admin
            const allowedRoles = [RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN];
            if (!allowedRoles.includes(req.user?.roleType!)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete performance plans'
                });
                return;
            }

            const planId = parseInt(req.params.id);
            const result = await performanceService.deletePlan(planId);

            if (result) {
                res.status(200).json({
                    success: true,
                    message: 'Performance plan deleted successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete performance plan'
                });
            }

        } catch (error: any) {
            console.error('Error deleting performance plan:', error);

            if (error.message === 'Performance plan not found') {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async deleteReview(req: Request, res: Response): Promise<void> {
        try {
            // Verify user is department manager or HR staff or system admin
            const allowedRoles = [RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN];
            if (!allowedRoles.includes(req.user?.roleType!)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete performance reviews'
                });
                return;
            }

            const reviewId = parseInt(req.params.id);
            const result = await performanceService.deleteReview(reviewId);

            if (result) {
                res.status(200).json({
                    success: true,
                    message: 'Performance review deleted successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete performance review'
                });
            }

        } catch (error: any) {
            console.error('Error deleting performance review:', error);

            if (error.message === 'Performance review not found') {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const performanceController = PerformanceController.getInstance();