import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../core/User";
import { PerformancePlan } from "./PerformancePlan";

export enum ReviewStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

@Entity("performance_reviews")
export class PerformanceReview {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "plan_id" })
    planId: number;

    @Column({ name: "employee_id" })
    employeeId: number;

    @Column({ name: "reviewer_id" })
    reviewerId: number;

    @Column({
        type: "enum",
        enum: ReviewStatus,
        default: ReviewStatus.DRAFT
    })
    status: ReviewStatus;

    @Column({ type: "json" })
    scores: {
        criteriaId: number;
        score: number;
        comment: string;
    }[];

    @Column({ type: "decimal", precision: 4, scale: 2 })
    totalScore: number;

    @Column({ type: "text", nullable: true })
    comments: string;

    @Column({ type: "text", nullable: true })
    improvement: string;

    @Column({ type: "text", nullable: true })
    strengths: string;

    @Column({ type: "text", nullable: true })
    weaknesses: string;

    @Column({ name: "review_date", type: "date" })
    reviewDate: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => PerformancePlan)
    @JoinColumn({ name: "plan_id" })
    plan: PerformancePlan;

    @ManyToOne(() => User)
    @JoinColumn({ name: "employee_id" })
    employee: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: "reviewer_id" })
    reviewer: User;
}
