"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PerformanceController_1 = require("../controllers/PerformanceController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Create performance plan - Allow system admin, HR staff and department managers
router.post('/plans/create', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PerformanceController_1.performanceController.createPlan(req, res));
// Get department performance plans (bao gồm cả kế hoạch toàn công ty)
router.get('/plans/department', authMiddleware_1.authenticateToken, (req, res) => PerformanceController_1.performanceController.getDepartmentPlans(req, res));
// Get all department plans - Only system admin and HR staff can access
router.get('/plans/all', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PerformanceController_1.performanceController.getAllDepartmentPlans(req, res));
// Get company-wide plans - Accessible by all authenticated users
router.get('/plans/company', authMiddleware_1.authenticateToken, (req, res) => PerformanceController_1.performanceController.getCompanyWidePlans(req, res));
// Create performance review - Allow system admin, HR staff and department managers
router.post('/reviews/create', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PerformanceController_1.performanceController.createReview(req, res));
// Get department reviews by plan - Only department managers can access
router.get('/reviews/department/:planId', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD]), (req, res) => PerformanceController_1.performanceController.getDepartmentReviews(req, res));
// Get employee reviews - For employees to view their own reviews
router.get('/reviews/employee', authMiddleware_1.authenticateToken, (req, res) => PerformanceController_1.performanceController.getEmployeeReviews(req, res));
// Get review details by ID - Allow access to the employee being reviewed, their manager, HR staff and admin
router.get('/reviews/:reviewId', authMiddleware_1.authenticateToken, (req, res) => PerformanceController_1.performanceController.getReviewDetails(req, res));
// Get overall department performance - Only Admin and HR Staff can access
router.get('/overall', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.SYSTEM_ADMIN, Role_1.RoleType.HR_STAFF]), (req, res) => PerformanceController_1.performanceController.getOverallDepartmentPerformance(req, res));
// Delete performance plan - Only department managers, HR staff and system admin can access
router.delete('/plans/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => PerformanceController_1.performanceController.deletePlan(req, res));
// Delete performance review - Only department managers, HR staff and system admin can access
router.delete('/reviews/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.DEPARTMENT_HEAD, Role_1.RoleType.HR_STAFF, Role_1.RoleType.SYSTEM_ADMIN]), (req, res) => PerformanceController_1.performanceController.deleteReview(req, res));
exports.default = router;
