import { Router } from 'express';
import { performanceController } from '../controllers/PerformanceController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create performance plan - Allow system admin, HR staff and department managers
router.post(
    '/plans/create',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => performanceController.createPlan(req, res)
);

// Get department performance plans
router.get(
    '/plans/department',
    authenticateToken,
    (req, res) => performanceController.getDepartmentPlans(req, res)
);

// Get all department plans - Only system admin and HR staff can access
router.get(
    '/plans/all',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => performanceController.getAllDepartmentPlans(req, res)
);

// Create performance review - Allow system admin, HR staff and department managers
router.post(
    '/reviews/create',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => performanceController.createReview(req, res)
);

// Get department reviews by plan - Only department managers can access
router.get(
    '/reviews/department/:planId',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD]),
    (req, res) => performanceController.getDepartmentReviews(req, res)
);

// Get employee reviews - For employees to view their own reviews
router.get(
    '/reviews/employee',
    authenticateToken,
    (req, res) => performanceController.getEmployeeReviews(req, res)
);

// Get review details by ID - Allow access to the employee being reviewed, their manager, HR staff and admin
router.get(
    '/reviews/:reviewId',
    authenticateToken,
    (req, res) => performanceController.getReviewDetails(req, res)
);

// Get overall department performance - Only Admin and HR Staff can access
router.get(
    '/overall',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => performanceController.getOverallDepartmentPerformance(req, res)
);

// Delete performance plan - Only department managers, HR staff and system admin can access
router.delete(
    '/plans/:id',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => performanceController.deletePlan(req, res)
);

// Delete performance review - Only department managers, HR staff and system admin can access
router.delete(
    '/reviews/:id',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD, RoleType.HR_STAFF, RoleType.SYSTEM_ADMIN]),
    (req, res) => performanceController.deleteReview(req, res)
);

export default router;