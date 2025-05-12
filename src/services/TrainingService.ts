import { AppDataSource } from '../config/data-source';
import { TrainingCourse, TrainingStatus, ParticipantStatus, CompetencyLevel } from '../entities/training/TrainingCourse';
import { User } from '../entities/core/User';
import { Repository } from 'typeorm';

class TrainingService {
    private static instance: TrainingService;
    private courseRepo: Repository<TrainingCourse>;
    private userRepo: Repository<User>;

    private constructor() {
        this.courseRepo = AppDataSource.getRepository(TrainingCourse);
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

    // Lấy danh sách khóa đào tạo
    async getTrainingCourses(status?: TrainingStatus, departmentId?: number): Promise<TrainingCourse[]> {
        const query = this.courseRepo.createQueryBuilder('course')
            .leftJoinAndSelect('course.department', 'department');
        
        if (status) {
            query.andWhere('course.status = :status', { status });
        }

        if (departmentId) {
            query.andWhere('(course.departmentId = :departmentId OR course.departmentId IS NULL)', 
                { departmentId });
        }
        
        return await query.getMany();
    }

    // Lấy chi tiết khóa đào tạo
    async getTrainingCourseDetail(id: number): Promise<TrainingCourse> {
        const course = await this.courseRepo.findOne({
            where: { id },
            relations: ['department', 'user', 'assessor']
        });
        if (!course) {
            throw new Error('Training course not found');
        }
        return course;
    }

    // Đăng ký tham gia khóa đào tạo
    async registerParticipant(courseId: number, userId: number): Promise<TrainingCourse> {
        const course = await this.courseRepo.findOneBy({ id: courseId });
        if (!course) {
            throw new Error('Training course not found');
        }

        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        course.userId = userId;
        course.participantStatus = ParticipantStatus.REGISTERED;
        course.registrationDate = new Date();

        return await this.courseRepo.save(course);
    }

    // Ghi nhận kết quả đào tạo
    async recordTrainingResult(courseId: number, resultData: Partial<TrainingCourse>): Promise<TrainingCourse> {
        const course = await this.courseRepo.findOneBy({ id: courseId });
        if (!course) {
            throw new Error('Training course not found');
        }

        Object.assign(course, resultData);
        course.completionDate = new Date();
        
        return await this.courseRepo.save(course);
    }

    // Đánh giá năng lực
    async assessCompetency(courseId: number, assessorId: number, assessmentData: Partial<TrainingCourse>): Promise<TrainingCourse> {
        const course = await this.courseRepo.findOneBy({ id: courseId });
        if (!course) {
            throw new Error('Training course not found');
        }

        const assessor = await this.userRepo.findOneBy({ id: assessorId });
        if (!assessor) {
            throw new Error('Assessor not found');
        }

        Object.assign(course, assessmentData);
        course.assessorId = assessorId;
        course.assessmentDate = new Date();

        return await this.courseRepo.save(course);
    }

    // Xóa khóa đào tạo
    async deleteTrainingCourse(id: number): Promise<void> {
        const course = await this.courseRepo.findOneBy({ id });
        if (!course) {
            throw new Error('Training course not found');
        }
        // TODO: Consider implications:
        // 1. What happens to participants if a course is deleted?
        // 2. Should there be a soft delete mechanism instead?
        // For now, performing a hard delete.
        await this.courseRepo.remove(course);
    }

    // Gửi thông báo đào tạo
    async sendTrainingNotification(courseId: number): Promise<void> {
        const course = await this.courseRepo.findOne({
            where: { id: courseId },
            relations: ['user', 'department']
        });

        if (!course) {
            throw new Error('Course not found');
        }

        // TODO: Implement email notification logic
        // This would typically integrate with an email service
    }

    // Xuất báo cáo năng lực
    async exportCompetencyReport(userId: number): Promise<TrainingCourse[]> {
        return await this.courseRepo.find({
            where: { userId },
            relations: ['department', 'assessor'],
            order: { assessmentDate: 'DESC' }
        });
    }
}

export const trainingService = TrainingService.getInstance();