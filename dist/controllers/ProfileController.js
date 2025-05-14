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
exports.profileController = void 0;
const ProfileService_1 = require("../services/ProfileService");
class ProfileController {
    constructor() { }
    static getInstance() {
        if (!ProfileController.instance) {
            ProfileController.instance = new ProfileController();
        }
        return ProfileController.instance;
    }
    // Lấy thông tin tài khoản
    getUserProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const profile = yield ProfileService_1.profileService.getUserProfile(userId);
                res.status(200).json(profile);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Cập nhật thông tin cơ bản
    updateBasicInfo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const updateData = req.body;
                const updatedProfile = yield ProfileService_1.profileService.updateBasicInfo(userId, updateData);
                res.status(200).json(updatedProfile);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Đổi mật khẩu
    changePassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { oldPassword, newPassword } = req.body;
                yield ProfileService_1.profileService.changePassword(userId, oldPassword, newPassword);
                res.status(200).json({ message: "Password changed successfully" });
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Tạo yêu cầu chỉnh sửa thông tin
    createEditRequest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { type, changes, reason } = req.body;
                const request = yield ProfileService_1.profileService.createEditRequest(userId, type, changes, reason);
                res.status(201).json(request);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Lấy danh sách yêu cầu chỉnh sửa của user
    getUserEditRequests(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const requests = yield ProfileService_1.profileService.getUserEditRequests(userId);
                res.status(200).json(requests);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
    // Duyệt yêu cầu chỉnh sửa (dành cho HR)
    reviewEditRequest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const reviewerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!reviewerId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { requestId } = req.params;
                const { status, note } = req.body;
                const updatedRequest = yield ProfileService_1.profileService.reviewEditRequest(parseInt(requestId), reviewerId, status, note);
                res.status(200).json(updatedRequest);
            }
            catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.profileController = ProfileController.getInstance();
