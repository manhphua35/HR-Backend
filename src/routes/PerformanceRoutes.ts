import { Router } from 'express';
import { performanceController } from '../controllers/PerformanceController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Create performance plan - Only department managers can access
router.post(
    '/plans/create',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD]),
    (req, res) => performanceController.createPlan(req, res)
);

// Get department performance plans
router.get(
    '/plans/department',
    authenticateToken,
    (req, res) => performanceController.getDepartmentPlans(req, res)
);

// Create performance review - Only department managers can access
router.post(
    '/reviews/create',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD]),
    (req, res) => performanceController.createReview(req, res)
);

// Get department reviews by plan - Only department managers can access
router.get(
    '/reviews/department/:planId',
    authenticateToken,
    checkRole([RoleType.DEPARTMENT_HEAD]),
    (req, res) => performanceController.getDepartmentReviews(req, res)
);

// Get overall department performance - Only Admin and HR Staff can access
router.get(
    '/overall',
    authenticateToken,
    checkRole([RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF]),
    (req, res) => performanceController.getOverallDepartmentPerformance(req, res)
);

export default router;