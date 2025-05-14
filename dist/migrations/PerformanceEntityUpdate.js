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
exports.PerformanceEntityUpdate1632914283000 = void 0;
class PerformanceEntityUpdate1632914283000 {
    constructor() {
        this.name = 'PerformanceEntityUpdate1632914283000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Thêm cột is_company_wide vào bảng performance_plans
            yield queryRunner.query(`ALTER TABLE "performance_plans" ADD COLUMN "is_company_wide" BOOLEAN NOT NULL DEFAULT FALSE`);
            // Cập nhật cột department_id để cho phép NULL
            yield queryRunner.query(`ALTER TABLE "performance_plans" MODIFY COLUMN "department_id" INT NULL`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Hoàn tác các thay đổi
            yield queryRunner.query(`ALTER TABLE "performance_plans" MODIFY COLUMN "department_id" INT NOT NULL`);
            yield queryRunner.query(`ALTER TABLE "performance_plans" DROP COLUMN "is_company_wide"`);
        });
    }
}
exports.PerformanceEntityUpdate1632914283000 = PerformanceEntityUpdate1632914283000;
