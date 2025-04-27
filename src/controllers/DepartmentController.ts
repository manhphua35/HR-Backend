import { Request, Response } from 'express';
import { departmentService } from '../services/DepartmentService';
import { RoleType } from '../entities/auth/Role';

class DepartmentController {
    private static instance: DepartmentController;

    public static getInstance(): DepartmentController {
        if (!DepartmentController.instance) {
            DepartmentController.instance = new DepartmentController();
        }
        return DepartmentController.instance;
    }

    public async createDepartment(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền SYSTEM_ADMIN
            if (req.user?.roleType !== RoleType.SYSTEM_ADMIN) {
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

            const newDepartment = await departmentService.createDepartment({
                name,
                description
            });

            res.status(201).json({
                success: true,
                data: newDepartment,
                message: 'Department created successfully'
            });

        } catch (error: any) {
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
    }

    public async getAllDepartments(_req: Request, res: Response): Promise<void> {
        try {
            const departments = await departmentService.getAllDepartments();
            
            res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error) {
            console.error('Error getting departments:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const departmentController = DepartmentController.getInstance();