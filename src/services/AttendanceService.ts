import { Repository, FindManyOptions, Between, IsNull, Not } from 'typeorm'; // Added IsNull, Not
import { Attendance, AttendanceStatus } from '../entities/attendance/Attendance';
import { User } from '../entities/core/User';
import { AppDataSource } from '../config/data-source'; // Import AppDataSource
import { Leave } from '../entities/leave/Leave'; // Import Leave entity
import { RoleType } from '../entities/auth/Role'; // Import RoleType

// Định nghĩa kiểu cho user đã xác thực từ token
interface AuthenticatedUser {
    userId: number;
    roleType: RoleType;
    permissions: string[];
    departmentId?: number;
}

export class AttendanceService {
    private attendanceRepository: Repository<Attendance>;
    private userRepository: Repository<User>;
    private leaveRepository: Repository<Leave>; // Add leave repository if needed for linking

    constructor(
        attendanceRepository: Repository<Attendance>,
        userRepository: Repository<User>
    ) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.leaveRepository = AppDataSource.getRepository(Leave); // Initialize leave repository
    }

    // Helper function to check view permissions using AuthenticatedUser
    private async checkViewPermission(requestingUser: AuthenticatedUser, targetUserId?: number, targetDepartmentId?: number): Promise<boolean> {
        const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;

        if (roleType === RoleType.SYSTEM_ADMIN || roleType === RoleType.HR_STAFF) {
            return true; // Admin/HR can view all
        }

        if (roleType === RoleType.DEPARTMENT_HEAD) {
            if (!reqUserDeptId) return false; // Manager must belong to a department

            // Check if viewing own department or specific user within own department
            if (targetDepartmentId && targetDepartmentId === reqUserDeptId) {
                return true; // Can view own department data
            }
            if (targetUserId) {
                // Check if the target user belongs to the manager's department
                const targetUser = await this.userRepository.findOne({ where: { id: targetUserId, department: { id: reqUserDeptId } } });
                return !!targetUser; // Return true if the user exists in their department
            }
            // Manager viewing general list - allow if filtered implicitly to their department later
             return !targetUserId && !targetDepartmentId; // Allow if no specific target outside dept is requested
        }

        // Regular employee (EMPLOYEE)
        if (targetUserId && targetUserId === userId) {
            return true; // Can view own data
        }
        // Allow viewing own data implicitly when no filters are applied by employee
        if (!targetUserId && !targetDepartmentId) {
             return true; // Let the main query handle filtering by requestingUser.userId
        }


        return false; // Default deny
    }

     // Helper function to check edit/delete permissions using AuthenticatedUser
    private async checkModifyPermission(requestingUser: AuthenticatedUser, attendanceRecord: Attendance): Promise<boolean> {
        const { userId, roleType, departmentId: reqUserDeptId } = requestingUser;

        if (roleType === RoleType.SYSTEM_ADMIN || roleType === RoleType.HR_STAFF) {
            return true; // Admin/HR can modify all
        }

        // Potentially allow managers to modify records in their department?
        if (roleType === RoleType.DEPARTMENT_HEAD) {
             if (!reqUserDeptId) return false; // Manager must belong to a department
             // Check if the record belongs to a user in the manager's department
             // Need to ensure attendanceRecord.user.department is loaded or query it
             const recordUserId = attendanceRecord.user?.id; // Use optional chaining
             if (!recordUserId) return false; // Should not happen if relation is loaded

             // Efficient check: see if user exists in the department
             const userExistsInDept = await this.userRepository.exists({ where: { id: recordUserId, department: { id: reqUserDeptId } } });
             return userExistsInDept; // Allow if user is in their department
        }


        // Allow users to modify their *own* records under certain conditions?
        if (attendanceRecord.user?.id === userId) { // Use optional chaining
            // Example: Allow only adding notes, not changing times after a certain period
            // For now, let's allow full modification of own record for simplicity
            return true;
        }


        return false; // Default deny
    }


    // Get attendances with permission checks using AuthenticatedUser
    async getAttendances(
        requestingUser: AuthenticatedUser, // Changed to AuthenticatedUser
        userId?: string,
        departmentId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<Attendance[]> {
        const { userId: requestingUserId, roleType, departmentId: managerDepartmentId } = requestingUser;

        const options: FindManyOptions<Attendance> = {
            relations: ['user', 'user.role', 'user.department', 'leaveRequest'],
            order: { date: 'DESC', checkInTime: 'ASC' },
        };
        const where: any = {};

        // --- Input Parsing ---
        const targetUserIdNum = userId ? parseInt(userId, 10) : undefined;
        const targetDepartmentIdNum = departmentId ? parseInt(departmentId, 10) : undefined;

        if (userId && isNaN(targetUserIdNum!)) throw new Error('User ID không hợp lệ.');
        if (departmentId && isNaN(targetDepartmentIdNum!)) throw new Error('Department ID không hợp lệ.');

        // --- Date range filtering ---
        if (startDate && endDate) {
            where.date = Between(startDate, endDate);
        } else if (startDate) {
            where.date = Between(startDate, new Date().toISOString().split('T')[0]);
        }

        // --- Permission-Based Filtering ---
        if (roleType === RoleType.SYSTEM_ADMIN || roleType === RoleType.HR_STAFF) {
            // Admin/HR can view all, apply filters if provided
            if (targetUserIdNum) where.user = { id: targetUserIdNum };
            if (targetDepartmentIdNum) {
                if (where.user?.id) { // Combine filters if both exist
                    where.user.department = { id: targetDepartmentIdNum };
                } else {
                    where.user = { department: { id: targetDepartmentIdNum } };
                }
            }
        } else if (roleType === RoleType.DEPARTMENT_HEAD) {
            if (!managerDepartmentId) throw new Error('Trưởng phòng không thuộc phòng ban nào.');

            where.user = { department: { id: managerDepartmentId } }; // Base filter: own department

            if (targetUserIdNum) {
                // Ensure the target user is actually in the manager's department
                if (!await this.userRepository.exists({ where: { id: targetUserIdNum, department: { id: managerDepartmentId } } })) {
                    return []; // User not in manager's department
                }
                where.user.id = targetUserIdNum; // Add specific user filter
            }
            // If departmentId is provided, it must match the manager's department (already handled by base filter)
            if (targetDepartmentIdNum && targetDepartmentIdNum !== managerDepartmentId) {
                return []; // Trying to query outside own department
            }
        } else { // Employee
            where.user = { id: requestingUserId }; // Can only view their own
            // If they try to filter by another userId or departmentId, deny access (return empty)
            if ((targetUserIdNum && targetUserIdNum !== requestingUserId) || targetDepartmentIdNum) {
                return [];
            }
        }

        options.where = where;
        return this.attendanceRepository.find(options);
    }

    // Get single attendance by ID with permission check using AuthenticatedUser
    async getAttendanceById(requestingUser: AuthenticatedUser, id: string): Promise<Attendance | null> { // Changed to AuthenticatedUser
        const attendance = await this.attendanceRepository.findOne({
            where: { id },
            relations: ['user', 'user.role', 'user.department', 'leaveRequest'], // Ensure department is loaded for user
        });

        if (!attendance) return null;

        // Check permission based on the record's user/department
        const canView = await this.checkViewPermission(requestingUser, attendance.user?.id, attendance.user?.department?.id); // Use optional chaining

        if (!canView) throw new Error('Forbidden');

        return attendance;
    }

     // Create or Update Attendance Record (e.g., for manual entry or corrections by HR/Admin)
     // This method might not need requestingUser if permissions are checked in controller or a dedicated method
     async createOrUpdateAttendance(attendanceData: Partial<Attendance> & { userId: string }): Promise<Attendance> {
         // Permission should ideally be checked before calling this method (e.g., in controller)
         // based on who is allowed to create/update records for others.

         const { userId, date, ...restData } = attendanceData;
         const userIdNum = parseInt(userId, 10);

         if (isNaN(userIdNum) || !date) {
             throw new Error('User ID và Ngày là bắt buộc và User ID phải là số.');
         }

         const user = await this.userRepository.findOneBy({ id: userIdNum });
         if (!user) throw new Error(`Không tìm thấy người dùng với ID ${userIdNum}`);

         let attendance = await this.attendanceRepository.findOne({ where: { user: { id: userIdNum }, date } });

         if (attendance) { // Update existing record
            // Consider if status should be automatically updated based on times
            Object.assign(attendance, restData);
             if (attendance.checkInTime && attendance.checkOutTime) {
                attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
            } else {
                 attendance.workHours = null; // Reset if check-in or check-out is removed
            }
             // If status is manually set to leave, clear times and set workHours
             if (restData.status === AttendanceStatus.LEAVE) {
                 attendance.checkInTime = null;
                 attendance.checkOutTime = null;
                 attendance.workHours = 0; // Or null
                 // Link leave request if provided
                 if (restData.leaveRequest) attendance.leaveRequest = restData.leaveRequest;
             } else if (restData.status === AttendanceStatus.PRESENT && attendance.checkInTime && !attendance.checkOutTime) {
                 // If marked present manually, ensure work hours are null until checkout
                 attendance.workHours = null;
                 attendance.leaveRequest = null; // Unlink leave if marked present
             } else if (restData.status === AttendanceStatus.ABSENT) {
                 attendance.checkInTime = null;
                 attendance.checkOutTime = null;
                 attendance.workHours = 0; // Or null
                 attendance.leaveRequest = null;
             }

        } else { // Create new record
            attendance = this.attendanceRepository.create({
                ...restData,
                user: user,
                date: date,
                 workHours: (restData.checkInTime && restData.checkOutTime)
                 ? this.calculateWorkHours(restData.checkInTime, restData.checkOutTime)
                 : (restData.status === AttendanceStatus.LEAVE ? 0 : null), // Set workHours for leave on creation
                 // Ensure status matches times if possible, default to ABSENT if no info
                 status: restData.status ?? (restData.checkInTime ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT),
            });
             // If created as leave, clear times
             if (attendance.status === AttendanceStatus.LEAVE) {
                 attendance.checkInTime = null;
                 attendance.checkOutTime = null;
             }
        }

        return this.attendanceRepository.save(attendance);
    }

     // Update an existing attendance record with permission check using AuthenticatedUser
    async updateAttendance(requestingUser: AuthenticatedUser, id: string, attendanceData: Partial<Attendance>): Promise<Attendance | null> { // Changed to AuthenticatedUser
        const attendance = await this.attendanceRepository.findOne({
             where: { id },
             relations: ['user', 'user.department'] // Ensure user and department are loaded
            });

        if (!attendance) return null; // Not found

        const canModify = await this.checkModifyPermission(requestingUser, attendance);
        if (!canModify) throw new Error('Forbidden');

        // Prevent changing the user or date via this method
        delete attendanceData.user;
        delete attendanceData.date;
        delete attendanceData.id; // Cannot change ID

        // Prevent employee from changing status or times directly? Only allow notes?
        if (requestingUser.roleType === RoleType.EMPLOYEE && requestingUser.userId === attendance.user?.id) {
             // Allow only notes update for employees?
             const allowedUpdates: Partial<Attendance> = {};
             if (attendanceData.notes !== undefined) {
                 allowedUpdates.notes = attendanceData.notes;
             }
             // Maybe allow correcting check-in/out within a short timeframe? (More complex)

             attendanceData = allowedUpdates; // Restrict updates
             if (Object.keys(attendanceData).length === 0) return attendance; // No allowed fields to update
        }


        Object.assign(attendance, attendanceData);

         // Recalculate work hours if checkIn and checkOut times are updated
        if (attendanceData.checkInTime !== undefined || attendanceData.checkOutTime !== undefined) {
             if (attendance.checkInTime && attendance.checkOutTime) {
                 attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
             } else {
                 attendance.workHours = null; // Reset if one is missing
             }
        }
         // If status is manually set to leave, clear times and set workHours
         if (attendanceData.status === AttendanceStatus.LEAVE) {
             attendance.checkInTime = null;
             attendance.checkOutTime = null;
             attendance.workHours = 0; // Or null
             // Link leave request if provided
             if (attendanceData.leaveRequest) attendance.leaveRequest = attendanceData.leaveRequest;
         } else if (attendanceData.status === AttendanceStatus.ABSENT) {
             attendance.checkInTime = null;
             attendance.checkOutTime = null;
             attendance.workHours = 0; // Or null
             attendance.leaveRequest = null;
         } else if (attendanceData.status === AttendanceStatus.PRESENT) {
             // If marked present, ensure leave request is unlinked
             attendance.leaveRequest = null;
         }


        return this.attendanceRepository.save(attendance);
    }


    // Delete attendance record with permission check using AuthenticatedUser
    async deleteAttendance(requestingUser: AuthenticatedUser, id: string): Promise<boolean> { // Changed to AuthenticatedUser
         const attendance = await this.attendanceRepository.findOne({
             where: { id },
             relations: ['user', 'user.department'] // Load relations needed for permission check
            });

        if (!attendance) return false; // Not found

        const canModify = await this.checkModifyPermission(requestingUser, attendance);
         if (!canModify) throw new Error('Forbidden');

        const deleteResult = await this.attendanceRepository.delete(id);
        return !!deleteResult.affected && deleteResult.affected > 0;
    }

    // --- Check-in/Check-out Logic ---
    // These methods operate on a specific userId, permission is checked in controller

    private getCurrentDate(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    private getCurrentTime(): string {
        const now = new Date();
        // Ensure HH:MM:SS format even if seconds/minutes are single digit
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`; // HH:MM:SS
    }

     // Calculate work hours (simple example, might need refinement based on break times etc.)
     private calculateWorkHours(checkIn: string, checkOut: string): number | null {
        try {
            // Use today's date just to parse time correctly, avoid timezone issues across days
            const todayStr = this.getCurrentDate(); // Use current date for calculation context
            const checkInDateTime = new Date(`${todayStr}T${checkIn}`);
            const checkOutDateTime = new Date(`${todayStr}T${checkOut}`);


            if (isNaN(checkInDateTime.getTime()) || isNaN(checkOutDateTime.getTime()) || checkOutDateTime <= checkInDateTime) {
                 console.warn(`Invalid times for work hour calculation: In: ${checkIn}, Out: ${checkOut}`);
                return null; // Invalid times or checkout before checkin
            }

            const diffMilliseconds = checkOutDateTime.getTime() - checkInDateTime.getTime();
            const diffHours = diffMilliseconds / (1000 * 60 * 60);
            // Consider rounding rules, e.g., round to nearest quarter hour?
            return parseFloat(diffHours.toFixed(2)); // Return hours with 2 decimal places
        } catch (e) {
            console.error("Error calculating work hours:", e);
            return null;
        }
    }


    async checkIn(userId: number, notes?: string): Promise<Attendance> {
        const today = this.getCurrentDate();
        const now = this.getCurrentTime();

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new Error(`Không tìm thấy người dùng với ID ${userId}`);

        let attendance = await this.attendanceRepository.findOne({ where: { user: { id: userId }, date: today } });

        if (attendance) { // Record exists for today
            if (attendance.checkInTime) throw new Error('Bạn đã check-in hôm nay rồi.');

            // If record exists (e.g., from leave) but no check-in, update it
            attendance.checkInTime = now;
            // TODO: Add logic for LATE status based on expected start time
            attendance.status = AttendanceStatus.PRESENT;
            attendance.notes = notes ?? attendance.notes; // Append or replace notes? Let's replace for now.
            attendance.leaveRequest = null; // Remove leave link if checking in
            attendance.workHours = null; // Reset work hours until checkout
        } else { // Create new record
            attendance = this.attendanceRepository.create({
                user: user,
                date: today,
                checkInTime: now,
                // TODO: Add logic for LATE status
                status: AttendanceStatus.PRESENT,
                notes: notes,
            });
        }

        return this.attendanceRepository.save(attendance);
    }

    async checkOut(userId: number, notes?: string): Promise<Attendance> {
        const today = this.getCurrentDate();
        const now = this.getCurrentTime();

        const attendance = await this.attendanceRepository.findOne({ where: { user: { id: userId }, date: today } });

        if (!attendance) throw new Error('Bạn chưa check-in hôm nay.');
        if (!attendance.checkInTime) throw new Error('Bản ghi chấm công hôm nay không có giờ check-in. Vui lòng liên hệ HR.');
        if (attendance.checkOutTime) throw new Error('Bạn đã check-out hôm nay rồi.');

        attendance.checkOutTime = now;
        // TODO: Add logic for EARLY_LEAVE status based on expected end time
        attendance.notes = notes ?? attendance.notes; // Replace notes for now.

        // Calculate work hours
        attendance.workHours = this.calculateWorkHours(attendance.checkInTime, attendance.checkOutTime);
        // Update status if needed based on work hours? (e.g., if less than expected)


        return this.attendanceRepository.save(attendance);
    }

     // Mark attendance as Leave - potentially called when a leave request is approved
     async markAsLeave(userId: number, date: string, leaveRequestId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new Error(`Không tìm thấy người dùng với ID ${userId}`);

        const leaveRequest = await this.leaveRepository.findOneBy({ id: leaveRequestId });
         if (!leaveRequest) throw new Error(`Không tìm thấy đơn nghỉ phép với ID ${leaveRequestId}`);

        let attendance = await this.attendanceRepository.findOne({ where: { user: { id: userId }, date } });

        if (attendance) { // Update existing record
            attendance.status = AttendanceStatus.LEAVE;
            attendance.checkInTime = null;
            attendance.checkOutTime = null;
            attendance.workHours = 0; // Or null
            attendance.leaveRequest = leaveRequest;
            attendance.notes = `Nghỉ phép - Đơn: ${leaveRequestId}`; // Overwrite notes
        } else { // Create new record marked as leave
            attendance = this.attendanceRepository.create({
                user: user,
                date: date,
                status: AttendanceStatus.LEAVE,
                workHours: 0, // Or null
                leaveRequest: leaveRequest,
                notes: `Nghỉ phép - Đơn: ${leaveRequestId}`,
            });
        }
        await this.attendanceRepository.save(attendance);
    }

}