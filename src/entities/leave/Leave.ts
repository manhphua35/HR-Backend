import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../core/User";

export enum LeaveStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum LeaveType {
    ANNUAL = "ANNUAL",
    SICK = "SICK",
    UNPAID = "UNPAID",
    OTHER = "OTHER"
}

@Entity("leaves")
export class Leave {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ type: "date" })
    startDate: Date;

    @Column({ type: "date" })
    endDate: Date;

    @Column({
        type: "enum",
        enum: LeaveType,
        default: LeaveType.ANNUAL
    })
    type: LeaveType;

    @Column({ type: "text", nullable: true })
    reason: string;

    @Column({
        type: "enum",
        enum: LeaveStatus,
        default: LeaveStatus.PENDING
    })
    status: LeaveStatus;

    @Column({ name: "approver_id", nullable: true })
    approverId: number;

    @Column({ type: "text", nullable: true })
    rejectionReason: string;

    @Column({ type: "int" })
    numberOfDays: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: "approver_id" })
    approver: User;
}
