import { Request, Response } from 'express';
import { leaveService } from '../services/LeaveService';
import { LeaveStatus, LeaveType } from '../entities/leave/Leave';
import { RoleType } from '../entities/auth/Role';

// Định nghĩa kiểu cho req.user từ middleware
interface AuthenticatedUser {
    userId: number;
    roleType: RoleType;
    permissions: string[];
    departmentId?: number;
}

class LeaveController {
    private static instance: LeaveController;

    public static getInstance(): LeaveController {
        if (!LeaveController.instance) {
            LeaveController.instance = new LeaveController();
        }
        return LeaveController.instance;
    }

    // Thêm phương thức mới để tạo kỳ nghỉ lễ cho tất cả nhân viên
    public async createHoliday(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền (chỉ SYSTEM_ADMIN và HR_STAFF mới có quyền tạo nghỉ lễ)
            if (req.user?.roleType !== RoleType.SYSTEM_ADMIN && req.user?.roleType !== RoleType.HR_STAFF) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền tạo kỳ nghỉ lễ'
                });
                return;
            }

            const { startDate, endDate, reason, departmentIds, batchName } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!startDate || !endDate || !reason) {
                res.status(400).json({
                    success: false,
                    message: 'Ngày bắt đầu, ngày kết thúc và lý do là bắt buộc'
                });
                return;
            }

            // Kiểm tra định dạng ngày
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Định dạng ngày không hợp lệ'
                });
                return;
            }

            if (start > end) {
                res.status(400).json({
                    success: false,
                    message: 'Ngày kết thúc phải sau ngày bắt đầu'
                });
                return;
            }

            // Nếu có departmentIds, kiểm tra định dạng
            let departmentIdsArray: number[] | undefined;
            if (departmentIds) {
                if (!Array.isArray(departmentIds)) {
                    res.status(400).json({
                        success: false,
                        message: 'departmentIds phải là một mảng các ID phòng ban'
                    });
                    return;
                }
                departmentIdsArray = departmentIds.map((id: any) => Number(id));
            }

            // Gọi service để tạo kỳ nghỉ lễ
            const result = await leaveService.createHoliday({
                startDate: start,
                endDate: end,
                reason,
                approverId: req.user.userId,
                departmentIds: departmentIdsArray,
                batchName
            });

            res.status(201).json({
                success: true,
                message: `Đã tạo thành công ${result.count} đơn nghỉ lễ`,
                data: result
            });

        } catch (error: any) {
            console.error('Lỗi khi tạo kỳ nghỉ lễ:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server'
            });
        }
    }

    // Lấy danh sách các đợt nghỉ lễ
    public async getHolidayBatches(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền
            const userRoleType = req.user?.roleType as RoleType;
            if (![RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF].includes(userRoleType)) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem danh sách đợt nghỉ lễ'
                });
                return;
            }

            const batches = await leaveService.getHolidayBatches();

            res.status(200).json({
                success: true,
                data: batches
            });
        } catch (error: any) {
            console.error('Lỗi khi lấy danh sách đợt nghỉ lễ:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server'
            });
        }
    }

    // Lấy chi tiết một đợt nghỉ lễ
    public async getHolidayBatchDetails(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền
            const userRoleType = req.user?.roleType as RoleType;
            if (![RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF].includes(userRoleType)) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem chi tiết đợt nghỉ lễ'
                });
                return;
            }

            const batchId = req.params.batchId;
            if (!batchId) {
                res.status(400).json({
                    success: false,
                    message: 'ID đợt nghỉ là bắt buộc'
                });
                return;
            }

            const result = await leaveService.getHolidayBatchDetails(batchId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Lỗi khi lấy chi tiết đợt nghỉ lễ:', error);
            
            if (error.message === 'Holiday batch not found') {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đợt nghỉ lễ'
                });
                return;
            }
            
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server'
            });
        }
    }

    // Xóa một đợt nghỉ lễ và tất cả đơn nghỉ liên quan
    public async deleteHolidayBatch(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền
            const userRoleType = req.user?.roleType as RoleType;
            if (![RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF].includes(userRoleType)) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa đợt nghỉ lễ'
                });
                return;
            }

            const batchId = req.params.batchId;
            if (!batchId) {
                res.status(400).json({
                    success: false,
                    message: 'ID đợt nghỉ là bắt buộc'
                });
                return;
            }

            const result = await leaveService.deleteHolidayBatch(batchId);

            res.status(200).json({
                success: true,
                message: `Đã xóa thành công ${result.deletedCount} đơn nghỉ phép thuộc đợt nghỉ này`,
                data: result
            });
        } catch (error: any) {
            console.error('Lỗi khi xóa đợt nghỉ lễ:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server'
            });
        }
    }

    // Lấy nghỉ phép theo ngày cụ thể
    public async getLeavesBySpecificDate(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
            if (!requestingUser) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
                return;
            }

            const { date, userId, departmentId } = req.query;
            
            // Kiểm tra tham số date
            if (!date) {
                res.status(400).json({
                    success: false,
                    message: 'Date parameter is required'
                });
                return;
            }

            // Kiểm tra định dạng ngày (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date as string)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
                return;
            }

            const userIdNum = userId ? parseInt(userId as string) : undefined;
            const departmentIdNum = departmentId ? parseInt(departmentId as string) : undefined;

            const leaves = await leaveService.getLeavesBySpecificDate(
                requestingUser,
                date as string,
                userIdNum,
                departmentIdNum
            );

            res.status(200).json({
                success: true,
                data: leaves
            });

        } catch (error) {
            console.error('Error getting leaves by specific date:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Lấy nghỉ phép theo tháng
    public async getLeavesByMonth(req: Request, res: Response): Promise<void> {
        try {
            const requestingUser = req.user as AuthenticatedUser;
            if (!requestingUser) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
                return;
            }

            const { year, month, userId, departmentId } = req.query;
            
            // Kiểm tra tham số year và month
            if (!year || !month) {
                res.status(400).json({
                    success: false,
                    message: 'Year and month parameters are required'
                });
                return;
            }

            const yearNum = parseInt(year as string);
            const monthNum = parseInt(month as string);

            if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid year or month'
                });
                return;
            }

            const userIdNum = userId ? parseInt(userId as string) : undefined;
            const departmentIdNum = departmentId ? parseInt(departmentId as string) : undefined;

            const leaves = await leaveService.getLeavesByMonth(
                requestingUser,
                yearNum,
                monthNum,
                userIdNum,
                departmentIdNum
            );

            res.status(200).json({
                success: true,
                data: leaves
            });

        } catch (error) {
            console.error('Error getting leaves by month:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
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
            if (req.user?.roleType !== RoleType.HR_STAFF && req.user?.roleType !== RoleType.SYSTEM_ADMIN) {
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

    public async getAllLeaves(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            // Check if user has permission
            if (![RoleType.SYSTEM_ADMIN, RoleType.HR_STAFF].includes(req.user.roleType)) {
                res.status(403).json({
                    success: false,
                    message: 'Only system administrators and HR staff can view all leave requests'
                });
                return;
            }

            // Get filter parameters from query
            const {
                startDate,
                endDate,
                status,
                type
            } = req.query;

            const leaves = await leaveService.getAllLeaves({
                startDate: startDate as string,
                endDate: endDate as string,
                status: status as LeaveStatus,
                type: type as LeaveType
            });

            res.status(200).json({
                success: true,
                data: leaves
            });

        } catch (error) {
            console.error('Error getting all leaves:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async deleteLeave(req: Request, res: Response): Promise<void> {
        try {
            const leaveId = parseInt(req.params.id);
            
            // Check if leave exists
            const leave = await leaveService.getLeaveById(leaveId);
            if (!leave) {
                res.status(404).json({
                    success: false,
                    message: 'Leave request not found'
                });
                return;
            }

            // Check if user has permission to delete this leave
            const hasPermission = req.user?.roleType === RoleType.SYSTEM_ADMIN ||
                                req.user?.roleType === RoleType.HR_STAFF ||
                                (req.user?.roleType === RoleType.DEPARTMENT_HEAD &&
                                 req.user?.departmentId === leave.user.departmentId);

            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this leave request'
                });
                return;
            }

            const result = await leaveService.deleteLeave(leaveId);

            if (result) {
                res.status(200).json({
                    success: true,
                    message: 'Leave request deleted successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete leave request'
                });
            }

        } catch (error) {
            console.error('Error deleting leave:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const leaveController = LeaveController.getInstance();