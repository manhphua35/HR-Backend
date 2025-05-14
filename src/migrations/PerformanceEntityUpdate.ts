import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceEntityUpdate1632914283000 implements MigrationInterface {
    name = 'PerformanceEntityUpdate1632914283000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Thêm cột is_company_wide vào bảng performance_plans
        await queryRunner.query(`ALTER TABLE "performance_plans" ADD COLUMN "is_company_wide" BOOLEAN NOT NULL DEFAULT FALSE`);
        
        // Cập nhật cột department_id để cho phép NULL
        await queryRunner.query(`ALTER TABLE "performance_plans" MODIFY COLUMN "department_id" INT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Hoàn tác các thay đổi
        await queryRunner.query(`ALTER TABLE "performance_plans" MODIFY COLUMN "department_id" INT NOT NULL`);
        await queryRunner.query(`ALTER TABLE "performance_plans" DROP COLUMN "is_company_wide"`);
    }
} 