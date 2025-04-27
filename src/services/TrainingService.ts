import { AppDataSource } from '../config/data-source';
import { TrainingCourse, TrainingStatus } from '../entities/training/TrainingCourse';
import { TrainingParticipant, ParticipantStatus } from '../entities/training/TrainingParticipant';
import { TrainingResult } from '../entities/training/TrainingResult';
import { CompetencyAssessment } from '../entities/training/CompetencyAssessment';
import { User } from '../entities/core/User';
import { Repository } from 'typeorm';

class TrainingService {
    private static instance: TrainingService;
    private courseRepo: Repository<TrainingCourse>;
    private participantRepo: Repository<TrainingParticipant>;
    private resultRepo: Repository<TrainingResult>;
    private competencyRepo: Repository<CompetencyAssessment>;
    private userRepo: Repository<User>;

    private constructor() {
        this.courseRepo = AppDataSource.getRepository(TrainingCourse);
        this.participantRepo = AppDataSource.getRepository(TrainingParticipant);
        this.resultRepo = AppDataSource.getRepository(TrainingResult);
        this.competencyRepo = AppDataSource.getRepository(CompetencyAssessment);
        this.userRepo = AppDataSource.getRepository(User);
    }

    public static getInstance(): TrainingService {
        if (!TrainingService.instance) {
            TrainingService.instance = new TrainingService();
        }
        return TrainingService.instance;
    }

    // Tạo khóa đào tạo mới
    async createTrainingCourse(courseData: Partial<TrainingCourse>): Promise<TrainingCourse> {
        const course = this.courseRepo.create(courseData);
        return await this.courseRepo.save(course);
    }

    // Cập nhật khóa đào tạo
    async updateTrainingCourse(id: number, courseData: Partial<TrainingCourse>): Promise<TrainingCourse> {
        await this.courseRepo.update(id, courseData);
        const course = await this.courseRepo.findOneBy({ id });
        if (!course) {
            throw new Error('Training course not found');
        }
        return course;
    }

    // Đăng ký tham gia khóa đào tạo
    async registerParticipant(courseId: number, userId: number): Promise<TrainingParticipant> {
        const participant = new TrainingParticipant();
        participant.courseId = courseId;
        participant.userId = userId;
        participant.registrationDate = new Date();
        return await this.participantRepo.save(participant);
    }

    // Ghi nhận kết quả đào tạo
    async recordTrainingResult(resultData: Partial<TrainingResult>): Promise<TrainingResult> {
        const result = this.resultRepo.create(resultData);
        return await this.resultRepo.save(result);
    }

    // Đánh giá năng lực sau đào tạo
    async assessCompetency(assessmentData: Partial<CompetencyAssessment>): Promise<CompetencyAssessment> {
        const assessment = this.competencyRepo.create(assessmentData);
        return await this.competencyRepo.save(assessment);
    }

    // Lấy danh sách khóa đào tạo
    async getTrainingCourses(status?: TrainingStatus): Promise<TrainingCourse[]> {
        const query = this.courseRepo.createQueryBuilder('course');
        
        if (status) {
            query.where('course.status = :status', { status });
        }
        
        return await query.getMany();
    }

    // Lấy chi tiết khóa đào tạo
    async getTrainingCourseDetail(id: number): Promise<TrainingCourse> {
        const course = await this.courseRepo.findOne({
            where: { id },
            relations: ['participants.user', 'results']
        });
        if (!course) {
            throw new Error('Training course not found');
        }
        return course;
    }

    // Lấy kết quả đào tạo của nhân viên
    async getEmployeeTrainingResults(userId: number): Promise<TrainingResult[]> {
        return await this.resultRepo.find({
            where: { userId },
            relations: ['course']
        });
    }

    // Lấy báo cáo năng lực của nhân viên
    async getEmployeeCompetencyReport(userId: number): Promise<CompetencyAssessment[]> {
        return await this.competencyRepo.find({
            where: { userId },
            relations: ['course', 'assessor']
        });
    }

    // Gửi email thông báo đào tạo
    async sendTrainingNotification(courseId: number): Promise<void> {
        const course = await this.courseRepo.findOne({
            where: { id: courseId },
            relations: ['participants.user']
        });

        if (!course) {
            throw new Error('Course not found');
        }

        // TODO: Implement email notification logic
        // This would typically integrate with an email service
    }

    // Xuất báo cáo năng lực
    async exportCompetencyReport(userId: number): Promise<any> {
        const assessments = await this.getEmployeeCompetencyReport(userId);
        // TODO: Implement report generation logic
        // This would typically format the data into a PDF or Excel file
        return assessments;
    }
}

export const trainingService = TrainingService.getInstance();