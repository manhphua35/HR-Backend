import { Request, Response } from 'express';
import { performanceService } from '../services/PerformanceService';
import { PlanStatus } from '../entities/performance/Performance';
import { ReviewStatus } from '../entities/performance/Performance';
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

            const { title, description, startDate, endDate, criteria, departmentIds, isCompanyWide } = req.body;

            // Validate required fields
            if (!title || !description || !startDate || !endDate || !criteria) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            // Kiểm tra quyền tạo kế hoạch toàn công ty (chỉ HR hoặc System Admin)
            if (isCompanyWide && req.user?.roleType !== RoleType.HR_STAFF && req.user?.roleType !== RoleType.SYSTEM_ADMIN) {
                res.status(403).json({
                    success: false,
                    message: 'Only HR staff or system admin can create company-wide plans'
                });
                return;
            }

            // Xử lý departmentIds
            let planDepartmentIds: number[] = [];

            if (!isCompanyWide) {
                if (req.user?.roleType === RoleType.DEPARTMENT_HEAD) {
                    // Nếu là manager, chỉ có thể tạo cho phòng ban của mình
                    planDepartmentIds = [req.user.departmentId!];
                } else if (departmentIds && departmentIds.length > 0) {
                    // Nếu là admin/HR và có departmentIds, sử dụng chúng
                    planDepartmentIds = departmentIds;
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'At least one department ID is required for non-company-wide plans'
                    });
                    return;
                }
            }

            const plan = await performanceService.createPlan({
                title,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                departmentIds: planDepartmentIds.length > 0 ? planDepartmentIds : undefined,
                createdBy: req.user!.userId,
                isCompanyWide: isCompanyWide || false,
                criteria,
                status: PlanStatus.ACTIVE
            });

            res.status(201).json({
                success: true,
                data: plan,
                message: 'Performance plan created successfully'
            });

        } catch (error: any) {
            console.error('Error creating performance plan:', error);

            if (error.message === 'End date must be after start date' ||
                error.message === 'Criteria weights must sum to 100' ||
                error.message === 'Company-wide plans cannot have department IDs' ||
                error.message === 'At least one department ID is required for non-company-wide plans' ||
                error.message === 'Some department IDs are invalid') {
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

    public async getCompanyWidePlans(req: Request, res: Response): Promise<void> {
        try {
            const plans = await performanceService.getCompanyWidePlans();

            res.status(200).json({
                success: true,
                data: plans
            });
        } catch (error) {
            console.error('Error getting company-wide plans:', error);
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
            
            // Debug: Log thông tin người dùng và đánh giá
            console.log('User info:', {
                userId: req.user?.userId, 
                roleType: req.user?.roleType,
                departmentId: req.user?.departmentId
            });
            console.log('Review info:', {
                reviewId: review.id,
                employeeId: review.employeeId, 
                employeeDeptId: review.employee?.departmentId,
                employee: review.employee
            });
            
            // Kiểm tra quyền truy cập:
            // - Nếu là nhân viên, chỉ được xem đánh giá của chính mình
            // - Nếu là trưởng phòng, chỉ được xem đánh giá của nhân viên trong phòng
            // - Nếu là HR hoặc admin, được xem tất cả đánh giá
            const isOwnReview = req.user?.userId === review.employeeId;
            const isManager = req.user?.roleType === RoleType.DEPARTMENT_HEAD;
            const isAdmin = req.user?.roleType === RoleType.SYSTEM_ADMIN || req.user?.roleType === RoleType.HR_STAFF;
            const isSameDepartment = req.user?.departmentId === review.employee?.departmentId;
            
            console.log('Access check:', {
                isOwnReview,
                isManager, 
                isAdmin, 
                isSameDepartment,
                condition: !isOwnReview && !isAdmin && !(isManager && isSameDepartment)
            });
            
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
            const planId = parseInt(req.params.planId);
            
            if (isNaN(planId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid plan ID'
                });
                return;
            }
            
            // Check if user has appropriate permissions
            const isAdmin = req.user?.roleType === RoleType.SYSTEM_ADMIN || req.user?.roleType === RoleType.HR_STAFF;
            const isDepartmentHead = req.user?.roleType === RoleType.DEPARTMENT_HEAD;
            
            // Admin can view all departments' reviews
            if (isAdmin) {
                // Cho phép quản trị viên xem tất cả đánh giá của kế hoạch
                const reviews = await performanceService.getAllReviewsForPlan(planId);
                
                res.status(200).json({
                    success: true,
                    data: reviews
                });
                return;
            } else if (isDepartmentHead && req.user?.departmentId) {
                // Trưởng phòng chỉ được xem đánh giá của phòng mình
                const reviews = await performanceService.getDepartmentReviews(
                    req.user.departmentId,
                    planId
                );
                
                res.status(200).json({
                    success: true,
                    data: reviews
                });
                return;
            }
            
            // Không phải admin hoặc trưởng phòng
            res.status(403).json({
                success: false,
                message: 'Insufficient role permissions'
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
            
            // Kiểm tra tính hợp lệ của planId
            if (isNaN(planId) || planId <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid plan ID'
                });
                return;
            }
            
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
            
            // Validate reviewId
            if (isNaN(reviewId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid review ID'
                });
                return;
            }
            
            // Kiểm tra quyền truy cập trước khi xóa
            const review = await performanceService.getReviewDetails(reviewId);
            
            if (!review) {
                res.status(404).json({
                    success: false,
                    message: 'Performance review not found'
                });
                return;
            }
            
            // Nếu là trưởng phòng, chỉ được xóa đánh giá của nhân viên trong phòng mình
            if (req.user?.roleType === RoleType.DEPARTMENT_HEAD && req.user?.departmentId !== review.employee?.departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this review'
                });
                return;
            }
            
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