import { Request, Response } from 'express';
import { trainingService } from '../services/TrainingService';
import { departmentService } from '../services/DepartmentService';
import { TrainingStatus } from '../entities/training/TrainingCourse';

class TrainingController {
    private static instance: TrainingController;

    private constructor() {}

    public static getInstance(): TrainingController {
        if (!TrainingController.instance) {
            TrainingController.instance = new TrainingController();
        }
        return TrainingController.instance;
    }

    // Lấy danh sách phòng ban
    public async getAllDepartments(_req: Request, res: Response): Promise<void> {
        try {
            const departments = await departmentService.getAllDepartments();
            
            res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error) {
            console.error('Error getting departments:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Tạo khóa đào tạo mới
    async createTrainingCourse(req: Request, res: Response) {
        try {
            const courseData = req.body;
            const result = await trainingService.createTrainingCourse(courseData);
            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cập nhật khóa đào tạo
    async updateTrainingCourse(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const courseData = req.body;
            const result = await trainingService.updateTrainingCourse(parseInt(id), courseData);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Lấy danh sách khóa đào tạo
    async getTrainingCourses(req: Request, res: Response) {
        try {
            const { status, departmentId } = req.query;
            const result = await trainingService.getTrainingCourses(
                status as TrainingStatus,
                departmentId ? parseInt(departmentId as string) : undefined
            );
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Lấy chi tiết khóa đào tạo
    async getTrainingCourseDetail(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await trainingService.getTrainingCourseDetail(parseInt(id));
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Đăng ký tham gia khóa đào tạo
    async registerParticipant(req: Request, res: Response) {
        try {
            const { courseId, userId } = req.body;
            const result = await trainingService.registerParticipant(courseId, userId);
            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Ghi nhận kết quả đào tạo
    async recordTrainingResult(req: Request, res: Response) {
        try {
            const { courseId, ...resultData } = req.body;
            const result = await trainingService.recordTrainingResult(courseId, resultData);
            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Đánh giá năng lực
    async assessCompetency(req: Request, res: Response) {
        try {
            const { courseId, assessorId, ...assessmentData } = req.body;
            const result = await trainingService.assessCompetency(courseId, assessorId, assessmentData);
            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Gửi thông báo đào tạo
    async sendTrainingNotification(req: Request, res: Response) {
        try {
            const { courseId } = req.params;
            await trainingService.sendTrainingNotification(parseInt(courseId));
            res.status(200).json({
                success: true,
                message: 'Notification sent successfully'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Xuất báo cáo năng lực
    async exportCompetencyReport(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const report = await trainingService.exportCompetencyReport(parseInt(userId));
            res.status(200).json({
                success: true,
                data: report
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Xóa khóa đào tạo
    async deleteTrainingCourse(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await trainingService.deleteTrainingCourse(parseInt(id));
            res.status(200).json({
                success: true,
                message: 'Training course deleted successfully'
            });
        } catch (error: any) {
            if (error.message === 'Training course not found') {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Error deleting training course: ' + error.message
                });
            }
        }
    }
}

export const trainingController = TrainingController.getInstance();