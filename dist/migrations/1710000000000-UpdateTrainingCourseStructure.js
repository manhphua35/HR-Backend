"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTrainingCourseStructure1710000000000 = void 0;
class UpdateTrainingCourseStructure1710000000000 {
    constructor() {
        this.name = 'UpdateTrainingCourseStructure1710000000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Drop các bảng cũ
            yield queryRunner.query(`DROP TABLE IF EXISTS "competency_assessments"`);
            yield queryRunner.query(`DROP TABLE IF EXISTS "training_results"`);
            yield queryRunner.query(`DROP TABLE IF EXISTS "training_participants"`);
            // Thêm các cột mới vào bảng training_courses
            yield queryRunner.query(`ALTER TABLE "training_courses" 
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
            yield queryRunner.query(`ALTER TABLE "training_courses" 
            ADD CONSTRAINT "FK_training_courses_department" 
            FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_training_courses_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_training_courses_assessor" 
            FOREIGN KEY ("assessor_id") REFERENCES "users"("id") ON DELETE SET NULL
        `);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Drop foreign key constraints
            yield queryRunner.query(`ALTER TABLE "training_courses" 
            DROP CONSTRAINT "FK_training_courses_department",
            DROP CONSTRAINT "FK_training_courses_user",
            DROP CONSTRAINT "FK_training_courses_assessor"
        `);
            // Drop các cột mới thêm
            yield queryRunner.query(`ALTER TABLE "training_courses" 
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
            yield queryRunner.query(`CREATE TABLE "competency_assessments" (
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
            yield queryRunner.query(`CREATE TABLE "training_results" (
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
            yield queryRunner.query(`CREATE TABLE "training_participants" (
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
        });
    }
}
exports.UpdateTrainingCourseStructure1710000000000 = UpdateTrainingCourseStructure1710000000000;
