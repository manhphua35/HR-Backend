import { Request, Response } from 'express';
import { leaveService } from '../services/LeaveService';
import { LeaveStatus, LeaveType } from '../entities/leave/Leave';
import { RoleType } from '../entities/auth/Role';

class LeaveController {
    private static instance: LeaveController;

    public static getInstance(): LeaveController {
        if (!LeaveController.instance) {
            LeaveController.instance = new LeaveController();
        }
        return LeaveController.instance;
    }

    public async createLeave(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate, type, reason, numberOfDays } = req.body;

            // Validate required fields
            if (!startDate || !endDate || !type || !numberOfDays) {
                res.status(400).json({
                    success: false,
                    message: 'Start date, end date, type and number of days are required'
                });
                return;
            }

            // Validate date format and range
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format'
                });
                return;
            }

            if (start > end) {
                res.status(400).json({
                    success: false,
                    message: 'End date must be after start date'
                });
                return;
            }

            // Validate leave type
            if (!Object.values(LeaveType).includes(type)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid leave type'
                });
                return;
            }

            const leave = await leaveService.createLeave({
                userId: req.user!.userId,
                startDate: start,
                endDate: end,
                type,
                reason,
                numberOfDays
            });

            res.status(201).json({
                success: true,
                data: leave,
                message: 'Leave request created successfully'
            });

        } catch (error: any) {
            console.error('Error creating leave request:', error);

            if (error.message === 'Insufficient remaining leave days' ||
                error.message === 'Overlapping leave request exists') {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async updateLeaveStatus(req: Request, res: Response): Promise<void> {
        try {
            // Check if user is HR staff
            if (req.user?.roleType !== RoleType.HR_STAFF) {
                res.status(403).json({
                    success: false,
                    message: 'Only HR staff can approve/reject leave requests'
                });
                return;
            }

            const leaveId = parseInt(req.params.id);
            const { status, rejectionReason } = req.body;

            // Validate status
            if (!Object.values(LeaveStatus).includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid leave status'
                });
                return;
            }

            // Validate rejection reason when rejecting
            if (status === LeaveStatus.REJECTED && !rejectionReason) {
                res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required when rejecting a leave request'
                });
                return;
            }

            const updatedLeave = await leaveService.updateLeaveStatus(leaveId, {
                status,
                approverId: req.user.userId,
                rejectionReason
            });

            res.status(200).json({
                success: true,
                data: updatedLeave,
                message: `Leave request ${status.toLowerCase()} successfully`
            });

        } catch (error: any) {
            console.error('Error updating leave status:', error);

            if (error.message === 'Leave request not found') {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            if (error.message === 'Leave request has already been processed') {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getPendingLeaves(req: Request, res: Response): Promise<void> {
        try {
            // Check if user is HR staff
            if (req.user?.roleType !== RoleType.HR_STAFF) {
                res.status(403).json({
                    success: false,
                    message: 'Only HR staff can view pending leave requests'
                });
                return;
            }

            const leaves = await leaveService.getPendingLeaves();

            res.status(200).json({
                success: true,
                data: leaves
            });

        } catch (error) {
            console.error('Error getting pending leaves:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getUserLeaves(req: Request, res: Response): Promise<void> {
        try {
            const leaves = await leaveService.getUserLeaves(req.user!.userId);

            res.status(200).json({
                success: true,
                data: leaves
            });

        } catch (error) {
            console.error('Error getting user leaves:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getLeaveById(req: Request, res: Response): Promise<void> {
        try {
            const leaveId = parseInt(req.params.id);
            const leave = await leaveService.getLeaveById(leaveId);

            if (!leave) {
                res.status(404).json({
                    success: false,
                    message: 'Leave request not found'
                });
                return;
            }

            // Check if user has permission to view this leave
            if (leave.userId !== req.user!.userId && 
                req.user?.roleType !== RoleType.HR_STAFF) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: leave
            });

        } catch (error) {
            console.error('Error getting leave:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const leaveController = LeaveController.getInstance();