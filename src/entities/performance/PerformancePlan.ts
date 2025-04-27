import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "../core/User";
import { Department } from "../core/Department";
import { PerformanceReview } from "./PerformanceReview";

export enum PlanStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

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

    @Column({ name: "department_id" })
    departmentId: number;

    @Column({ name: "created_by" })
    createdBy: number;

    @Column({
        type: "enum",
        enum: PlanStatus,
        default: PlanStatus.DRAFT
    })
    status: PlanStatus;

    @Column({ type: "json" })
    criteria: {
        id: number;
        name: string;
        weight: number;
        description: string;
    }[];

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => Department)
    @JoinColumn({ name: "department_id" })
    department: Department;

    @ManyToOne(() => User)
    @JoinColumn({ name: "created_by" })
    creator: User;

    @OneToMany(() => PerformanceReview, review => review.plan)
    reviews: PerformanceReview[];
}