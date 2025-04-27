import { Request, Response } from 'express';
import { profileService } from '../services/ProfileService';
import { EditRequestType, EditRequestStatus } from '../entities/profile/EditRequest';

class ProfileController {
    private static instance: ProfileController;

    private constructor() {}

    public static getInstance(): ProfileController {
        if (!ProfileController.instance) {
            ProfileController.instance = new ProfileController();
        }
        return ProfileController.instance;
    }

    // Lấy thông tin tài khoản
    async getUserProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const profile = await profileService.getUserProfile(userId);
            res.status(200).json(profile);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Cập nhật thông tin cơ bản
    async updateBasicInfo(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const updateData = req.body;
            const updatedProfile = await profileService.updateBasicInfo(userId, updateData);
            res.status(200).json(updatedProfile);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Đổi mật khẩu
    async changePassword(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { oldPassword, newPassword } = req.body;
            await profileService.changePassword(userId, oldPassword, newPassword);
            res.status(200).json({ message: "Password changed successfully" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Tạo yêu cầu chỉnh sửa thông tin
    async createEditRequest(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { type, changes, reason } = req.body;
            const request = await profileService.createEditRequest(
                userId,
                type as EditRequestType,
                changes,
                reason
            );
            res.status(201).json(request);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy danh sách yêu cầu chỉnh sửa của user
    async getUserEditRequests(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const requests = await profileService.getUserEditRequests(userId);
            res.status(200).json(requests);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Duyệt yêu cầu chỉnh sửa (dành cho HR)
    async reviewEditRequest(req: Request, res: Response) {
        try {
            const reviewerId = req.user?.userId;
            if (!reviewerId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { requestId } = req.params;
            const { status, note } = req.body;

            const updatedRequest = await profileService.reviewEditRequest(
                parseInt(requestId),
                reviewerId,
                status as EditRequestStatus,
                note
            );
            res.status(200).json(updatedRequest);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const profileController = ProfileController.getInstance();