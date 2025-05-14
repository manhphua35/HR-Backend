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
exports.positionController = void 0;
const PositionService_1 = require("../services/PositionService");
const Role_1 = require("../entities/auth/Role");
class PositionController {
    static getInstance() {
        if (!PositionController.instance) {
            PositionController.instance = new PositionController();
        }
        return PositionController.instance;
    }
    createPosition(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Kiểm tra quyền SYSTEM_ADMIN hoặc HR_STAFF
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.SYSTEM_ADMIN &&
                    ((_b = req.user) === null || _b === void 0 ? void 0 : _b.roleType) !== Role_1.RoleType.HR_STAFF) {
                    res.status(403).json({
                        success: false,
                        message: 'Only system administrators or HR staff can create positions'
                    });
                    return;
                }
                const { title, level, departmentId } = req.body;
                // Validate required fields
                if (!title || level === undefined || !departmentId) {
                    res.status(400).json({
                        success: false,
                        message: 'Title, level and department ID are required'
                    });
                    return;
                }
                const newPosition = yield PositionService_1.positionService.createPosition({
                    title,
                    level,
                    departmentId
                });
                res.status(201).json({
                    success: true,
                    data: newPosition,
                    message: 'Position created successfully'
                });
            }
            catch (error) {
                console.error('Error creating position:', error);
                if (error.message === 'Department not found') {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message === 'Position title already exists in this department') {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getAllPositions(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const positions = yield PositionService_1.positionService.getAllPositions();
                res.status(200).json({
                    success: true,
                    data: positions
                });
            }
            catch (error) {
                console.error('Error getting positions:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
    getPositionsByDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const departmentId = parseInt(req.params.departmentId);
                const positions = yield PositionService_1.positionService.getPositionsByDepartment(departmentId);
                res.status(200).json({
                    success: true,
                    data: positions
                });
            }
            catch (error) {
                console.error('Error getting positions:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
}
exports.positionController = PositionController.getInstance();
