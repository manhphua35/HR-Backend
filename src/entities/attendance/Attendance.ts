import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../core/User';
import { Leave } from '../leave/Leave'; // Giả sử bạn có entity Leave

export enum AttendanceStatus {
    PRESENT = 'present', // Có mặt
    ABSENT = 'absent',   // Vắng mặt
    LEAVE = 'leave',     // Nghỉ phép
    LATE = 'late',       // Đi muộn
    EARLY_LEAVE = 'early_leave', // Về sớm
}

@Entity('attendances')
export class Attendance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { eager: true }) // eager: true để tự động load thông tin user khi query attendance
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'date' })
    date: string; // Lưu ngày dưới dạng YYYY-MM-DD

    @Column({ type: 'time', nullable: true })
    checkInTime: string | null; // Giờ check-in

    @Column({ type: 'time', nullable: true })
    checkOutTime: string | null; // Giờ check-out

    @Column({
        type: 'enum',
        enum: AttendanceStatus,
        default: AttendanceStatus.ABSENT, // Mặc định là vắng mặt
    })
    status: AttendanceStatus;

    @Column({ type: 'double precision', nullable: true }) // Số giờ làm việc thực tế
    workHours: number | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null; // Ghi chú thêm (ví dụ: lý do đi muộn/về sớm)

    @ManyToOne(() => Leave, { nullable: true }) // Liên kết với đơn nghỉ phép nếu status là LEAVE
    @JoinColumn({ name: 'leave_request_id' })
    leaveRequest: Leave | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}