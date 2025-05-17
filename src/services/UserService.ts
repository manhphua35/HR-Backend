import { AppDataSource } from '../config/data-source';
import { User } from '../entities/core/User';
import { Role } from '../entities/auth/Role';
import { Department } from '../entities/core/Department';
import bcrypt from 'bcrypt';

interface CreateUserData {
    username: string;
    password: string;
    email: string;
    fullName: string;
    phone?: string;
    departmentId?: number;
    description?: string;
    roleId: number;
    hireDate: Date;
    remainingLeaves?: number;
}

interface UpdateUserData {
    email?: string;
    fullName?: string;
    phone?: string | null;
    departmentId?: number | null;
    description?: string | null;
    roleId?: number;
    isActive?: boolean;
    remainingLeaves?: number;
}

class UserService {
    private static instance: UserService;
    private userRepository = AppDataSource.getRepository(User);
    private roleRepository = AppDataSource.getRepository(Role);
    private departmentRepository = AppDataSource.getRepository(Department);

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    public async findUserByUsername(username: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { username },
                relations: {
                    role: {
                        rolePermissions: {
                            permission: true
                        }
                    }
                }
            });
        } catch (error) {
            throw error;
        }
    }

    public async createUser(data: CreateUserData): Promise<User> {
        try {
            // Validate unique username and email
            const existingUser = await this.userRepository.findOne({
                where: [
                    { username: data.username },
                    { email: data.email }
                ]
            });

            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            // Check if role exists
            const role = await this.roleRepository.findOneBy({ id: data.roleId });
            if (!role) {
                throw new Error('Role not found');
            }

            // Check department if provided
            if (data.departmentId) {
                const department = await this.departmentRepository.findOneBy({ id: data.departmentId });
                if (!department) {
                    throw new Error('Department not found');
                }
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(data.password, salt);

            // Create new user object with all required fields
            const user = this.userRepository.create({
                username: data.username,
                passwordHash: passwordHash,
                email: data.email,
                fullName: data.fullName,
                roleId: data.roleId,
                hireDate: data.hireDate,
                remainingLeaves: data.remainingLeaves || 0,
                isActive: true
            });

            // Add optional fields if provided
            if (data.phone !== undefined) {
                user.phone = data.phone;
            }
            if (data.departmentId !== undefined) {
                user.departmentId = data.departmentId;
            }
            if (data.description !== undefined) {
                user.description = data.description;
            }

            await this.userRepository.save(user);
            
            // Return user without password hash
            const { passwordHash: _, ...userWithoutPassword } = user;
            return userWithoutPassword as User;

        } catch (error) {
            throw error;
        }
    }

    public async getAllUsers(): Promise<User[]> {
        try {
            const users = await this.userRepository.find({
                relations: {
                    department: true,
                    role: true
                }
            });
            
            // Remove password hashes
            return users.map(user => {
                const { passwordHash, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            });
        } catch (error) {
            throw error;
        }
    }

    public async getUserById(id: number): Promise<User | null> {
        try {
            const user = await this.userRepository.findOne({
                where: { id },
                relations: {
                    department: true,
                    role: true
                }
            });

            if (!user) return null;

            // Remove password hash
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword as User;
        } catch (error) {
            throw error;
        }
    }

    public async updateUser(id: number, data: UpdateUserData): Promise<User | null> {
        try {
            const user = await this.userRepository.findOneBy({ id });
            if (!user) return null;

            // Check role if provided
            if (data.roleId) {
                const role = await this.roleRepository.findOneBy({ id: data.roleId });
                if (!role) {
                    throw new Error('Role not found');
                }
            }

            // Check department if provided
            if (data.departmentId) {
                const department = await this.departmentRepository.findOneBy({ id: data.departmentId });
                if (!department) {
                    throw new Error('Department not found');
                }
            }

            // Update user fields with type safety
            if (data.email !== undefined) user.email = data.email || '';
            if (data.fullName !== undefined) user.fullName = data.fullName || '';
            if (data.phone !== undefined) user.phone = data.phone || '';
            if (data.departmentId !== undefined) user.departmentId = data.departmentId || 0;
            if (data.description !== undefined) user.description = data.description || '';
            if (data.roleId !== undefined) user.roleId = data.roleId;
            if (data.isActive !== undefined) user.isActive = data.isActive;
            if (data.remainingLeaves !== undefined) user.remainingLeaves = data.remainingLeaves;

            await this.userRepository.save(user);

            // Return updated user without password hash
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword as User;
        } catch (error) {
            throw error;
        }
    }

    public async deleteUser(id: number): Promise<boolean> {
        try {
            const user = await this.userRepository.findOneBy({ id });
            if (!user) return false;

            await this.userRepository.remove(user);
            return true;
        } catch (error) {
            throw error;
        }
    }

    public async getUsersByDepartment(departmentId: number): Promise<User[]> {
        try {
            const users = await this.userRepository.find({
                where: { 
                    departmentId,
                    isActive: true
                },
                relations: {
                    department: true,
                    role: true
                },
                order: {
                    fullName: 'ASC'
                }
            });
            
            // Remove password hashes
            return users.map(user => {
                const { passwordHash, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            });
        } catch (error) {
            throw error;
        }
    }
}

export const userService = UserService.getInstance();