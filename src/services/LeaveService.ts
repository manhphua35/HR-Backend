import { AppDataSource } from '../config/data-source';
import { Leave, LeaveStatus, LeaveType } from '../entities/leave/Leave';
import { User } from '../entities/core/User';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

interface CreateLeaveData {
    userId: number;
    startDate: Date;
    endDate: Date;
    type: LeaveType;
    reason?: string;
    numberOfDays: number;
}

interface UpdateLeaveStatusData {
    status: LeaveStatus;
    approverId: number;
    rejectionReason?: string;
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
                relations: ['user', 'approver'],
                order: { createdAt: 'ASC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getUserLeaves(userId: number): Promise<Leave[]> {
        try {
            return await this.leaveRepository.find({
                where: { userId },
                relations: ['approver'],
                order: { createdAt: 'DESC' }
            });
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
                relations: ['user', 'approver'],
                order: { startDate: 'ASC' }
            });
        } catch (error) {
            throw error;
        }
    }

    public async getLeaveById(id: number): Promise<Leave | null> {
        try {
            return await this.leaveRepository.findOne({
                where: { id },
                relations: ['user', 'approver']
            });
        } catch (error) {
            throw error;
        }
    }
}

export const leaveService = LeaveService.getInstance();