import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "../core/User";

@Entity("monthly_payrolls")
export class MonthlyPayroll {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.id)
    user: User;

    @Column()
    month: number;

    @Column()
    year: number;

    @Column("decimal", { precision: 10, scale: 2 })
    baseSalary: number;

    @Column("decimal", { precision: 10, scale: 2 })
    totalAllowance: number;

    @Column("decimal", { precision: 10, scale: 2 })
    totalDeduction: number;

    @Column("decimal", { precision: 10, scale: 2 })
    totalBenefit: number;

    @Column("decimal", { precision: 10, scale: 2 })
    netSalary: number;

    @Column({ type: "text", nullable: true })
    note: string;

    @Column({ default: false })
    isFinalized: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}