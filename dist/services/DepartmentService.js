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
exports.departmentService = void 0;
const data_source_1 = require("../config/data-source");
const Department_1 = require("../entities/core/Department");
class DepartmentService {
    constructor() {
        this.departmentRepository = data_source_1.AppDataSource.getRepository(Department_1.Department);
    }
    static getInstance() {
        if (!DepartmentService.instance) {
            DepartmentService.instance = new DepartmentService();
        }
        return DepartmentService.instance;
    }
    createDepartment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if department name already exists
                const existingDepartment = yield this.departmentRepository.findOne({
                    where: { name: data.name }
                });
                if (existingDepartment) {
                    throw new Error('Department name already exists');
                }
                // Create new department
                const department = this.departmentRepository.create({
                    name: data.name,
                    description: data.description
                });
                yield this.departmentRepository.save(department);
                return department;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllDepartments() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.departmentRepository.find();
            }
            catch (error) {
                throw error;
            }
        });
    }
    getDepartmentById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.departmentRepository.findOneBy({ id });
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateDepartment(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const department = yield this.departmentRepository.findOneBy({ id });
                if (!department)
                    return null;
                // Check if new name already exists
                if (data.name && data.name !== department.name) {
                    const existingDepartment = yield this.departmentRepository.findOne({
                        where: { name: data.name }
                    });
                    if (existingDepartment) {
                        throw new Error('Department name already exists');
                    }
                }
                Object.assign(department, data);
                yield this.departmentRepository.save(department);
                return department;
            }
            catch (error) {
                throw error;
            }
        });
    }
    deleteDepartment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const department = yield this.departmentRepository.findOneBy({ id });
                if (!department)
                    return false;
                yield this.departmentRepository.remove(department);
                return true;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.departmentService = DepartmentService.getInstance();
