import { AppDataSource } from '../config/data-source';
import { User } from '../entities/core/User';
import { Role } from '../entities/auth/Role';
import { Department } from '../entities/core/Department';
import { Position } from '../entities/core/Position';
import bcrypt from 'bcrypt';

interface CreateUserData {
    username: string;
    password: string;
    email: string;
    fullName: string;
    phone?: string;
    departmentId?: number;
    positionId?: string;
    roleId: number;
    hireDate: Date;
    remainingLeaves?: number;
}

interface UpdateUserData {
    email?: string;
    fullName?: string;
    phone?: string | null;
    departmentId?: number | null;
    positionId?: string | null;
    roleId?: number;
    isActive?: boolean;
    remainingLeaves?: number;
}

class UserService {
    private static instance: UserService;
    private userRepository = AppDataSource.getRepository(User);
    private roleRepository = AppDataSource.getRepository(Role);
    private departmentRepository = AppDataSource.getRepository(Department);
    private positionRepository = AppDataSource.getRepository(Position);

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

            // Check position if provided
            if (data.positionId) {
                const position = await this.positionRepository.findOneBy({ id: data.positionId });
                if (!position) {
                    throw new Error('Position not found');
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
            if (data.positionId !== undefined) {
                user.positionId = data.positionId;
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
                    position: true,
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
                    position: true,
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

            // Check position if provided
            if (data.positionId) {
                const position = await this.positionRepository.findOneBy({ id: data.positionId });
                if (!position) {
                    throw new Error('Position not found');
                }
            }

            // Update user fields
            Object.assign(user, data);

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
}

export const userService = UserService.getInstance();