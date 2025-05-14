import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceEntityMultiDepartments1704035000000 implements MigrationInterface {
    name = 'PerformanceEntityMultiDepartments1704035000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tạo bảng performance_plan_departments để lưu quan hệ nhiều-nhiều
        await queryRunner.query(`
            CREATE TABLE "performance_plan_departments" (
                "plan_id" INT NOT NULL,
                "department_id" INT NOT NULL,
                PRIMARY KEY ("plan_id", "department_id"),
                CONSTRAINT "FK_plan_id" FOREIGN KEY ("plan_id") REFERENCES "performance_plans" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_department_id" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE CASCADE
            )
        `);

        // Di chuyển dữ liệu từ department_id sang bảng quan hệ mới
        await queryRunner.query(`
            INSERT INTO "performance_plan_departments" ("plan_id", "department_id")
            SELECT "id", "department_id" FROM "performance_plans"
            WHERE "department_id" IS NOT NULL
        `);

        // Bỏ cột department_id sau khi di chuyển dữ liệu
        // await queryRunner.query(`ALTER TABLE "performance_plans" DROP COLUMN "department_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Thêm lại cột department_id nếu cần rollback
        // await queryRunner.query(`ALTER TABLE "performance_plans" ADD COLUMN "department_id" INT NULL`);

        // Di chuyển dữ liệu từ bảng quan hệ ngược lại
        await queryRunner.query(`
            UPDATE "performance_plans" p
            SET "department_id" = (
                SELECT "department_id" FROM "performance_plan_departments" pd
                WHERE pd."plan_id" = p."id"
                LIMIT 1
            )
        `);

        // Xóa bảng quan hệ
        await queryRunner.query(`DROP TABLE "performance_plan_departments"`);
    }
} 