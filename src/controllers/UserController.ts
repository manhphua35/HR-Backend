import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { RoleType } from '../entities/auth/Role';

class UserController {
    private static instance: UserController;

    public static getInstance(): UserController {
        if (!UserController.instance) {
            UserController.instance = new UserController();
        }
        return UserController.instance;
    }

    public async createUser(req: Request, res: Response): Promise<void> {
        try {
            // Kiểm tra xem người dùng hiện tại có quyền SYSTEM_ADMIN không
            if (req.user?.roleType !== RoleType.SYSTEM_ADMIN) {
                res.status(403).json({
                    success: false,
                    message: 'Only system administrators can create new users'
                });
                return;
            }

            const userData = {
                username: req.body.username,
                password: req.body.password,
                email: req.body.email,
                fullName: req.body.fullName,
                phone: req.body.phone,
                departmentId: req.body.departmentId,
                positionId: req.body.positionId,
                roleId: req.body.roleId,
                hireDate: new Date(req.body.hireDate),
                remainingLeaves: req.body.remainingLeaves
            };

            // Validate required fields
            const requiredFields = ['username', 'password', 'email', 'fullName', 'roleId', 'hireDate'];
            const missingFields = requiredFields.filter(field => !req.body[field]);

            if (missingFields.length > 0) {
                res.status(400).json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
                return;
            }

            const newUser = await userService.createUser(userData);

            res.status(201).json({
                success: true,
                data: newUser,
                message: 'User created successfully'
            });

        } catch (error: any) {
            console.error('Error creating user:', error);
            
            if (error.message === 'Username or email already exists') {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
                return;
            }

            if (error.message === 'Role not found' || 
                error.message === 'Department not found' || 
                error.message === 'Position not found') {
                res.status(404).json({
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

    public async getAllUsers(_req: Request, res: Response): Promise<void> {
        try {
            const users = await userService.getAllUsers();
            res.status(200).json({
                success: true,
                data: users
            });
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            const user = await userService.getUserById(userId);
            
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Error getting user:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async updateUser(req: Request, res: Response): Promise<void> {
        console.log(req.body)
        try {
            const userId = parseInt(req.params.id);
            const userData = {
                email: req.body.email,
                fullName: req.body.fullName,
                phone: req.body.phone,
                departmentId: req.body.departmentId,
                positionId: req.body.positionId,
                roleId: req.body.roleId,
                isActive: req.body.isActive,
                remainingLeaves: req.body.remainingLeaves
            };

            const updatedUser = await userService.updateUser(userId, userData);

            if (!updatedUser) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: updatedUser,
                message: 'User updated successfully'
            });
        } catch (error: any) {
            console.error('Error updating user:', error);
            
            if (error.message === 'Role not found' || 
                error.message === 'Department not found' || 
                error.message === 'Position not found') {
                res.status(404).json({
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

    public async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            const success = await userService.deleteUser(userId);

            if (!success) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const userController = UserController.getInstance();