import { User } from '../entities/core/User';
import { AppDataSource } from '../config/data-source';
import { RoleType } from '../entities/auth/Role';
import { RolePermission } from '../entities/auth/RolePermission';
import bcrypt from 'bcrypt';

class AuthService {
    private static instance: AuthService;
    private userRepository = AppDataSource.getRepository(User);

    private constructor() {}

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async validateUser(username: string, password: string): Promise<User | null> {
        try {
            const user = await this.userRepository.findOne({
                where: { username },
                relations: {
                    role: {
                        rolePermissions: {
                            permission: true
                        }
                    }
                }
            });

            if (!user || !user.isActive) {
                return null;
            }

            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                return null;
            }

            return user;
        } catch (error) {
            throw error;
        }
    }

    public getUserPermissions(user: User): string[] {
        if (!user.role?.rolePermissions) {
            return [];
        }
        return user.role.rolePermissions.map(rp => rp.permission.code);
    }

    public async hasRole(userId: number, requiredRoles: RoleType[]): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: { role: true }
            });

            if (!user || !user.role) {
                return false;
            }

            return requiredRoles.includes(user.role.roleType);
        } catch (error) {
            throw error;
        }
    }

    public async hasPermission(userId: number, requiredPermissions: string[]): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: {
                    role: {
                        rolePermissions: {
                            permission: true
                        }
                    }
                }
            });

            if (!user || !user.role?.rolePermissions) {
                return false;
            }

            const userPermissions = this.getUserPermissions(user);
            return requiredPermissions.every(permission => userPermissions.includes(permission));
        } catch (error) {
            throw error;
        }
    }

    public async checkDepartmentAccess(
        userId: number,
        departmentId: number | string
    ): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: { role: true }
            });

            if (!user || !user.role) {
                return false;
            }

            // System admin and HR staff have access to all departments
            if (user.role.roleType === RoleType.SYSTEM_ADMIN ||
                user.role.roleType === RoleType.HR_STAFF) {
                return true;
            }

            // Department manager can only access their own department
            if (user.role.roleType === RoleType.DEPARTMENT_HEAD) {
                return user.departmentId === Number(departmentId);
            }

            // Regular employees can only access their own department's data
            return user.departmentId === Number(departmentId);

        } catch (error) {
            throw error;
        }
    }

    public async isAuthorizedForUser(
        requestingUserId: number,
        targetUserId: number
    ): Promise<boolean> {
        try {
            // Users can always access their own data
            if (requestingUserId === targetUserId) {
                return true;
            }

            const requestingUser = await this.userRepository.findOne({
                where: { id: requestingUserId },
                relations: { role: true }
            });

            if (!requestingUser || !requestingUser.role) {
                return false;
            }

            // System admin and HR staff can access all user data
            if (requestingUser.role.roleType === RoleType.SYSTEM_ADMIN ||
                requestingUser.role.roleType === RoleType.HR_STAFF) {
                return true;
            }

            // If requester is a manager, they can only access their department's users
            if (requestingUser.role.roleType === RoleType.DEPARTMENT_HEAD) {
                const targetUser = await this.userRepository.findOneBy({ id: targetUserId });
                if (!targetUser) {
                    return false;
                }
                return requestingUser.departmentId === targetUser.departmentId;
            }

            // Regular employees can't access other users' data
            return false;

        } catch (error) {
            throw error;
        }
    }
}

export const authService = AuthService.getInstance();