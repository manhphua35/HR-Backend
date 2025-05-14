import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { User } from "../core/User";
import { Department } from "../core/Department";

/**
 * Trạng thái của kế hoạch hiệu suất
 */
export enum PlanStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

/**
 * Trạng thái của đánh giá
 */
export enum ReviewStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

/**
 * Entity cho kế hoạch đánh giá hiệu suất
 */
@Entity("performance_plans")
export class PerformancePlan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: "text" })
    description: string;

    @Column({ name: "start_date", type: "date" })
    startDate: Date;

    @Column({ name: "end_date", type: "date" })
    endDate: Date;

    @Column({ name: "created_by" })
    createdBy: number;

    @Column({
        type: "enum",
        enum: PlanStatus,
        default: PlanStatus.ACTIVE
    })
    status: PlanStatus;

    @Column({ type: "json" })
    criteria: {
        id: number;
        name: string;
        weight: number;
        description: string;
    }[];

    @Column({ name: "is_company_wide", default: false })
    isCompanyWide: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToMany(() => Department)
    @JoinTable({
        name: "performance_plan_departments",
        joinColumn: { name: "plan_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "department_id", referencedColumnName: "id" }
    })
    departments: Department[];

    @ManyToOne(() => User)
    @JoinColumn({ name: "created_by" })
    creator: User;

    @OneToMany(() => PerformanceReview, review => review.plan)
    reviews: PerformanceReview[];
}

/**
 * Entity cho đánh giá hiệu suất
 */
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