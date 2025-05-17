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
const Performance_1 = require("../entities/performance/Performance");
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
                if (isCompanyWide && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) !== Role_1.RoleType.HR_STAFF && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.roleType) !== Role_1.RoleType.SYSTEM_ADMIN) {
                    res.status(403).json({
                        success: false,
                        message: 'Only HR staff or system admin can create company-wide plans'
                    });
                    return;
                }
                // Xử lý departmentIds
                let planDepartmentIds = [];
                if (!isCompanyWide) {
                    if (((_d = req.user) === null || _d === void 0 ? void 0 : _d.roleType) === Role_1.RoleType.DEPARTMENT_HEAD) {
                        // Nếu là manager, chỉ có thể tạo cho phòng ban của mình
                        planDepartmentIds = [req.user.departmentId];
                    }
                    else if (departmentIds && departmentIds.length > 0) {
                        // Nếu là admin/HR và có departmentIds, sử dụng chúng
                        planDepartmentIds = departmentIds;
                    }
                    else {
                        res.status(400).json({
                            success: false,
                            message: 'At least one department ID is required for non-company-wide plans'
                        });
                        return;
                    }
                }
                const plan = yield PerformanceService_1.performanceService.createPlan({
                    title,
                    description,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    departmentIds: planDepartmentIds.length > 0 ? planDepartmentIds : undefined,
                    createdBy: req.user.userId,
                    isCompanyWide: isCompanyWide || false,
                    criteria,
                    status: Performance_1.PlanStatus.ACTIVE
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                // Debug: Log thông tin người dùng và đánh giá
                console.log('User info:', {
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
                    roleType: (_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType,
                    departmentId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.departmentId
                });
                console.log('Review info:', {
                    reviewId: review.id,
                    employeeId: review.employeeId,
                    employeeDeptId: (_d = review.employee) === null || _d === void 0 ? void 0 : _d.departmentId,
                    employee: review.employee
                });
                // Kiểm tra quyền truy cập:
                // - Nếu là nhân viên, chỉ được xem đánh giá của chính mình
                // - Nếu là trưởng phòng, chỉ được xem đánh giá của nhân viên trong phòng
                // - Nếu là HR hoặc admin, được xem tất cả đánh giá
                const isOwnReview = ((_e = req.user) === null || _e === void 0 ? void 0 : _e.userId) === review.employeeId;
                const isManager = ((_f = req.user) === null || _f === void 0 ? void 0 : _f.roleType) === Role_1.RoleType.DEPARTMENT_HEAD;
                const isAdmin = ((_g = req.user) === null || _g === void 0 ? void 0 : _g.roleType) === Role_1.RoleType.SYSTEM_ADMIN || ((_h = req.user) === null || _h === void 0 ? void 0 : _h.roleType) === Role_1.RoleType.HR_STAFF;
                const isSameDepartment = ((_j = req.user) === null || _j === void 0 ? void 0 : _j.departmentId) === ((_k = review.employee) === null || _k === void 0 ? void 0 : _k.departmentId);
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
            var _a, _b, _c, _d;
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
                const isAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) === Role_1.RoleType.SYSTEM_ADMIN || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) === Role_1.RoleType.HR_STAFF;
                const isDepartmentHead = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.roleType) === Role_1.RoleType.DEPARTMENT_HEAD;
                // Admin can view all departments' reviews
                if (isAdmin) {
                    // Cho phép quản trị viên xem tất cả đánh giá của kế hoạch
                    const reviews = yield PerformanceService_1.performanceService.getAllReviewsForPlan(planId);
                    res.status(200).json({
                        success: true,
                        data: reviews
                    });
                    return;
                }
                else if (isDepartmentHead && ((_d = req.user) === null || _d === void 0 ? void 0 : _d.departmentId)) {
                    // Trưởng phòng chỉ được xem đánh giá của phòng mình
                    const reviews = yield PerformanceService_1.performanceService.getDepartmentReviews(req.user.departmentId, planId);
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
                // Kiểm tra tính hợp lệ của planId
                if (isNaN(planId) || planId <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid plan ID'
                    });
                    return;
                }
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
            var _a, _b, _c, _d;
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
                // Validate reviewId
                if (isNaN(reviewId)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid review ID'
                    });
                    return;
                }
                // Kiểm tra quyền truy cập trước khi xóa
                const review = yield PerformanceService_1.performanceService.getReviewDetails(reviewId);
                if (!review) {
                    res.status(404).json({
                        success: false,
                        message: 'Performance review not found'
                    });
                    return;
                }
                // Nếu là trưởng phòng, chỉ được xóa đánh giá của nhân viên trong phòng mình
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) === Role_1.RoleType.DEPARTMENT_HEAD && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.departmentId) !== ((_d = review.employee) === null || _d === void 0 ? void 0 : _d.departmentId)) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to delete this review'
                    });
                    return;
                }
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
    updatePlan(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verify user is HR staff or system admin
                const allowedRoles = [Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'Chỉ HR hoặc quản trị viên mới có quyền cập nhật kế hoạch đánh giá'
                    });
                    return;
                }
                const planId = parseInt(req.params.id);
                if (isNaN(planId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID kế hoạch không hợp lệ'
                    });
                    return;
                }
                const { title, description, startDate, endDate, criteria, departmentIds, isCompanyWide } = req.body;
                // Validate required fields
                if (!title || !description || !startDate || !endDate || !criteria) {
                    res.status(400).json({
                        success: false,
                        message: 'Thiếu thông tin bắt buộc'
                    });
                    return;
                }
                // Validate dates
                if (new Date(startDate) > new Date(endDate)) {
                    res.status(400).json({
                        success: false,
                        message: 'Ngày kết thúc phải sau ngày bắt đầu'
                    });
                    return;
                }
                // Validate criteria weights sum to 100
                const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
                if (totalWeight !== 100) {
                    res.status(400).json({
                        success: false,
                        message: 'Tổng trọng số tiêu chí phải bằng 100'
                    });
                    return;
                }
                // Validate departmentIds và isCompanyWide
                if (isCompanyWide && departmentIds && departmentIds.length > 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Kế hoạch toàn công ty không thể chỉ định phòng ban cụ thể'
                    });
                    return;
                }
                if (!isCompanyWide && (!departmentIds || departmentIds.length === 0)) {
                    res.status(400).json({
                        success: false,
                        message: 'Cần chỉ định ít nhất một phòng ban cho kế hoạch không phải toàn công ty'
                    });
                    return;
                }
                const updatedPlan = yield PerformanceService_1.performanceService.updatePlan(planId, {
                    title,
                    description,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    criteria,
                    departmentIds,
                    isCompanyWide
                });
                res.status(200).json({
                    success: true,
                    data: updatedPlan,
                    message: 'Cập nhật kế hoạch thành công'
                });
            }
            catch (error) {
                console.error('Lỗi cập nhật kế hoạch đánh giá:', error);
                if (error.message === 'Kế hoạch đánh giá không tồn tại' ||
                    error.message === 'End date must be after start date' ||
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
                    message: 'Lỗi server'
                });
            }
        });
    }
    updateReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // Verify user has permission (department manager, HR staff, or system admin)
                const allowedRoles = [Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN];
                if (!allowedRoles.includes((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType)) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền cập nhật đánh giá hiệu suất'
                    });
                    return;
                }
                const reviewId = parseInt(req.params.id);
                if (isNaN(reviewId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID đánh giá không hợp lệ'
                    });
                    return;
                }
                // Lấy thông tin đánh giá hiện tại để kiểm tra quyền
                const existingReview = yield PerformanceService_1.performanceService.getReviewDetails(reviewId);
                if (!existingReview) {
                    res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy đánh giá'
                    });
                    return;
                }
                // Nếu là trưởng phòng, kiểm tra xem đánh giá có thuộc nhân viên trong phòng của họ không
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) === Role_1.RoleType.DEPARTMENT_HEAD &&
                    ((_c = req.user) === null || _c === void 0 ? void 0 : _c.departmentId) !== ((_d = existingReview.employee) === null || _d === void 0 ? void 0 : _d.departmentId)) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền cập nhật đánh giá của nhân viên phòng khác'
                    });
                    return;
                }
                const { reviewDate, scores, comments, strengths, weaknesses, improvement } = req.body;
                // Kiểm tra trường bắt buộc
                if (!reviewDate || !scores) {
                    res.status(400).json({
                        success: false,
                        message: 'Thiếu thông tin bắt buộc'
                    });
                    return;
                }
                // Kiểm tra định dạng scores
                if (!Array.isArray(scores) || scores.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Điểm đánh giá không hợp lệ'
                    });
                    return;
                }
                // Cập nhật đánh giá
                const updatedReview = yield PerformanceService_1.performanceService.updateReview(reviewId, {
                    reviewDate: new Date(reviewDate),
                    scores,
                    comments,
                    strengths,
                    weaknesses,
                    improvement
                });
                res.status(200).json({
                    success: true,
                    data: updatedReview,
                    message: 'Cập nhật đánh giá thành công'
                });
            }
            catch (error) {
                console.error('Lỗi cập nhật đánh giá hiệu suất:', error);
                if (error.message === 'Performance review not found' ||
                    error.message === 'Cannot modify an approved review' ||
                    error.message.includes('Invalid criteria ID')) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                res.status(500).json({
                    success: false,
                    message: 'Lỗi server'
                });
            }
        });
    }
}
exports.performanceController = PerformanceController.getInstance();
