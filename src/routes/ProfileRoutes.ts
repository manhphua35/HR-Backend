import { Router } from 'express';
import { profileController } from '../controllers/ProfileController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';
import { RoleType } from '../entities/auth/Role';

const router = Router();

// Xem thông tin tài khoản - Yêu cầu đăng nhập
router.get(
    '/me',
    authenticateToken,
    (req, res) => profileController.getUserProfile(req, res)
);

// Cập nhật thông tin cơ bản - Yêu cầu đăng nhập
router.put(
    '/basic-info',
    authenticateToken,
    (req, res) => profileController.updateBasicInfo(req, res)
);

// Đổi mật khẩu - Yêu cầu đăng nhập
router.put(
    '/change-password',
    authenticateToken,
    (req, res) => profileController.changePassword(req, res)
);

// Tạo yêu cầu chỉnh sửa thông tin - Yêu cầu đăng nhập
router.post(
    '/edit-requests',
    authenticateToken,
    (req, res) => profileController.createEditRequest(req, res)
);

// Xem danh sách yêu cầu chỉnh sửa của bản thân - Yêu cầu đăng nhập
router.get(
    '/edit-requests',
    authenticateToken,
    (req, res) => profileController.getUserEditRequests(req, res)
);

// Duyệt yêu cầu chỉnh sửa - Chỉ HR_STAFF có quyền
router.put(
    '/edit-requests/:requestId/review',
    authenticateToken,
    checkRole([RoleType.HR_STAFF]),
    (req, res) => profileController.reviewEditRequest(req, res)
);

export default router;