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
exports.performanceController = void 0;
const PerformanceService_1 = require("../services/PerformanceService");
const PerformancePlan_1 = require("../entities/performance/PerformancePlan");
const Role_1 = require("../entities/auth/Role");
class PerformanceController {
    static getInstance() {
        if (!PerformanceController.instance) {
            PerformanceController.instance = new PerformanceController();
        }
        return PerformanceController.instance;
    }
    createPlan(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // Verify user has permission (department manager, HR staff, or system admin)
                const allowedRoles = [Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to create performance plans'
                    });
                    return;
                }
                const { title, description, startDate, endDate, criteria, departmentId, isCompanyWide } = req.body;
                // Validate required fields
                if (!title || !description || !startDate || !endDate || !criteria) {
                    res.status(400).json({
                        success: false,
                        message: 'Missing required fields'
                    });
                    return;
                }
                // Kiểm tra quyền tạo kế hoạch toàn công ty (chỉ HR hoặc System Admin)
                if (isCompanyWide && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) !== Role_1.RoleType.HR_STAFF && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.roleType) !== Role_1.RoleType.SYSTEM_ADMIN) {
                    res.status(403).json({
                        success: false,
                        message: 'Only HR staff or system admin can create company-wide plans'
                    });
                    return;
                }
                // Determine which department ID to use:
                // If user is department head, use their department
                // If user is HR/Admin and departmentId is provided, use that
                let planDepartmentId = null;
                if (!isCompanyWide) {
                    if (((_d = req.user) === null || _d === void 0 ? void 0 : _d.roleType) === Role_1.RoleType.DEPARTMENT_HEAD) {
                        planDepartmentId = req.user.departmentId;
                    }
                    else if (departmentId) {
                        planDepartmentId = departmentId;
                    }
                    else {
                        res.status(400).json({
                            success: false,
                            message: 'Department ID is required for department-specific plans'
                        });
                        return;
                    }
                }
                const plan = yield PerformanceService_1.performanceService.createPlan({
                    title,
                    description,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    departmentId: planDepartmentId,
                    createdBy: req.user.userId,
                    isCompanyWide: isCompanyWide || false,
                    criteria,
                    status: PerformancePlan_1.PlanStatus.ACTIVE
                });
                res.status(201).json({
                    success: true,
                    data: plan,
                    message: 'Performance plan created successfully'
                });
            }
            catch (error) {
                console.error('Error creating performance plan:', error);
                if (error.message === 'End date must be after start date' ||
                    error.message === 'Criteria weights must sum to 100' ||
                    error.message === 'Company-wide plans cannot have a department ID' ||
                    error.message === 'Department ID is required for department-specific plans') {
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
        });
    }
    createReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user has permission (department manager, HR staff, or system admin)
                const allowedRoles = [Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to create performance reviews'
                    });
                    return;
                }
                const { planId, employeeId, reviewDate, scores, comments, improvement, strengths, weaknesses } = req.body;
                // Validate required fields
                if (!planId || !employeeId || !reviewDate || !scores) {
                    res.status(400).json({
                        success: false,
                        message: 'Missing required fields'
                    });
                    return;
                }
                const review = yield PerformanceService_1.performanceService.createReview({
                    planId,
                    employeeId,
                    reviewerId: req.user.userId,
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
            }
            catch (error) {
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
        });
    }
    getCompanyWidePlans(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const plans = yield PerformanceService_1.performanceService.getCompanyWidePlans();
                res.status(200).json({
                    success: true,
                    data: plans
                });
            }
            catch (error) {
                console.error('Error getting company-wide plans:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getDepartmentPlans(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user has a department
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.departmentId)) {
                    res.status(400).json({
                        success: false,
                        message: 'User is not assigned to any department'
                    });
                    return;
                }
                const plans = yield PerformanceService_1.performanceService.getDepartmentPlans(req.user.departmentId);
                res.status(200).json({
                    success: true,
                    data: plans
                });
            }
            catch (error) {
                console.error('Error getting department plans:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getAllDepartmentPlans(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // This endpoint is only accessible to HR staff and system admins (validated in routes)
                const plans = yield PerformanceService_1.performanceService.getAllDepartmentPlans();
                res.status(200).json({
                    success: true,
                    data: plans
                });
            }
            catch (error) {
                console.error('Error getting all department plans:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getEmployeeReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the current user's ID
                const employeeId = req.user.userId;
                // Get reviews for this employee
                const reviews = yield PerformanceService_1.performanceService.getEmployeeReviews(employeeId);
                res.status(200).json({
                    success: true,
                    data: reviews
                });
            }
            catch (error) {
                console.error('Error getting employee reviews:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getReviewDetails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
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
                const review = yield PerformanceService_1.performanceService.getReviewDetails(reviewId);
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
                const isOwnReview = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) === review.employeeId;
                const isManager = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) === Role_1.RoleType.DEPARTMENT_HEAD;
                const isAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.roleType) === Role_1.RoleType.SYSTEM_ADMIN || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.roleType) === Role_1.RoleType.HR_STAFF;
                const isSameDepartment = ((_e = req.user) === null || _e === void 0 ? void 0 : _e.departmentId) === ((_f = review.employee) === null || _f === void 0 ? void 0 : _f.departmentId);
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
            }
            catch (error) {
                console.error('Error getting review details:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getDepartmentReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user is department manager
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.departmentId) || req.user.roleType !== Role_1.RoleType.DEPARTMENT_HEAD) {
                    res.status(403).json({
                        success: false,
                        message: 'Only department managers can view all department reviews'
                    });
                    return;
                }
                const planId = parseInt(req.params.planId);
                const reviews = yield PerformanceService_1.performanceService.getDepartmentReviews(req.user.departmentId, planId);
                res.status(200).json({
                    success: true,
                    data: reviews
                });
            }
            catch (error) {
                console.error('Error getting department reviews:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getOverallDepartmentPerformance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Logic to fetch overall performance data will be in the service
                // For now, assume performanceService.getOverallDepartmentPerformance exists
                const overallPerformance = yield PerformanceService_1.performanceService.getOverallDepartmentPerformance();
                res.status(200).json({
                    success: true,
                    data: overallPerformance
                });
            }
            catch (error) {
                console.error('Error getting overall department performance:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    deletePlan(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user is department manager or HR staff or system admin
                const allowedRoles = [Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to delete performance plans'
                    });
                    return;
                }
                const planId = parseInt(req.params.id);
                const result = yield PerformanceService_1.performanceService.deletePlan(planId);
                if (result) {
                    res.status(200).json({
                        success: true,
                        message: 'Performance plan deleted successfully'
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to delete performance plan'
                    });
                }
            }
            catch (error) {
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
        });
    }
    deleteReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user is department manager or HR staff or system admin
                const allowedRoles = [Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to delete performance reviews'
                    });
                    return;
                }
                const reviewId = parseInt(req.params.id);
                const result = yield PerformanceService_1.performanceService.deleteReview(reviewId);
                if (result) {
                    res.status(200).json({
                        success: true,
                        message: 'Performance review deleted successfully'
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to delete performance review'
                    });
                }
            }
            catch (error) {
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
        });
    }
}
exports.performanceController = PerformanceController.getInstance();
