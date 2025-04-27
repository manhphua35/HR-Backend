import { Request, Response } from 'express';
import { positionService } from '../services/PositionService';
import { RoleType } from '../entities/auth/Role';

class PositionController {
    private static instance: PositionController;

    public static getInstance(): PositionController {
        if (!PositionController.instance) {
            PositionController.instance = new PositionController();
        }
        return PositionController.instance;
    }

    public async createPosition(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra quyền SYSTEM_ADMIN hoặc HR_STAFF
            if (req.user?.roleType !== RoleType.SYSTEM_ADMIN && 
                req.user?.roleType !== RoleType.HR_STAFF) {
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

            const newPosition = await positionService.createPosition({
                title,
                level,
                departmentId
            });

            res.status(201).json({
                success: true,
                data: newPosition,
                message: 'Position created successfully'
            });

        } catch (error: any) {
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
    }

    public async getAllPositions(_req: Request, res: Response): Promise<void> {
        try {
            const positions = await positionService.getAllPositions();
            
            res.status(200).json({
                success: true,
                data: positions
            });
        } catch (error) {
            console.error('Error getting positions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getPositionsByDepartment(req: Request, res: Response): Promise<void> {
        try {
            const departmentId = parseInt(req.params.departmentId);
            const positions = await positionService.getPositionsByDepartment(departmentId);
            
            res.status(200).json({
                success: true,
                data: positions
            });
        } catch (error) {
            console.error('Error getting positions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const positionController = PositionController.getInstance();