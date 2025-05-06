import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { Attendance } from '../entities/attendance/Attendance';
import { User } from '../entities/core/User'; // Vẫn cần User repo
import { AttendanceService } from '../services/AttendanceService';
import { RoleType } from '../entities/auth/Role'; // Import RoleType

// Định nghĩa kiểu cho req.user từ middleware
interface AuthenticatedUser {
    userId: number;
    roleType: RoleType;
    permissions: string[];
    departmentId?: number;
}

export class AttendanceController {
    private attendanceService: AttendanceService;

    constructor() {
        // Khởi tạo service với repository tương ứng
        this.attendanceService = new AttendanceService(
            AppDataSource.getRepository(Attendance),
            AppDataSource.getRepository(User) // Truyền User repository vào service
        );
    }

    // Lấy danh sách chấm công (có phân quyền)
    async getAttendances(req: Request, res: Response): Promise<void> {
        try {
            // Lấy thông tin user từ request (đã được thêm vào bởi authMiddleware)
            const requestingUser = req.user as AuthenticatedUser; // Sử dụng kiểu đã định nghĩa
            if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { userId, departmentId, startDate, endDate } = req.query; // Thêm các query params để lọc

            const attendances = await this.attendanceService.getAttendances(
                requestingUser, // Truyền thông tin user đã xác thực
                userId as string | undefined,
                departmentId as string | undefined,
                startDate as string | undefined,
                endDate as string | undefined
            );
            res.status(200).json(attendances);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi lấy dữ liệu chấm công', error: error.message });
        }
    }

    // Lấy chi tiết chấm công theo ID
    async getAttendanceById(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { id } = req.params;
            const attendance = await this.attendanceService.getAttendanceById(requestingUser, id);
            if (attendance) {
                res.status(200).json(attendance);
            } else {
                res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công' });
            }
        } catch (error: any) {
             if (error.message === 'Forbidden') {
                res.status(403).json({ message: 'Bạn không có quyền xem bản ghi này' });
            } else {
                res.status(500).json({ message: 'Lỗi khi lấy chi tiết chấm công', error: error.message });
            }
        }
    }

     // Tạo bản ghi chấm công mới (ví dụ: check-in)
     async createAttendance(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const attendanceData = req.body;

            // Gán user ID vào dữ liệu chấm công nếu chưa có
            if (!attendanceData.userId) {
                 attendanceData.userId = requestingUser.userId.toString(); // userId trong body thường là string
            } else {
                 // Kiểm tra quyền nếu chấm công cho người khác
                 const targetUserId = parseInt(attendanceData.userId, 10);
                 if (isNaN(targetUserId)) {
                     res.status(400).json({ message: 'User ID không hợp lệ.' });
                     return;
                 }
                 if (targetUserId !== requestingUser.userId &&
                     ![RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF].includes(requestingUser.roleType)) { // Sử dụng RoleType đã import
                     // Chỉ Admin/HR mới được chấm công cho người khác
                     res.status(403).json({ message: 'Bạn không có quyền chấm công cho người dùng này' });
                     return;
                 }
            }


            const newAttendance = await this.attendanceService.createOrUpdateAttendance(attendanceData);
            res.status(201).json(newAttendance);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi tạo bản ghi chấm công', error: error.message });
        }
    }

    // Cập nhật bản ghi chấm công (ví dụ: check-out, sửa đổi)
    async updateAttendance(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { id } = req.params;
            const attendanceData = req.body;
            // Truyền requestingUser vào service để kiểm tra quyền
            const updatedAttendance = await this.attendanceService.updateAttendance(requestingUser, id, attendanceData);
            if (updatedAttendance) {
                res.status(200).json(updatedAttendance);
            } else {
                res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền cập nhật bản ghi chấm công' });
            }
        } catch (error: any) {
             if (error.message === 'Forbidden') {
                res.status(403).json({ message: 'Bạn không có quyền cập nhật bản ghi này' });
            } else {
                res.status(500).json({ message: 'Lỗi khi cập nhật bản ghi chấm công', error: error.message });
            }
        }
    }

    // Xóa bản ghi chấm công (thường ít dùng, nên cân nhắc)
    async deleteAttendance(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { id } = req.params;
            // Truyền requestingUser vào service để kiểm tra quyền
            const success = await this.attendanceService.deleteAttendance(requestingUser, id);
            if (success) {
                res.status(204).send(); // No Content
            } else {
                res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền xóa bản ghi chấm công' });
            }
        } catch (error: any) {
             if (error.message === 'Forbidden') {
                res.status(403).json({ message: 'Bạn không có quyền xóa bản ghi này' });
            } else {
                res.status(500).json({ message: 'Lỗi khi xóa bản ghi chấm công', error: error.message });
            }
        }
    }

    // Endpoint riêng cho check-in
    async checkIn(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { notes } = req.body;
            // Sử dụng userId từ user đã xác thực
            const result = await this.attendanceService.checkIn(requestingUser.userId, notes);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi check-in', error: error.message });
        }
    }

    // Endpoint riêng cho check-out
    async checkOut(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
             if (!requestingUser) {
                res.status(401).json({ message: 'Yêu cầu xác thực.' });
                return;
            }
            const { notes } = req.body;
             // Sử dụng userId từ user đã xác thực
            const result = await this.attendanceService.checkOut(requestingUser.userId, notes);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi check-out', error: error.message });
        }
    }
}