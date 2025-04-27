import { Request, Response } from 'express';
import { trainingService } from '../services/TrainingService';
import { TrainingStatus } from '../entities/training/TrainingCourse';
import { CompetencyLevel } from '../entities/training/CompetencyAssessment';

class TrainingController {
    private static instance: TrainingController;

    private constructor() {}

    public static getInstance(): TrainingController {
        if (!TrainingController.instance) {
            TrainingController.instance = new TrainingController();
        }
        return TrainingController.instance;
    }

    // Tạo khóa đào tạo mới
    async createTrainingCourse(req: Request, res: Response) {
        try {
            const courseData = req.body;
            const result = await trainingService.createTrainingCourse(courseData);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Cập nhật khóa đào tạo
    async updateTrainingCourse(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const courseData = req.body;
            const result = await trainingService.updateTrainingCourse(parseInt(id), courseData);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Đăng ký tham gia khóa đào tạo
    async registerParticipant(req: Request, res: Response) {
        try {
            const { courseId, userId } = req.body;
            const result = await trainingService.registerParticipant(courseId, userId);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Ghi nhận kết quả đào tạo
    async recordTrainingResult(req: Request, res: Response) {
        try {
            const resultData = req.body;
            const result = await trainingService.recordTrainingResult(resultData);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Đánh giá năng lực
    async assessCompetency(req: Request, res: Response) {
        try {
            const assessmentData = req.body;
            const result = await trainingService.assessCompetency(assessmentData);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy danh sách khóa đào tạo
    async getTrainingCourses(req: Request, res: Response) {
        try {
            const { status } = req.query;
            const result = await trainingService.getTrainingCourses(status as TrainingStatus);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy chi tiết khóa đào tạo
    async getTrainingCourseDetail(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await trainingService.getTrainingCourseDetail(parseInt(id));
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy kết quả đào tạo của nhân viên
    async getEmployeeTrainingResults(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const result = await trainingService.getEmployeeTrainingResults(parseInt(userId));
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy báo cáo năng lực của nhân viên
    async getEmployeeCompetencyReport(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const result = await trainingService.getEmployeeCompetencyReport(parseInt(userId));
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Gửi thông báo đào tạo
    async sendTrainingNotification(req: Request, res: Response) {
        try {
            const { courseId } = req.params;
            await trainingService.sendTrainingNotification(parseInt(courseId));
            res.status(200).json({ message: 'Notification sent successfully' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Xuất báo cáo năng lực
    async exportCompetencyReport(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const report = await trainingService.exportCompetencyReport(parseInt(userId));
            res.status(200).json(report);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const trainingController = TrainingController.getInstance();