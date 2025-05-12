import { Router } from 'express';
import { trainingController } from '../controllers/TrainingController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Lấy danh sách phòng ban - Tất cả user đã đăng nhập
router.get(
    '/departments',
    authenticateToken,
    (req, res) => trainingController.getAllDepartments(req, res)
);

// Quản lý khóa đào tạo - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post(
    '/courses',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.createTrainingCourse(req, res)
);

router.put(
    '/courses/:id',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.updateTrainingCourse(req, res)
);

// Xóa khóa đào tạo
router.delete(
    '/courses/:id',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.deleteTrainingCourse(req, res)
);

// Lấy danh sách và chi tiết khóa đào tạo - Tất cả user đã đăng nhập
router.get(
    '/courses',
    authenticateToken,
    (req, res) => trainingController.getTrainingCourses(req, res)
);

router.get(
    '/courses/:id',
    authenticateToken,
    (req, res) => trainingController.getTrainingCourseDetail(req, res)
);

// Đăng ký tham gia - HR_STAFF và DEPARTMENT_HEAD có quyền đăng ký cho nhân viên
router.post(
    '/register',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.registerParticipant(req, res)
);

// Ghi nhận kết quả - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post(
    '/results',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.recordTrainingResult(req, res)
);

// Đánh giá năng lực - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post(
    '/competency',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.assessCompetency(req, res)
);

// Gửi thông báo đào tạo - Chỉ HR_STAFF và DEPARTMENT_HEAD có quyền
router.post(
    '/notify/:courseId',
    authenticateToken,
    checkRole([RoleType.HR_STAFF, RoleType.DEPARTMENT_HEAD, RoleType.SYSTEM_ADMIN]),
    (req, res) => trainingController.sendTrainingNotification(req, res)
);

// Xuất báo cáo năng lực - HR_STAFF, DEPARTMENT_HEAD và chủ sở hữu
router.get(
    '/report/:userId',
    authenticateToken,
    (req, res) => trainingController.exportCompetencyReport(req, res)
);

export default router;