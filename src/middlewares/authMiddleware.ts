import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/TokenService';
import { authService } from '../services/AuthService';
import { RoleType } from '../entities/auth/Role';

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                roleType: RoleType;
                permissions: string[];
                departmentId?: number;
                type?: 'ACCESS' | 'REFRESH';
            };
        }
    }
}

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token not found'
            });
            return;
        }

        try {
            const decoded = tokenService.verifyAccessToken(token);
            req.user = {
                userId: decoded.userId,
                roleType: decoded.roleType,
                permissions: decoded.permissions,
                departmentId: decoded.departmentId
            };
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token expired or invalid',
                code: 'TOKEN_EXPIRED'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error authenticating token'
        });
    }
};

export const checkRole = (requiredRoles: RoleType[]) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const hasRole = await authService.hasRole(req.user.userId, requiredRoles);
            
            if (!hasRole) {
                res.status(403).json({
                    success: false,
                    message: 'Insufficient role permissions'
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking role permissions'
            });
        }
    };
};

export const checkPermission = (requiredPermissions: string[]) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const hasPermission = await authService.hasPermission(
                req.user.userId,
                requiredPermissions
            );

            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

export const checkDepartmentAccess = () => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const departmentId = parseInt(req.params.departmentId) || req.body.departmentId;

            if (!departmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Department ID is required'
                });
                return;
            }

            const hasAccess = await authService.checkDepartmentAccess(
                req.user.userId,
                departmentId
            );

            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    message: 'Access to this department is restricted'
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking department access'
            });
        }
    };
};