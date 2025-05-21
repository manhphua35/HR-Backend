import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { tokenService } from '../services/TokenService';
// import { RolePermission } from '../entities/auth/RolePermission';
import { RoleType } from '../entities/auth/Role';
import bcrypt from 'bcrypt';

class AuthController {
    private static instance: AuthController;

    public static getInstance(): AuthController {
        if (!AuthController.instance) {
            AuthController.instance = new AuthController();
        }
        return AuthController.instance;
    }

    public async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Username and password are required'
                });
                return;
            }

            // Find user with role and permissions
            const user = await userService.findUserByUsername(username);

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
                return;
            }

            if (!user.isActive) {
                res.status(401).json({
                    success: false,
                    message: 'Account is inactive'
                });
                return;
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
                return;
            }

            // Get permissions
            const permissions = user.role.permissions || [];

            // Generate tokens
            const tokenData = {
                userId: user.id,
                roleType: user.role.roleType,
                permissions: permissions,
                departmentId: user.departmentId
            };

            const tokens = tokenService.generateTokens(tokenData);

            res.status(200).json({
                success: true,
                data: {
                    ...tokens,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        fullName: user.fullName,
                        roleType: user.role.roleType,
                        permissions: permissions,
                        departmentId: user.departmentId
                    }
                }
            });

        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: 'Refresh token is required'
                });
                return;
            }

            const newTokens = await tokenService.refreshAccessToken(refreshToken);

            res.status(200).json({
                success: true,
                data: newTokens
            });

        } catch (error: any) {
            console.error('Error refreshing token:', error);

            res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
    }

    public async logout(req: Request, res: Response): Promise<void> {
        try {
            // Client should delete tokens on their side
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Error during logout:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    public async getRoles(_req: Request, res: Response): Promise<void> {
        try {
            const roles = [
                { type: RoleType.SYSTEM_ADMIN, name: "System Administrator" },
                { type: RoleType.HR_STAFF, name: "HR Staff" },
                { type: RoleType.DEPARTMENT_HEAD, name: "Department Head" },
                { type: RoleType.EMPLOYEE, name: "Employee" }
            ];
            
            res.status(200).json({
                success: true,
                data: roles
            });
        } catch (error) {
            console.error('Error getting roles:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export const authController = AuthController.getInstance();