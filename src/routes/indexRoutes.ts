import { Router } from 'express';
import authRoutes from './AuthRoutes';
import userRoutes from './UserRoutes';
import departmentRoutes from './DepartmentRoutes';
import positionRoutes from './PositionRoutes';
import leaveRoutes from './LeaveRoutes';
import performanceRoutes from './PerformanceRoutes';
import payrollRoutes from './PayrollRoutes';
import trainingRoutes from './TrainingRoutes';
import profileRoutes from './ProfileRoutes';
import reportRoutes from './ReportRoutes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/positions', positionRoutes);
router.use('/leaves', leaveRoutes);
router.use('/performance', performanceRoutes);
router.use('/payroll', payrollRoutes);
router.use('/training', trainingRoutes);
router.use('/profile', profileRoutes);
router.use('/reports', reportRoutes);

export default router;