import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../core/User";

export enum ComponentType {
    ALLOWANCE = "ALLOWANCE",      // Phụ cấp
    DEDUCTION = "DEDUCTION",      // Khấu trừ
    BENEFIT = "BENEFIT"           // Phúc lợi
}

@Entity("payrolls")
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ type: "int" })
  month: number;

  @Column({ type: "int" })
  year: number;

  @Column({ name: "base_salary", type: "decimal", precision: 15, scale: 2 })
  baseSalary: number;

  @Column({ name: "total_allowance", type: "decimal", precision: 15, scale: 2, default: 0 })
  totalAllowance: number;

  @Column({ name: "total_deduction", type: "decimal", precision: 15, scale: 2, default: 0 })
  totalDeduction: number;

  @Column({ name: "total_benefit", type: "decimal", precision: 15, scale: 2, default: 0 })
  totalBenefit: number;

  @Column({ name: "leave_deduction_amount", type: "decimal", precision: 15, scale: 2, default: 0 })
  leaveDeductionAmount: number;

  @Column({ name: "late_penalty_amount", type: "decimal", precision: 15, scale: 2, default: 0 })
  latePenaltyAmount: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  bonus: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  tax: number;

  @Column({ name: "net_salary", type: "decimal", precision: 15, scale: 2 })
  netSalary: number;

  @Column({ name: "payment_date", type: "date", nullable: true })
  paymentDate: Date;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ name: "is_finalized", type: "boolean", default: false })
  isFinalized: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
