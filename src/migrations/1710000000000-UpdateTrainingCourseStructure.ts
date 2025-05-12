import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTrainingCourseStructure1710000000000 implements MigrationInterface {
    name = 'UpdateTrainingCourseStructure1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop các bảng cũ
        await queryRunner.query(`DROP TABLE IF EXISTS "competency_assessments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "training_results"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "training_participants"`);

        // Thêm các cột mới vào bảng training_courses
        await queryRunner.query(`ALTER TABLE "training_courses" 
            ADD COLUMN "department_id" integer,
            ADD COLUMN "participant_status" varchar(255) DEFAULT 'REGISTERED',
            ADD COLUMN "registration_date" date,
            ADD COLUMN "participant_notes" text,
            ADD COLUMN "score" decimal(5,2),
            ADD COLUMN "evaluation" text,
            ADD COLUMN "completion_date" date,
            ADD COLUMN "feedback" text,
            ADD COLUMN "skills_gained" text,
            ADD COLUMN "improvement_areas" text,
            ADD COLUMN "certificate_issued" boolean DEFAULT false,
            ADD COLUMN "certificate_number" varchar(50),
            ADD COLUMN "competency_level" varchar(255) DEFAULT 'BEGINNER',
            ADD COLUMN "assessment_date" date,
            ADD COLUMN "skills_demonstrated" text,
            ADD COLUMN "performance_indicators" text,
            ADD COLUMN "recommendations" text,
            ADD COLUMN "next_assessment_date" date,
            ADD COLUMN "user_id" integer,
            ADD COLUMN "assessor_id" integer
        `);

        // Thêm foreign key constraints
        await queryRunner.query(`ALTER TABLE "training_courses" 
            ADD CONSTRAINT "FK_training_courses_department" 
            FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_training_courses_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_training_courses_assessor" 
            FOREIGN KEY ("assessor_id") REFERENCES "users"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "training_courses" 
            DROP CONSTRAINT "FK_training_courses_department",
            DROP CONSTRAINT "FK_training_courses_user",
            DROP CONSTRAINT "FK_training_courses_assessor"
        `);

        // Drop các cột mới thêm
        await queryRunner.query(`ALTER TABLE "training_courses" 
            DROP COLUMN "department_id",
            DROP COLUMN "participant_status",
            DROP COLUMN "registration_date",
            DROP COLUMN "participant_notes",
            DROP COLUMN "score",
            DROP COLUMN "evaluation",
            DROP COLUMN "completion_date",
            DROP COLUMN "feedback",
            DROP COLUMN "skills_gained",
            DROP COLUMN "improvement_areas",
            DROP COLUMN "certificate_issued",
            DROP COLUMN "certificate_number",
            DROP COLUMN "competency_level",
            DROP COLUMN "assessment_date",
            DROP COLUMN "skills_demonstrated",
            DROP COLUMN "performance_indicators",
            DROP COLUMN "recommendations",
            DROP COLUMN "next_assessment_date",
            DROP COLUMN "user_id",
            DROP COLUMN "assessor_id"
        `);

        // Tạo lại các bảng cũ
        await queryRunner.query(`CREATE TABLE "competency_assessments" (
            "id" SERIAL PRIMARY KEY,
            "user_id" integer NOT NULL,
            "course_id" integer NOT NULL,
            "assessment_date" date NOT NULL,
            "level" varchar(255) NOT NULL DEFAULT 'BEGINNER',
            "skills_demonstrated" text NOT NULL,
            "performance_indicators" text NOT NULL,
            "recommendations" text,
            "next_assessment_date" date,
            "score" decimal(5,2) NOT NULL,
            "assessor_id" integer NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_competency_assessments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
            CONSTRAINT "FK_competency_assessments_course" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id"),
            CONSTRAINT "FK_competency_assessments_assessor" FOREIGN KEY ("assessor_id") REFERENCES "users"("id")
        )`);

        await queryRunner.query(`CREATE TABLE "training_results" (
            "id" SERIAL PRIMARY KEY,
            "user_id" integer NOT NULL,
            "course_id" integer NOT NULL,
            "score" decimal(5,2) NOT NULL,
            "evaluation" text NOT NULL,
            "completion_date" date NOT NULL,
            "feedback" text,
            "skills_gained" text,
            "improvement_areas" text,
            "certificate_issued" boolean NOT NULL DEFAULT false,
            "certificate_number" varchar(50),
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_training_results_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
            CONSTRAINT "FK_training_results_course" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id")
        )`);

        await queryRunner.query(`CREATE TABLE "training_participants" (
            "id" SERIAL PRIMARY KEY,
            "user_id" integer NOT NULL,
            "course_id" integer NOT NULL,
            "status" varchar(255) NOT NULL DEFAULT 'REGISTERED',
            "registration_date" date NOT NULL,
            "notes" text,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_training_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
            CONSTRAINT "FK_training_participants_course" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id")
        )`);
    }
} 