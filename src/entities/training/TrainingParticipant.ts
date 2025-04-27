import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "../core/User";
import { TrainingCourse } from "./TrainingCourse";

export enum ParticipantStatus {
    REGISTERED = "REGISTERED",
    CONFIRMED = "CONFIRMED",
    ATTENDED = "ATTENDED",
    CANCELLED = "CANCELLED"
}

@Entity("training_participants")
export class TrainingParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "course_id" })
    courseId: number;

    @Column({
        type: "enum",
        enum: ParticipantStatus,
        default: ParticipantStatus.REGISTERED
    })
    status: ParticipantStatus;

    @Column({ name: "registration_date", type: "date" })
    registrationDate: Date;

    @Column({ type: "text", nullable: true })
    notes: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => TrainingCourse, course => course.participants)
    @JoinColumn({ name: "course_id" })
    course: TrainingCourse;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}