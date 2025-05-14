import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Department } from "./Department";
import { Position } from "./Position";
import { Role } from "../auth/Role";
import { Leave } from "../leave/Leave";
import { Payroll } from "../payroll/Payroll";
import { PerformanceReview } from "../performance/Performance";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 50, unique: true })
    username!: string;

    @Column({ name: "password_hash", length: 255 })
    passwordHash!: string;

    @Column({ length: 100, unique: true })
    email!: string;

    @Column({ name: "full_name", length: 100, nullable: true })
    fullName!: string;

    @Column({ length: 20, nullable: true })
    phone!: string;

    @Column({ name: "department_id", nullable: true })
    departmentId!: number;

    @Column({ name: "position_id", nullable: true })
    positionId!: string;

    @Column({ name: "role_id" })
    roleId!: number;

    @Column({ name: "hire_date", type: "date" })
    hireDate!: Date;

    @Column({ name: "resignation_date", type: "date", nullable: true })
    resignationDate!: Date;

    @Column({ name: "remaining_leaves", default: 0 })
    remainingLeaves!: number;

    @Column({ name: "base_salary", type: "decimal", precision: 10, scale: 2, default: 0 })
    baseSalary!: number;

    @Column({ name: "is_active", default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    @ManyToOne(() => Department)
    @JoinColumn({ name: "department_id" })
    department!: Department;

    @ManyToOne(() => Position)
    @JoinColumn({ name: "position_id" })
    position!: Position;

    @ManyToOne(() => Role)
    @JoinColumn({ name: "role_id" })
    role!: Role;

    @OneToMany(() => Leave, leave => leave.user)
    leaves!: Leave[];

    @OneToMany(() => PerformanceReview, review => review.employee)
    performanceReviews!: PerformanceReview[];

    @OneToMany(() => PerformanceReview, review => review.reviewer)
    reviewedPerformances!: PerformanceReview[];

    @OneToMany(() => Payroll, payroll => payroll.user)
    payrolls!: Payroll[];
}
