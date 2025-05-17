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
exports.PerformanceEntityMultiDepartments1704035000000 = void 0;
class PerformanceEntityMultiDepartments1704035000000 {
    constructor() {
        this.name = 'PerformanceEntityMultiDepartments1704035000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Tạo bảng performance_plan_departments để lưu quan hệ nhiều-nhiều
            yield queryRunner.query(`
            CREATE TABLE "performance_plan_departments" (
                "plan_id" INT NOT NULL,
                "department_id" INT NOT NULL,
                PRIMARY KEY ("plan_id", "department_id"),
                CONSTRAINT "FK_plan_id" FOREIGN KEY ("plan_id") REFERENCES "performance_plans" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_department_id" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE CASCADE
            )
        `);
            // Di chuyển dữ liệu từ department_id sang bảng quan hệ mới
            yield queryRunner.query(`
            INSERT INTO "performance_plan_departments" ("plan_id", "department_id")
            SELECT "id", "department_id" FROM "performance_plans"
            WHERE "department_id" IS NOT NULL
        `);
            // Bỏ cột department_id sau khi di chuyển dữ liệu
            // await queryRunner.query(`ALTER TABLE "performance_plans" DROP COLUMN "department_id"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Thêm lại cột department_id nếu cần rollback
            // await queryRunner.query(`ALTER TABLE "performance_plans" ADD COLUMN "department_id" INT NULL`);
            // Di chuyển dữ liệu từ bảng quan hệ ngược lại
            yield queryRunner.query(`
            UPDATE "performance_plans" p
            SET "department_id" = (
                SELECT "department_id" FROM "performance_plan_departments" pd
                WHERE pd."plan_id" = p."id"
                LIMIT 1
            )
        `);
            // Xóa bảng quan hệ
            yield queryRunner.query(`DROP TABLE "performance_plan_departments"`);
        });
    }
}
exports.PerformanceEntityMultiDepartments1704035000000 = PerformanceEntityMultiDepartments1704035000000;
