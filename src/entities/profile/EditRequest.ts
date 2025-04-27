import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "../core/User";

export enum EditRequestStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum EditRequestType {
    PERSONAL_INFO = "PERSONAL_INFO",
    CONTACT_INFO = "CONTACT_INFO",
    DEPARTMENT = "DEPARTMENT",
    POSITION = "POSITION"
}

@Entity("edit_requests")
export class EditRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({
        type: "enum",
        enum: EditRequestType
    })
    type: EditRequestType;

    @Column({ type: "json" })
    changes: object;

    @Column({ type: "text" })
    reason: string;

    @Column({
        type: "enum",
        enum: EditRequestStatus,
        default: EditRequestStatus.PENDING
    })
    status: EditRequestStatus;

    @Column({ type: "text", nullable: true })
    reviewNote: string;

    @Column({ name: "reviewer_id", nullable: true })
    reviewerId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "reviewer_id" })
    reviewer: User;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}