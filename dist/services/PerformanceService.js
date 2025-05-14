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
exports.performanceService = void 0;
const data_source_1 = require("../config/data-source");
const PerformancePlan_1 = require("../entities/performance/PerformancePlan");
const PerformanceReview_1 = require("../entities/performance/PerformanceReview");
const User_1 = require("../entities/core/User");
const Department_1 = require("../entities/core/Department"); // Import Department
const typeorm_1 = require("typeorm");
class PerformanceService {
    constructor() {
        this.planRepository = data_source_1.AppDataSource.getRepository(PerformancePlan_1.PerformancePlan);
        this.reviewRepository = data_source_1.AppDataSource.getRepository(PerformanceReview_1.PerformanceReview);
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        this.departmentRepository = data_source_1.AppDataSource.getRepository(Department_1.Department);
    }
    static getInstance() {
        if (!PerformanceService.instance) {
            PerformanceService.instance = new PerformanceService();
        }
        return PerformanceService.instance;
    }
    createPlan(data) {
        return __awaiter(this, void 0, void 0, function* () {
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
                // Validate company-wide and departmentId
                if (data.isCompanyWide && data.departmentId) {
                    throw new Error('Company-wide plans cannot have a department ID');
                }
                if (!data.isCompanyWide && !data.departmentId) {
                    throw new Error('Department ID is required for department-specific plans');
                }
                // Create plan
                const plan = this.planRepository.create(Object.assign(Object.assign({}, data), { departmentId: data.isCompanyWide ? null : data.departmentId, status: data.status || PerformancePlan_1.PlanStatus.ACTIVE // Mặc định là ACTIVE
                 }));
                yield this.planRepository.save(plan);
                return plan;
            }
            catch (error) {
                throw error;
            }
        });
    }
    createReview(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const plan = yield this.planRepository.findOneBy({ id: data.planId });
                if (!plan) {
                    throw new Error('Performance plan not found');
                }
                if (plan.status !== PerformancePlan_1.PlanStatus.ACTIVE) {
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
                const review = this.reviewRepository.create(Object.assign(Object.assign({}, data), { status: PerformanceReview_1.ReviewStatus.DRAFT, totalScore }));
                yield this.reviewRepository.save(review);
                return review;
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateReviewStatus(reviewId, status, reviewerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const review = yield this.reviewRepository.findOneBy({ id: reviewId });
                if (!review) {
                    throw new Error('Performance review not found');
                }
                if (review.status === PerformanceReview_1.ReviewStatus.APPROVED) {
                    throw new Error('Cannot modify an approved review');
                }
                review.status = status;
                if (status === PerformanceReview_1.ReviewStatus.APPROVED || status === PerformanceReview_1.ReviewStatus.REJECTED) {
                    review.reviewerId = reviewerId;
                }
                yield this.reviewRepository.save(review);
                return review;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getDepartmentPlans(departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lấy cả kế hoạch của phòng ban cụ thể và kế hoạch toàn công ty
                return yield this.planRepository.find({
                    where: [
                        { departmentId },
                        { isCompanyWide: true }
                    ],
                    relations: ['department', 'creator'],
                    order: { createdAt: 'DESC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllDepartmentPlans() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch plans from all departments with department information
                return yield this.planRepository.find({
                    relations: ['department', 'creator'],
                    order: { createdAt: 'DESC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getCompanyWidePlans() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.planRepository.find({
                    where: { isCompanyWide: true },
                    relations: ['creator'],
                    order: { createdAt: 'DESC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getActivePlan(departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Nếu có departmentId, tìm kế hoạch cho phòng ban đó hoặc kế hoạch toàn công ty
                if (departmentId) {
                    return yield this.planRepository.findOne({
                        where: [
                            {
                                departmentId,
                                status: PerformancePlan_1.PlanStatus.ACTIVE,
                                endDate: (0, typeorm_1.Between)(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                            },
                            {
                                isCompanyWide: true,
                                status: PerformancePlan_1.PlanStatus.ACTIVE,
                                endDate: (0, typeorm_1.Between)(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                            }
                        ],
                        order: { createdAt: 'DESC' }
                    });
                }
                // Nếu không có departmentId, chỉ tìm kế hoạch toàn công ty
                else {
                    return yield this.planRepository.findOne({
                        where: {
                            isCompanyWide: true,
                            status: PerformancePlan_1.PlanStatus.ACTIVE,
                            endDate: (0, typeorm_1.Between)(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                        }
                    });
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    getEmployeeReviews(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.reviewRepository.find({
                    where: { employeeId },
                    relations: ['plan', 'reviewer'],
                    order: { reviewDate: 'DESC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getDepartmentReviews(departmentId, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get plan to check if it's company-wide
                const plan = yield this.planRepository.findOneBy({ id: planId });
                if (!plan) {
                    throw new Error('Performance plan not found');
                }
                // Get all employees in the department
                const employees = yield this.userRepository.find({
                    where: { departmentId }
                });
                return yield this.reviewRepository.find({
                    where: {
                        planId,
                        employeeId: (0, typeorm_1.In)(employees.map(e => e.id))
                    },
                    relations: ['employee', 'reviewer'],
                    order: { employeeId: 'ASC' }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getOverallDepartmentPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch all approved reviews with employee and department info
                const reviews = yield this.reviewRepository.find({
                    where: { status: PerformanceReview_1.ReviewStatus.APPROVED },
                    relations: ['employee', 'employee.department', 'plan'], // Include department relation
                    order: { reviewDate: 'DESC' } // Order by date only for now
                });
                // Group or process data as needed. For now, return raw reviews with department info.
                // Example processing: Group by department
                const performanceByDepartment = {};
                reviews.forEach(review => {
                    var _a, _b, _c, _d;
                    const deptName = ((_b = (_a = review.employee) === null || _a === void 0 ? void 0 : _a.department) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Department';
                    if (!performanceByDepartment[deptName]) {
                        performanceByDepartment[deptName] = [];
                    }
                    // Optionally simplify the returned review object
                    performanceByDepartment[deptName].push({
                        reviewId: review.id,
                        employeeName: (_c = review.employee) === null || _c === void 0 ? void 0 : _c.fullName, // Use fullName
                        planTitle: (_d = review.plan) === null || _d === void 0 ? void 0 : _d.title,
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
            }
            catch (error) {
                console.error('Error fetching overall department performance:', error);
                throw error; // Re-throw the error to be caught by the controller
            }
        });
    }
    deletePlan(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const plan = yield this.planRepository.findOneBy({ id });
                if (!plan) {
                    throw new Error('Performance plan not found');
                }
                const result = yield this.planRepository.delete(id);
                return result.affected === 1;
            }
            catch (error) {
                throw error;
            }
        });
    }
    deleteReview(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const review = yield this.reviewRepository.findOneBy({ id });
                if (!review) {
                    throw new Error('Performance review not found');
                }
                const result = yield this.reviewRepository.delete(id);
                return result.affected === 1;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getReviewDetails(reviewId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.reviewRepository.findOne({
                    where: { id: reviewId },
                    relations: ['plan', 'employee', 'reviewer', 'employee.department'],
                });
            }
            catch (error) {
                console.error('Error fetching review details:', error);
                throw error;
            }
        });
    }
}
exports.performanceService = PerformanceService.getInstance();
