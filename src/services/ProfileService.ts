import { AppDataSource } from '../config/data-source';
import { User } from '../entities/core/User';
import { EditRequest, EditRequestStatus, EditRequestType } from '../entities/profile/EditRequest';
import bcrypt from 'bcrypt';

class ProfileService {
    private static instance: ProfileService;
    private userRepo = AppDataSource.getRepository(User);
    private editRequestRepo = AppDataSource.getRepository(EditRequest);

    private constructor() {}

    public static getInstance(): ProfileService {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }

    // Lấy thông tin tài khoản
    async getUserProfile(userId: number): Promise<User> {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['department', 'position', 'role']
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    // Cập nhật thông tin có thể thay đổi trực tiếp
    async updateBasicInfo(userId: number, updateData: Partial<User>): Promise<User> {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        // Chỉ cho phép cập nhật một số thông tin cơ bản
        const { phone, email } = updateData;
        
        // Cập nhật các trường được phép
        if (phone !== undefined) user.phone = phone;
        if (email !== undefined) user.email = email;
        return await this.userRepo.save(user);
    }

    // Đổi mật khẩu
    async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        // Kiểm tra mật khẩu cũ
        const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }

        // Kiểm tra yêu cầu bảo mật của mật khẩu mới
        if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }

        // Mã hóa và lưu mật khẩu mới
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = newPasswordHash;
        await this.userRepo.save(user);
    }

    // Tạo yêu cầu chỉnh sửa thông tin
    async createEditRequest(
        userId: number,
        type: EditRequestType,
        changes: object,
        reason: string
    ): Promise<EditRequest> {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        const request = new EditRequest();
        request.userId = userId;
        request.type = type;
        request.changes = changes;
        request.reason = reason;
        request.status = EditRequestStatus.PENDING;

        return await this.editRequestRepo.save(request);
    }

    // Lấy danh sách yêu cầu chỉnh sửa thông tin của user
    async getUserEditRequests(userId: number): Promise<EditRequest[]> {
        return await this.editRequestRepo.find({
            where: { userId },
            relations: ['reviewer'],
            order: { createdAt: 'DESC' }
        });
    }

    // Duyệt yêu cầu chỉnh sửa thông tin (dành cho HR)
    async reviewEditRequest(
        requestId: number,
        reviewerId: number,
        status: EditRequestStatus,
        note?: string
    ): Promise<EditRequest> {
        const request = await this.editRequestRepo.findOne({
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
        if (status === EditRequestStatus.APPROVED) {
            const user = request.user;
            Object.assign(user, request.changes);
            await this.userRepo.save(user);
        }

        return await this.editRequestRepo.save(request);
    }
}

export const profileService = ProfileService.getInstance();