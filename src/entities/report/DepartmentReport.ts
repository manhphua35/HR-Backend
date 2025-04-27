import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { Department } from "../core/Department";

@Entity("department_reports")
export class DepartmentReport {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "department_id" })
    departmentId: number;

    @ManyToOne(() => Department)
    @JoinColumn({ name: "department_id" })
    department: Department;

    @Column({ name: "report_date", type: "date" })
    reportDate: Date;

    @Column({ name: "total_employees" })
    totalEmployees: number;

    @Column({ name: "new_employees" })
    newEmployees: number;

    @Column({ name: "resigned_employees" })
    resignedEmployees: number;

    @Column({ name: "total_leaves" })
    totalLeaves: number;

    @Column({ name: "total_training_hours" })
    totalTrainingHours: number;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    totalSalary: number;

    @Column({ name: "total_allowances", type: "decimal", precision: 10, scale: 2 })
    totalAllowances: number;

    @Column({ name: "total_deductions", type: "decimal", precision: 10, scale: 2 })
    totalDeductions: number;

    @Column({ name: "performance_rating", type: "decimal", precision: 3, scale: 2 })
    averagePerformanceRating: number;

    @CreateDateColumn({ name: "generated_at" })
    generatedAt: Date;
}