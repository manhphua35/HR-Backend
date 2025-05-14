"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProfileController_1 = require("../controllers/ProfileController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const Role_1 = require("../entities/auth/Role");
const router = (0, express_1.Router)();
// Xem thông tin tài khoản - Yêu cầu đăng nhập
router.get('/me', authMiddleware_1.authenticateToken, (req, res) => ProfileController_1.profileController.getUserProfile(req, res));
// Cập nhật thông tin cơ bản - Yêu cầu đăng nhập
router.put('/basic-info', authMiddleware_1.authenticateToken, (req, res) => ProfileController_1.profileController.updateBasicInfo(req, res));
// Đổi mật khẩu - Yêu cầu đăng nhập
router.put('/change-password', authMiddleware_1.authenticateToken, (req, res) => ProfileController_1.profileController.changePassword(req, res));
// Tạo yêu cầu chỉnh sửa thông tin - Yêu cầu đăng nhập
router.post('/edit-requests', authMiddleware_1.authenticateToken, (req, res) => ProfileController_1.profileController.createEditRequest(req, res));
// Xem danh sách yêu cầu chỉnh sửa của bản thân - Yêu cầu đăng nhập
router.get('/edit-requests', authMiddleware_1.authenticateToken, (req, res) => ProfileController_1.profileController.getUserEditRequests(req, res));
// Duyệt yêu cầu chỉnh sửa - Chỉ HR_STAFF có quyền
router.put('/edit-requests/:requestId/review', authMiddleware_1.authenticateToken, (0, authMiddleware_1.checkRole)([Role_1.RoleType.HR_STAFF]), (req, res) => ProfileController_1.profileController.reviewEditRequest(req, res));
exports.default = router;
