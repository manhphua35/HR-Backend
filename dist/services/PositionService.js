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
exports.positionService = void 0;
const data_source_1 = require("../config/data-source");
const Position_1 = require("../entities/core/Position");
const Department_1 = require("../entities/core/Department");
class PositionService {
    constructor() {
        this.positionRepository = data_source_1.AppDataSource.getRepository(Position_1.Position);
        this.departmentRepository = data_source_1.AppDataSource.getRepository(Department_1.Department);
    }
    static getInstance() {
        if (!PositionService.instance) {
            PositionService.instance = new PositionService();
        }
        return PositionService.instance;
    }
    createPosition(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if department exists
                const department = yield this.departmentRepository.findOneBy({ id: data.departmentId });
                if (!department) {
                    throw new Error('Department not found');
                }
                // Check if position title already exists in this department
                const existingPosition = yield this.positionRepository.findOne({
                    where: {
                        title: data.title,
                        departmentId: data.departmentId
                    }
                });
                if (existingPosition) {
                    throw new Error('Position title already exists in this department');
                }
                // Create new position
                const position = this.positionRepository.create({
                    title: data.title,
                    level: data.level,
                    departmentId: data.departmentId
                });
                yield this.positionRepository.save(position);
                return position;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllPositions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.positionRepository.find({
                    relations: ['department']
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getPositionsByDepartment(departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.positionRepository.find({
                    where: { departmentId },
                    relations: ['department']
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    getPositionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.positionRepository.findOne({
                    where: { id },
                    relations: ['department']
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    updatePosition(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const position = yield this.positionRepository.findOneBy({ id });
                if (!position)
                    return null;
                // Check department if provided
                if (data.departmentId) {
                    const department = yield this.departmentRepository.findOneBy({ id: data.departmentId });
                    if (!department) {
                        throw new Error('Department not found');
                    }
                }
                // Check if new title already exists in target department
                if (data.title &&
                    (data.title !== position.title ||
                        data.departmentId !== position.departmentId)) {
                    const existingPosition = yield this.positionRepository.findOne({
                        where: {
                            title: data.title,
                            departmentId: data.departmentId || position.departmentId
                        }
                    });
                    if (existingPosition) {
                        throw new Error('Position title already exists in this department');
                    }
                }
                Object.assign(position, data);
                yield this.positionRepository.save(position);
                return position;
            }
            catch (error) {
                throw error;
            }
        });
    }
    deletePosition(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const position = yield this.positionRepository.findOneBy({ id });
                if (!position)
                    return false;
                yield this.positionRepository.remove(position);
                return true;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.positionService = PositionService.getInstance();
