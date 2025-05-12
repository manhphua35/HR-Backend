import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Department } from "../core/Department";
import { User } from "../core/User";

export enum TrainingStatus {
    PLANNED = "PLANNED",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

export enum ParticipantStatus {
    REGISTERED = "REGISTERED",
    CONFIRMED = "CONFIRMED",
    ATTENDED = "ATTENDED",
    CANCELLED = "CANCELLED"
}

export enum CompetencyLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    EXPERT = "EXPERT"
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
    location: string;

    @Column({ length: 100, nullable: true })
    instructor: string;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    budget: number;

    // Department relationship
    @Column({ name: "department_id", nullable: true })
    departmentId: number;

    @ManyToOne(() => Department)
    @JoinColumn({ name: "department_id" })
    department: Department;

    // Participant fields
    @Column({ name: "participant_status", type: "enum", enum: ParticipantStatus, default: ParticipantStatus.REGISTERED })
    participantStatus: ParticipantStatus;

    @Column({ name: "registration_date", type: "date", nullable: true })
    registrationDate: Date;

    @Column({ name: "participant_notes", type: "text", nullable: true })
    participantNotes: string;

    // Result fields
    @Column("decimal", { precision: 5, scale: 2, nullable: true })
    score: number;

    @Column({ name: "evaluation", type: "text", nullable: true })
    evaluation: string;

    @Column({ name: "completion_date", type: "date", nullable: true })
    completionDate: Date;

    @Column({ name: "feedback", type: "text", nullable: true })
    feedback: string;

    @Column({ name: "skills_gained", type: "text", nullable: true })
    skillsGained: string;

    @Column({ name: "improvement_areas", type: "text", nullable: true })
    improvementAreas: string;

    @Column({ name: "certificate_issued", default: false })
    certificateIssued: boolean;

    @Column({ name: "certificate_number", length: 50, nullable: true })
    certificateNumber: string;

    // Competency Assessment fields
    @Column({ name: "competency_level", type: "enum", enum: CompetencyLevel, default: CompetencyLevel.BEGINNER })
    competencyLevel: CompetencyLevel;

    @Column({ name: "assessment_date", type: "date", nullable: true })
    assessmentDate: Date;

    @Column({ name: "skills_demonstrated", type: "text", nullable: true })
    skillsDemonstrated: string;

    @Column({ name: "performance_indicators", type: "text", nullable: true })
    performanceIndicators: string;

    @Column({ name: "recommendations", type: "text", nullable: true })
    recommendations: string;

    @Column({ name: "next_assessment_date", type: "date", nullable: true })
    nextAssessmentDate: Date;

    // User relationships
    @Column({ name: "user_id", nullable: true })
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ name: "assessor_id", nullable: true })
    assessorId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "assessor_id" })
    assessor: User;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}