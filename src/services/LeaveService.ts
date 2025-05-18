import { AppDataSource } from '../config/data-source';
import { Leave, LeaveStatus, LeaveType } from '../entities/leave/Leave';
import { User } from '../entities/core/User';
import { Between, LessThanOrEqual, MoreThanOrEqual, FindManyOptions, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

interface CreateLeaveData {
    userId: number;
    startDate: Date;
    endDate: Date;
    type: LeaveType;
    reason?: string;
    numberOfDays: number;
}

interface CreateHolidayData {
    startDate: Date;
    endDate: Date;
    reason: string;
    approverId: number;
    departmentIds?: number[];  // Nếu có, chỉ áp dụng cho các phòng ban cụ thể
    batchName?: string;        // Tên cho đợt nghỉ này
}

interface UpdateLeaveStatusData {
    status: LeaveStatus;
    approverId: number;
    rejectionReason?: string;
}

interface GetAllLeavesFilter {
    startDate?: string;
    endDate?: string;
    status?: LeaveStatus;
    type?: LeaveType;
    userId?: number;
    departmentId?: number;
    holidayBatchId?: string;   // Filter theo đợt nghỉ
}

// Định nghĩa kiểu cho user đã xác thực từ token
interface AuthenticatedUser {
    userId: number;
    roleType: string;
    permissions: string[];
    departmentId?: number;
}

// Interface cho thông tin về đợt nghỉ
interface HolidayBatch {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    createdBy: number;
    createdAt: Date;
    leaveCount: number;
}

class LeaveService {
    private static instance: LeaveService;
    private leaveRepository = AppDataSource.getRepository(Leave);
    private userRepository = AppDataSource.getRepository(User);

    public static getInstance(): LeaveService {
        if (!LeaveService.instance) {
            LeaveService.instance = new LeaveService();
        }
        return LeaveService.instance;
    }

    // Helper function để kiểm tra quyền xem
    private async checkViewPermission(requestingUser: AuthenticatedUser, targetUserId?: number, targetDepartmentId?: number): Promise<boolean> {
        const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;

        // Admin và HR có thể xem tất cả
        if (roleType === 'SYSTEM_ADMIN' || roleType === 'HR_STAFF') {
            return true;
        }

        // Trưởng phòng chỉ xem được phòng mình
        if (roleType === 'DEPARTMENT_HEAD') {
            if (!reqUserDeptId) return false;

            // Kiểm tra xem có đang xem phòng ban của mình không
            if (targetDepartmentId && targetDepartmentId === reqUserDeptId) {
                return true;
            }

            // Kiểm tra xem user có thuộc phòng ban của mình không
            if (targetUserId) {
                const targetUser = await this.userRepository.findOne({ 
                    where: { id: targetUserId, department: { id: reqUserDeptId } } 
                });
                return !!targetUser;
            }

            // Cho phép xem chung nếu sau này sẽ lọc theo phòng ban
            return !targetUserId && !targetDepartmentId;
        }

        // Nhân viên chỉ xem được đơn của mình
        if (targetUserId && targetUserId === userId) {
            return true;
        }

        // Cho phép xem của bản thân khi không có filter
        if (!targetUserId && !targetDepartmentId) {
            return true;
        }

        return false;
    }

    // Phương thức để lấy tất cả leave với phân quyền
    public async getLeaves(
        requestingUser: AuthenticatedUser,
        filters: GetAllLeavesFilter = {}
    ): Promise<Leave[]> {
        const { userId: requestingUserId, roleType, departmentId: reqUserDeptId } = requestingUser;
        const { userId, departmentId, holidayBatchId, ...otherFilters } = filters;

        const query = this.leaveRepository.createQueryBuilder('leave')
            .leftJoinAndSelect('leave.user', 'user')
            .leftJoinAndSelect('user.department', 'department')
            .leftJoinAndSelect('leave.approver', 'approver')
            .orderBy('leave.createdAt', 'DESC');

        // Áp dụng các filter cơ bản
        if (otherFilters.startDate && otherFilters.endDate) {
            query.andWhere(
                '(leave.startDate BETWEEN :startDate AND :endDate OR leave.endDate BETWEEN :startDate AND :endDate)',
                { startDate: otherFilters.startDate, endDate: otherFilters.endDate }
            );
        }

        if (otherFilters.status) {
            query.andWhere('leave.status = :status', { status: otherFilters.status });
        }

        if (otherFilters.type) {
            query.andWhere('leave.type = :type', { type: otherFilters.type });
        }

        // Filter theo đợt nghỉ nếu có
        if (holidayBatchId) {
            query.andWhere('leave.holidayBatchId = :holidayBatchId', { holidayBatchId });
        }

        // Áp dụng phân quyền
        if (roleType === 'SYSTEM_ADMIN' || roleType === 'HR_STAFF') {
            // Admin và HR xem được hết
            if (userId) {
                query.andWhere('user.id = :userId', { userId });
            }
            if (departmentId) {
                query.andWhere('department.id = :departmentId', { departmentId });
            }
        } else if (roleType === 'DEPARTMENT_HEAD') {
            // Trưởng phòng chỉ xem được phòng mình
            if (!reqUserDeptId) {
                return []; // Trưởng phòng phải thuộc một phòng ban
            }
            
            query.andWhere('department.id = :departmentId', { departmentId: reqUserDeptId });
            
            if (userId) {
                // Kiểm tra xem userId có thuộc phòng ban không
                const userInDept = await this.userRepository.findOne({
                    where: { id: userId, department: { id: reqUserDeptId } }
                });
                if (!userInDept) {
                    return [];
                }
                query.andWhere('user.id = :userId', { userId });
            }
        } else {
            // Nhân viên chỉ xem được đơn của mình
            query.andWhere('user.id = :userId', { userId: requestingUserId });
        }

        return await query.getMany();
    }

    // Lấy đơn nghỉ phép theo ngày cụ thể
    public async getLeavesBySpecificDate(
        requestingUser: AuthenticatedUser,
        date: string,
        userId?: number,
        departmentId?: number
    ): Promise<Leave[]> {
        return this.getLeaves(requestingUser, {
            startDate: date,
            endDate: date,
            userId,
            departmentId
        });
    }

    // Lấy đơn nghỉ phép theo tháng
    public async getLeavesByMonth(
        requestingUser: AuthenticatedUser,
        year: number,
        month: number,
        userId?: number,
        departmentId?: number
    ): Promise<Leave[]> {
        // Tính ngày đầu và cuối tháng
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const leaves = await this.getLeaves(requestingUser, {
            startDate: startDateStr,
            endDate: endDateStr,
            userId,
            departmentId
        });

        // Sắp xếp theo ngày bắt đầu
        return leaves.sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return dateA - dateB;
        });
    }

    public async createLeave(data: CreateLeaveData): Promise<Leave> {
        try {
            // Check if user exists
            const user = await this.userRepository.findOneBy({ id: data.userId });
            if (!user) {
                throw new Error('User not found');
            }

            // Check if user has enough remaining leaves for ANNUAL type
            if (data.type === LeaveType.ANNUAL) {
                if (user.remainingLeaves < data.numberOfDays) {
                    throw new Error('Insufficient remaining leave days');
                }
            }

            // Check for overlapping leave requests
            const overlappingLeave = await this.leaveRepository.findOne({
                where: [
                    {
                        userId: data.userId,
                        startDate: LessThanOrEqual(data.endDate),
                        endDate: MoreThanOrEqual(data.startDate),
                        status: LeaveStatus.PENDING
                    },
                    {
                        userId: data.userId,
                        startDate: LessThanOrEqual(data.endDate),
                        endDate: MoreThanOrEqual(data.startDate),
                        status: LeaveStatus.APPROVED
                    }
                ]
            });

            if (overlappingLeave) {
                throw new Error('Overlapping leave request exists');
            }

            // Create new leave request
            const leave = this.leaveRepository.create({
                ...data,
                status: LeaveStatus.PENDING
            });

            await this.leaveRepository.save(leave);
            return leave;

        } catch (error) {
            throw error;
        }
    }

    // Tạo kỳ nghỉ lễ cho tất cả nhân viên hoặc các phòng ban cụ thể
    public async createHoliday(data: CreateHolidayData): Promise<{ success: boolean, count: number, errors: any[], batchId: string }> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            // Tính số ngày nghỉ
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            const timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
            const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 vì bao gồm cả ngày bắt đầu
            
            // Tạo batch ID và name để theo dõi đợt nghỉ
            const batchId = uuidv4();
            const batchName = data.batchName || `Đợt nghỉ lễ ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}`;
            
            // Lấy danh sách người dùng dựa vào departmentIds (nếu có)
            let usersQuery = this.userRepository.createQueryBuilder('user')
                .where('user.isActive = :isActive', { isActive: true });
            
            if (data.departmentIds && data.departmentIds.length > 0) {
                usersQuery = usersQuery.andWhere('user.departmentId IN (:...departmentIds)', 
                    { departmentIds: data.departmentIds });
            }
            
            const users = await usersQuery.getMany();
            
            if (users.length === 0) {
                throw new Error('No active users found');
            }
            
            const errors: any[] = [];
            let successCount = 0;
            
            // Tạo yêu cầu nghỉ lễ cho mỗi người dùng
            for (const user of users) {
                try {
                    // Kiểm tra xem người dùng đã có lịch nghỉ trùng không
                    const overlappingLeave = await this.leaveRepository.findOne({
                        where: [
                            {
                                userId: user.id,
                                startDate: LessThanOrEqual(endDate),
                                endDate: MoreThanOrEqual(startDate),
                                status: LeaveStatus.PENDING
                            },
                            {
                                userId: user.id,
                                startDate: LessThanOrEqual(endDate),
                                endDate: MoreThanOrEqual(startDate),
                                status: LeaveStatus.APPROVED
                            }
                        ]
                    });
                    
                    if (overlappingLeave) {
                        errors.push({
                            userId: user.id,
                            message: `User ${user.fullName} already has an overlapping leave request`
                        });
                        continue;
                    }
                    
                    // Tạo yêu cầu nghỉ lễ với trạng thái đã được chấp nhận
                    const leave = this.leaveRepository.create({
                        userId: user.id,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        type: LeaveType.HOLIDAY,
                        reason: data.reason,
                        status: LeaveStatus.APPROVED,
                        approverId: data.approverId,
                        numberOfDays,
                        holidayBatchId: batchId,
                        holidayBatchName: batchName
                    });
                    
                    await queryRunner.manager.save(leave);
                    successCount++;
                } catch (error: any) {
                    errors.push({
                        userId: user.id,
                        message: `Failed to create holiday for user ${user.fullName}: ${error.message}`
                    });
                }
            }
            
            await queryRunner.commitTransaction();
            
            return {
                success: true,
                count: successCount,
                errors,
                batchId
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Lấy danh sách tất cả các đợt nghỉ lễ
    public async getHolidayBatches(): Promise<HolidayBatch[]> {
        try {
            // Lấy dữ liệu từ đơn nghỉ phép và nhóm theo holidayBatchId
            const results = await this.leaveRepository
                .createQueryBuilder('leave')
                .select('leave.holidayBatchId', 'id')
                .addSelect('leave.holidayBatchName', 'name')
                .addSelect('MIN(leave.startDate)', 'startDate')
                .addSelect('MAX(leave.endDate)', 'endDate')
                .addSelect('leave.reason', 'reason')
                .addSelect('leave.approverId', 'createdBy')
                .addSelect('MIN(leave.createdAt)', 'createdAt')
                .addSelect('COUNT(leave.id)', 'leaveCount')
                .where('leave.holidayBatchId IS NOT NULL')
                .groupBy('leave.holidayBatchId')
                .addGroupBy('leave.holidayBatchName')
                .addGroupBy('leave.reason')
                .addGroupBy('leave.approverId')
                .orderBy('MIN(leave.createdAt)', 'DESC')
                .getRawMany();

            return results.map(result => ({
                id: result.id,
                name: result.name,
                startDate: new Date(result.startDate),
                endDate: new Date(result.endDate),
                reason: result.reason,
                createdBy: result.createdBy,
                createdAt: new Date(result.createdAt),
                leaveCount: parseInt(result.leaveCount)
            }));
        } catch (error) {
            throw error;
        }
    }

    // Xóa một đợt nghỉ lễ và tất cả các đơn nghỉ liên quan
    public async deleteHolidayBatch(batchId: string): Promise<{ success: boolean, deletedCount: number }> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Xóa tất cả đơn nghỉ thuộc đợt nghỉ này
            const result = await queryRunner.manager.delete(Leave, { holidayBatchId: batchId });
            
            await queryRunner.commitTransaction();
            
            return {
                success: true,
                deletedCount: result.affected || 0
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Lấy thông tin chi tiết về một đợt nghỉ lễ
    public async getHolidayBatchDetails(batchId: string): Promise<{ batch: HolidayBatch, leaves: Leave[] }> {
        try {
            // Lấy thông tin về đợt nghỉ
            const batchesResult = await this.leaveRepository
                .createQueryBuilder('leave')
                .select('leave.holidayBatchId', 'id')
                .addSelect('leave.holidayBatchName', 'name')
                .addSelect('MIN(leave.startDate)', 'startDate')
                .addSelect('MAX(leave.endDate)', 'endDate')
                .addSelect('leave.reason', 'reason')
                .addSelect('leave.approverId', 'createdBy')
                .addSelect('MIN(leave.createdAt)', 'createdAt')
                .addSelect('COUNT(leave.id)', 'leaveCount')
                .where('leave.holidayBatchId = :batchId', { batchId })
                .groupBy('leave.holidayBatchId')
                .addGroupBy('leave.holidayBatchName')
                .addGroupBy('leave.reason')
                .addGroupBy('leave.approverId')
                .getRawOne();

            if (!batchesResult) {
                throw new Error('Holiday batch not found');
            }

            const batch: HolidayBatch = {
                id: batchesResult.id,
                name: batchesResult.name,
                startDate: new Date(batchesResult.startDate),
                endDate: new Date(batchesResult.endDate),
                reason: batchesResult.reason,
                createdBy: batchesResult.createdBy,
                createdAt: new Date(batchesResult.createdAt),
                leaveCount: parseInt(batchesResult.leaveCount)
            };

            // Lấy danh sách đơn nghỉ thuộc đợt nghỉ này
            const leaves = await this.leaveRepository.find({
                where: { holidayBatchId: batchId },
                relations: ['user', 'user.department', 'approver'],
                order: { createdAt: 'DESC' }
            });

            return { batch, leaves };
        } catch (error) {
            throw error;
        }
    }

    public async updateLeaveStatus(
        leaveId: number,
        data: UpdateLeaveStatusData
    ): Promise<Leave> {
        try {
            const leave = await this.leaveRepository.findOne({
                where: { id: leaveId },
                relations: ['user']
            });

            if (!leave) {
                throw new Error('Leave request not found');
            }

            if (leave.status !== LeaveStatus.PENDING) {
                throw new Error('Leave request has already been processed');
            }

            // Update leave status
            leave.status = data.status;
            leave.approverId = data.approverId;
            
            if (data.status === LeaveStatus.REJECTED && data.rejectionReason) {
                leave.rejectionReason = data.rejectionReason;
            }

            // If approved and it's annual leave, update user's remaining leaves
            if (data.status === LeaveStatus.APPROVED && leave.type === LeaveType.ANNUAL) {
                const user = leave.user;
                user.remainingLeaves -= leave.numberOfDays;
                await this.userRepository.save(user);
            }

            await this.leaveRepository.save(leave);
            return leave;

        } catch (error) {
            throw error;
        }
    }

    public async getPendingLeaves(): Promise<Leave[]> {
        try {
            return await this.leaveRepository.find({
                where: { status: LeaveStatus.PENDING },
                relations: ['user', 'user.department', 'approver'],
                order: { createdAt: 'ASC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getUserLeaves(userId: number): Promise<Leave[]> {
        try {
            return await this.leaveRepository
                .createQueryBuilder('leave')
                .leftJoinAndSelect('leave.user', 'user')
                .leftJoinAndSelect('leave.approver', 'approver')
                .leftJoinAndSelect('user.department', 'department')
                .where('leave.userId = :userId', { userId })
                .orderBy('leave.createdAt', 'DESC')
                .getMany();
        } catch (error) {
            throw error;
        }
    }

    public async getLeavesByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<Leave[]> {
        try {
            return await this.leaveRepository.find({
                where: {
                    startDate: Between(startDate, endDate),
                    status: LeaveStatus.APPROVED
                },
                relations: ['user', 'user.department', 'approver'],
                order: { startDate: 'ASC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getLeaveById(id: number): Promise<Leave | null> {
        try {
            // Check if the provided ID is a valid number
            if (isNaN(id) || !Number.isInteger(id)) {
                console.error(`Invalid ID passed to getLeaveById: ${id}`);
                return null; // Return null if ID is not a valid integer
            }
            return await this.leaveRepository.findOne({
                where: { id },
                relations: ['user', 'user.department', 'approver']
            });
        } catch (error) {
            throw error;
        }
    }

    public async getAllLeaves(filters: GetAllLeavesFilter): Promise<Leave[]> {
        try {
            const query = this.leaveRepository.createQueryBuilder('leave')
                .leftJoinAndSelect('leave.user', 'user')
                .leftJoinAndSelect('user.department', 'department')
                .leftJoinAndSelect('leave.approver', 'approver')
                .orderBy('leave.createdAt', 'DESC');

            if (filters.startDate && filters.endDate) {
                query.andWhere(
                    '(leave.startDate BETWEEN :startDate AND :endDate OR leave.endDate BETWEEN :startDate AND :endDate)',
                    { startDate: filters.startDate, endDate: filters.endDate }
                );
            }

            if (filters.status) {
                query.andWhere('leave.status = :status', { status: filters.status });
            }

            if (filters.type) {
                query.andWhere('leave.type = :type', { type: filters.type });
            }

            if (filters.holidayBatchId) {
                query.andWhere('leave.holidayBatchId = :holidayBatchId', { holidayBatchId: filters.holidayBatchId });
            }

            return await query.getMany();
        } catch (error) {
            throw error;
        }
    }

    public async deleteLeave(id: number): Promise<boolean> {
        try {
            const leave = await this.getLeaveById(id);
            if (!leave) {
                throw new Error('Leave request not found');
            }

            // Delete the leave
            const result = await this.leaveRepository.delete(id);
            return result.affected === 1;
        } catch (error) {
            throw error;
        }
    }
}

export const leaveService = LeaveService.getInstance();