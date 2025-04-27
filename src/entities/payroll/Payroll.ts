import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../core/User";

@Entity("payrolls")
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "base_salary", type: "decimal", precision: 15, scale: 2 })
  baseSalary: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  bonus: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  tax: number;

  @Column({ name: "payment_date", type: "date" })
  paymentDate: Date;

  @Column({ name: "period_start", type: "date" })
  periodStart: Date;

  @Column({ name: "period_end", type: "date" })
  periodEnd: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => User, user => user.payrolls)
  @JoinColumn({ name: "user_id" })
  user: User;
}
