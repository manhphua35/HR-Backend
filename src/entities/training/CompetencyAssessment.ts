import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "../core/User";
import { TrainingCourse } from "./TrainingCourse";

export enum CompetencyLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    EXPERT = "EXPERT"
}

@Entity("competency_assessments")
export class CompetencyAssessment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "course_id" })
    courseId: number;

    @Column({ name: "assessment_date", type: "date" })
    assessmentDate: Date;

    @Column({
        type: "enum",
        enum: CompetencyLevel,
        default: CompetencyLevel.BEGINNER
    })
    level: CompetencyLevel;

    @Column({ name: "skills_demonstrated", type: "text" })
    skillsDemonstrated: string;

    @Column({ name: "performance_indicators", type: "text" })
    performanceIndicators: string;

    @Column({ type: "text", nullable: true })
    recommendations: string;

    @Column({ name: "next_assessment_date", type: "date", nullable: true })
    nextAssessmentDate: Date;

    @Column({ type: "decimal", precision: 5, scale: 2 })
    score: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => TrainingCourse)
    @JoinColumn({ name: "course_id" })
    course: TrainingCourse;

    @Column({ name: "assessor_id" })
    assessorId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "assessor_id" })
    assessor: User;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}