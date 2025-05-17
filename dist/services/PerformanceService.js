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
const Performance_1 = require("../entities/performance/Performance");
const User_1 = require("../entities/core/User");
const Department_1 = require("../entities/core/Department");
const typeorm_1 = require("typeorm");
class PerformanceService {
    constructor() {
        this.planRepository = data_source_1.AppDataSource.getRepository(Performance_1.PerformancePlan);
        this.reviewRepository = data_source_1.AppDataSource.getRepository(Performance_1.PerformanceReview);
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
                    status: data.status || Performance_1.PlanStatus.ACTIVE,
                    isCompanyWide: data.isCompanyWide || false
                });
                // Lưu plan trước để có ID
                yield this.planRepository.save(plan);
                // Nếu không phải company-wide thì thiết lập quan hệ với các phòng ban
                if (!data.isCompanyWide && data.departmentIds && data.departmentIds.length > 0) {
                    const departments = yield this.departmentRepository.findBy({
                        id: (0, typeorm_1.In)(data.departmentIds)
                    });
                    if (departments.length !== data.departmentIds.length) {
                        throw new Error('Some department IDs are invalid');
                    }
                    plan.departments = departments;
                    yield this.planRepository.save(plan);
                }
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
                if (plan.status !== Performance_1.PlanStatus.ACTIVE) {
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
                const review = this.reviewRepository.create(Object.assign(Object.assign({}, data), { status: Performance_1.ReviewStatus.DRAFT, totalScore }));
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
                if (review.status === Performance_1.ReviewStatus.APPROVED) {
                    throw new Error('Cannot modify an approved review');
                }
                review.status = status;
                if (status === Performance_1.ReviewStatus.APPROVED || status === Performance_1.ReviewStatus.REJECTED) {
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
                const plans = yield this.planRepository
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
                    relations: ['departments', 'creator'],
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
                    return yield this.planRepository
                        .createQueryBuilder("plan")
                        .leftJoinAndSelect("plan.departments", "department")
                        .where("plan.isCompanyWide = :isCompanyWide", { isCompanyWide: true })
                        .andWhere("plan.status = :status", { status: Performance_1.PlanStatus.ACTIVE })
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
                        .andWhere("plan.status = :status", { status: Performance_1.PlanStatus.ACTIVE })
                        .andWhere("plan.endDate >= :now", { now: new Date() })
                        .andWhere("plan.endDate <= :maxDate", {
                        maxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    })
                        .orderBy("plan.createdAt", "DESC")
                        .getOne();
                }
                // Nếu không có departmentId, chỉ tìm kế hoạch toàn công ty
                else {
                    return yield this.planRepository.findOne({
                        where: {
                            isCompanyWide: true,
                            status: Performance_1.PlanStatus.ACTIVE,
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
                const reviews = yield this.reviewRepository.find({
                    where: {
                        employee: { departmentId },
                        planId
                    },
                    relations: ['employee', 'reviewer', 'plan']
                });
                return reviews;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllReviewsForPlan(planId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reviews = yield this.reviewRepository.find({
                    where: { planId },
                    relations: ['employee', 'reviewer', 'plan']
                });
                return reviews;
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
                    where: { status: Performance_1.ReviewStatus.APPROVED },
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
                // Kiểm tra kế hoạch có tồn tại không
                const plan = yield this.planRepository.findOneBy({ id });
                if (!plan) {
                    console.log(`Performance plan with ID ${id} not found`);
                    return false; // Thay vì ném lỗi, trả về false để controller xử lý
                }
                // Lấy tất cả reviews liên quan đến plan này
                const reviews = yield this.reviewRepository.find({
                    where: { planId: id }
                });
                // Xóa tất cả reviews liên quan trước
                if (reviews.length > 0) {
                    yield this.reviewRepository.delete({ planId: id });
                }
                // Sau đó xóa plan
                const result = yield this.planRepository.delete(id);
                return result.affected === 1;
            }
            catch (error) {
                console.error(`Error deleting performance plan with ID ${id}:`, error);
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
                    relations: [
                        'plan',
                        'employee',
                        'reviewer',
                        'employee.department',
                        'reviewer.department'
                    ],
                });
            }
            catch (error) {
                console.error('Error fetching review details:', error);
                throw error;
            }
        });
    }
    updatePlan(planId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tìm kế hoạch cần cập nhật
                const plan = yield this.planRepository.findOne({
                    where: { id: planId },
                    relations: ['departments']
                });
                if (!plan) {
                    throw new Error('Performance plan not found');
                }
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
                // Cập nhật thông tin kế hoạch
                plan.title = data.title;
                plan.description = data.description;
                plan.startDate = data.startDate;
                plan.endDate = data.endDate;
                plan.criteria = data.criteria;
                plan.isCompanyWide = data.isCompanyWide || false;
                if (data.status) {
                    plan.status = data.status;
                }
                // Lưu kế hoạch trước
                yield this.planRepository.save(plan);
                // Cập nhật mối quan hệ với phòng ban nếu không phải kế hoạch toàn công ty
                if (!data.isCompanyWide && data.departmentIds && data.departmentIds.length > 0) {
                    const departments = yield this.departmentRepository.findBy({
                        id: (0, typeorm_1.In)(data.departmentIds)
                    });
                    if (departments.length !== data.departmentIds.length) {
                        throw new Error('Some department IDs are invalid');
                    }
                    // Cập nhật quan hệ với phòng ban
                    plan.departments = departments;
                    yield this.planRepository.save(plan);
                }
                else if (data.isCompanyWide) {
                    // Nếu là kế hoạch toàn công ty, xóa quan hệ với phòng ban
                    plan.departments = [];
                    yield this.planRepository.save(plan);
                }
                return plan;
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateReview(reviewId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tìm đánh giá cần cập nhật
                const review = yield this.reviewRepository.findOne({
                    where: { id: reviewId },
                    relations: ['plan']
                });
                if (!review) {
                    throw new Error('Performance review not found');
                }
                // Kiểm tra trạng thái đánh giá
                if (review.status === Performance_1.ReviewStatus.APPROVED) {
                    throw new Error('Cannot modify an approved review');
                }
                // Tính toán điểm tổng hợp
                const plan = review.plan;
                let totalScore = 0;
                for (const scoreItem of data.scores) {
                    const criterion = plan.criteria.find(c => c.id === scoreItem.criteriaId);
                    if (!criterion) {
                        throw new Error(`Invalid criteria ID: ${scoreItem.criteriaId}`);
                    }
                    totalScore += (scoreItem.score * criterion.weight / 100);
                }
                // Cập nhật thông tin đánh giá
                review.reviewDate = data.reviewDate;
                review.scores = data.scores;
                review.comments = data.comments || review.comments;
                review.strengths = data.strengths || review.strengths;
                review.weaknesses = data.weaknesses || review.weaknesses;
                review.improvement = data.improvement || review.improvement;
                review.totalScore = totalScore;
                // Lưu đánh giá
                yield this.reviewRepository.save(review);
                return review;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.performanceService = PerformanceService.getInstance();
