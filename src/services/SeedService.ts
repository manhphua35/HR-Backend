import { AppDataSource } from '../config/data-source';
import { Permission } from '../entities/auth/Permission';
import { Role, RoleType } from '../entities/auth/Role';
import { User } from '../entities/core/User';
import bcrypt from 'bcrypt';

export class SeedService {
    static async seedRolesAndPermissions() {
        const permissionRepository = AppDataSource.getRepository(Permission);
        const roleRepository = AppDataSource.getRepository(Role);

        // Create permissions
        const permissions = [
            { name: 'View Users', code: 'VIEW_USERS' },
            { name: 'Create User', code: 'CREATE_USER' },
            { name: 'Update User', code: 'UPDATE_USER' },
            { name: 'Delete User', code: 'DELETE_USER' },
            { name: 'View Leaves', code: 'VIEW_LEAVES' },
            { name: 'Approve Leaves', code: 'APPROVE_LEAVES' },
            { name: 'Create Leave', code: 'CREATE_LEAVE' },
            { name: 'View Performance', code: 'VIEW_PERFORMANCE' },
            { name: 'Create Performance Review', code: 'CREATE_PERFORMANCE_REVIEW' },
            { name: 'Update Performance Review', code: 'UPDATE_PERFORMANCE_REVIEW' },
            { name: 'View Payroll', code: 'VIEW_PAYROLL' },
            { name: 'Manage Payroll', code: 'MANAGE_PAYROLL' },
            { name: 'View Departments', code: 'VIEW_DEPARTMENTS' },
            { name: 'Manage Departments', code: 'MANAGE_DEPARTMENTS' },
            { name: 'Manage Roles', code: 'MANAGE_ROLES' },
            { name: 'Manage Permissions', code: 'MANAGE_PERMISSIONS' }
        ];

        const savedPermissions = await permissionRepository.save(permissions);
        console.log('Permissions seeded successfully');

        // Create roles with their permissions
        const roles = [
            {
                name: 'System Administrator',
                roleType: RoleType.SYSTEM_ADMIN,
                description: 'Full system access',
                permissions: savedPermissions // All permissions
            },
            {
                name: 'HR Staff',
                roleType: RoleType.HR_STAFF,
                description: 'HR department staff',
                permissions: savedPermissions.filter(p => 
                    !['MANAGE_ROLES', 'MANAGE_PERMISSIONS'].includes(p.code)
                )
            },
            {
                name: 'Department Head',
                roleType: RoleType.DEPARTMENT_HEAD,
                description: 'Department manager',
                permissions: savedPermissions.filter(p => 
                    ['VIEW_USERS', 'VIEW_LEAVES', 'APPROVE_LEAVES', 
                     'VIEW_PERFORMANCE', 'CREATE_PERFORMANCE_REVIEW',
                     'UPDATE_PERFORMANCE_REVIEW', 'VIEW_DEPARTMENTS'].includes(p.code)
                )
            },
            {
                name: 'Employee',
                roleType: RoleType.EMPLOYEE,
                description: 'Regular employee',
                permissions: savedPermissions.filter(p => 
                    ['VIEW_USERS', 'CREATE_LEAVE', 'VIEW_PERFORMANCE'].includes(p.code)
                )
            }
        ];

        const savedRoles = await roleRepository.save(roles);
        console.log('Roles seeded successfully');

        // Create default admin user
        await SeedService.seedDefaultAdmin(savedRoles[0]); // Pass the admin role
    }

    static async seedDefaultAdmin(adminRole: Role) {
        const userRepository = AppDataSource.getRepository(User);

        // Check if admin already exists
        const existingAdmin = await userRepository.findOne({
            where: { username: 'admin' }
        });

        if (!existingAdmin) {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('admin123', salt);

            const adminUser = new User();
            adminUser.username = 'admin';
            adminUser.passwordHash = passwordHash;
            adminUser.email = 'admin@company.com';
            adminUser.fullName = 'System Administrator';
            adminUser.role = adminRole;
            adminUser.isActive = true;
            adminUser.hireDate = new Date();
            adminUser.remainingLeaves = 0;

            await userRepository.save(adminUser);
            console.log('Default admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
    }
}