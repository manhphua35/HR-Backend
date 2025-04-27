import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { TrainingParticipant } from "./TrainingParticipant";
import { TrainingResult } from "./TrainingResult";

export enum TrainingStatus {
    PLANNED = "PLANNED",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

@Entity("training_courses")
export class TrainingCourse {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ type: "text" })
    description: string;

    @Column({ name: "start_date", type: "date" })
    startDate: Date;

    @Column({ name: "end_date", type: "date" })
    endDate: Date;

    @Column({ type: "enum", enum: TrainingStatus, default: TrainingStatus.PLANNED })
    status: TrainingStatus;

    @Column({ length: 100 })
    trainer: string;

    @Column({ length: 100 })
    location: string;

    @Column({ name: "max_participants", default: 0 })
    maxParticipants: number;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    budget: number;

    @OneToMany(() => TrainingParticipant, participant => participant.course)
    participants: TrainingParticipant[];

    @OneToMany(() => TrainingResult, result => result.course)
    results: TrainingResult[];

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}