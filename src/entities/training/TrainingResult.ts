import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "../core/User";
import { TrainingCourse } from "./TrainingCourse";

@Entity("training_results")
export class TrainingResult {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "course_id" })
    courseId: number;

    @Column("decimal", { precision: 5, scale: 2 })
    score: number;

    @Column({ type: "text" })
    evaluation: string;

    @Column({ name: "completion_date", type: "date" })
    completionDate: Date;

    @Column({ type: "text", nullable: true })
    feedback: string;

    @Column({ name: "skills_gained", type: "text", nullable: true })
    skillsGained: string;

    @Column({ name: "improvement_areas", type: "text", nullable: true })
    improvementAreas: string;

    @Column({ name: "certificate_issued", default: false })
    certificateIssued: boolean;

    @Column({ name: "certificate_number", length: 50, nullable: true })
    certificateNumber: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => TrainingCourse, course => course.results)
    @JoinColumn({ name: "course_id" })
    course: TrainingCourse;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}