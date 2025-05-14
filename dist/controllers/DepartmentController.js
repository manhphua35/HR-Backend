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
exports.departmentController = void 0;
const DepartmentService_1 = require("../services/DepartmentService");
const Role_1 = require("../entities/auth/Role");
class DepartmentController {
    static getInstance() {
        if (!DepartmentController.instance) {
            DepartmentController.instance = new DepartmentController();
        }
        return DepartmentController.instance;
    }
    createDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Kiểm tra quyền SYSTEM_ADMIN
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.roleType) !== Role_1.RoleType.SYSTEM_ADMIN) {
                    res.status(403).json({
                        success: false,
                        message: 'Only system administrators can create departments'
                    });
                    return;
                }
                const { name, description } = req.body;
                // Validate required fields
                if (!name) {
                    res.status(400).json({
                        success: false,
                        message: 'Department name is required'
                    });
                    return;
                }
                const newDepartment = yield DepartmentService_1.departmentService.createDepartment({
                    name,
                    description
                });
                res.status(201).json({
                    success: true,
                    data: newDepartment,
                    message: 'Department created successfully'
                });
            }
            catch (error) {
                console.error('Error creating department:', error);
                if (error.message === 'Department name already exists') {
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
    getAllDepartments(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const departments = yield DepartmentService_1.departmentService.getAllDepartments();
                res.status(200).json({
                    success: true,
                    data: departments
                });
            }
            catch (error) {
                console.error('Error getting departments:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    }
}
exports.departmentController = DepartmentController.getInstance();
