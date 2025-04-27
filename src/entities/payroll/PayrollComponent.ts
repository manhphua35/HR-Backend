import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "../core/User";

export enum ComponentType {
    ALLOWANCE = "ALLOWANCE",      // Phụ cấp
    DEDUCTION = "DEDUCTION",      // Khấu trừ
    BENEFIT = "BENEFIT"           // Phúc lợi
}

@Entity("payroll_components")
export class PayrollComponent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column("decimal", { precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: "enum",
        enum: ComponentType
    })
    type: ComponentType;

    @Column({ type: "text", nullable: true })
    description: string;

    @ManyToOne(() => User, user => user.id)
    user: User;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}