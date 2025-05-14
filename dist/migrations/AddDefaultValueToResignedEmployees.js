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
exports.AddDefaultValueToResignedEmployees = void 0;
const typeorm_1 = require("typeorm");
class AddDefaultValueToResignedEmployees {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.changeColumn("department_reports", "resigned_employees", new typeorm_1.TableColumn({
                name: "resigned_employees",
                type: "integer",
                default: 0
            }));
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.changeColumn("department_reports", "resigned_employees", new typeorm_1.TableColumn({
                name: "resigned_employees",
                type: "integer",
                isNullable: false
            }));
        });
    }
}
exports.AddDefaultValueToResignedEmployees = AddDefaultValueToResignedEmployees;
