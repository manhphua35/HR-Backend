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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/core/User");
const EditRequest_1 = require("../entities/profile/EditRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
class ProfileService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.editRequestRepo = data_source_1.AppDataSource.getRepository(EditRequest_1.EditRequest);
    }
    static getInstance() {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }
    // Lấy thông tin tài khoản
    getUserProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOne({
                where: { id: userId },
                relations: ['department', 'position', 'role']
            });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        });
    }
    // Cập nhật thông tin có thể thay đổi trực tiếp
    updateBasicInfo(userId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error('User not found');
            }
            // Chỉ cho phép cập nhật một số thông tin cơ bản
            const { phone, email } = updateData;
            // Cập nhật các trường được phép
            if (phone !== undefined)
                user.phone = phone;
            if (email !== undefined)
                user.email = email;
            return yield this.userRepo.save(user);
        });
    }
    // Đổi mật khẩu
    changePassword(userId, oldPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error('User not found');
            }
            // Kiểm tra mật khẩu cũ
            const isValidPassword = yield bcrypt_1.default.compare(oldPassword, user.passwordHash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }
            // Kiểm tra yêu cầu bảo mật của mật khẩu mới
            if (newPassword.length < 8) {
                throw new Error('New password must be at least 8 characters long');
            }
            // Mã hóa và lưu mật khẩu mới
            const newPasswordHash = yield bcrypt_1.default.hash(newPassword, 10);
            user.passwordHash = newPasswordHash;
            yield this.userRepo.save(user);
        });
    }
    // Tạo yêu cầu chỉnh sửa thông tin
    createEditRequest(userId, type, changes, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneBy({ id: userId });
            if (!user) {
                throw new Error('User not found');
            }
            const request = new EditRequest_1.EditRequest();
            request.userId = userId;
            request.type = type;
            request.changes = changes;
            request.reason = reason;
            request.status = EditRequest_1.EditRequestStatus.PENDING;
            return yield this.editRequestRepo.save(request);
        });
    }
    // Lấy danh sách yêu cầu chỉnh sửa thông tin của user
    getUserEditRequests(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.editRequestRepo.find({
                where: { userId },
                relations: ['reviewer'],
                order: { createdAt: 'DESC' }
            });
        });
    }
    // Duyệt yêu cầu chỉnh sửa thông tin (dành cho HR)
    reviewEditRequest(requestId, reviewerId, status, note) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield this.editRequestRepo.findOne({
                where: { id: requestId },
                relations: ['user']
            });
            if (!request) {
                throw new Error('Edit request not found');
            }
            request.status = status;
            request.reviewerId = reviewerId;
            request.reviewNote = note || '';
            // Nếu yêu cầu được chấp nhận, cập nhật thông tin user
            if (status === EditRequest_1.EditRequestStatus.APPROVED) {
                const user = request.user;
                Object.assign(user, request.changes);
                yield this.userRepo.save(user);
            }
            return yield this.editRequestRepo.save(request);
        });
    }
}
exports.profileService = ProfileService.getInstance();
