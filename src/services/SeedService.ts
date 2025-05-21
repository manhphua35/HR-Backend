import { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Permission } from '../entities/auth/Permission';
import { Role, RoleType } from '../entities/auth/Role';
import { User } from '../entities/core/User';
import { Department } from '../entities/core/Department';
import { Position } from '../entities/core/Position';
import { Leave, LeaveStatus, LeaveType } from '../entities/leave/Leave';
import { DepartmentReport } from '../entities/report/DepartmentReport';
import { Attendance, AttendanceStatus } from '../entities/attendance/Attendance';
import { Payroll, ComponentType } from '../entities/payroll/Payroll';
import { PerformancePlan, PlanStatus, PerformanceReview, ReviewStatus } from '../entities/performance/Performance';
import bcrypt from 'bcrypt';
import { FindOneOptions, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';

export class SeedService {
    private static userRepository = AppDataSource.getRepository(User);
    private static roleRepository = AppDataSource.getRepository(Role);
    private static permissionRepository = AppDataSource.getRepository(Permission);
    private static departmentRepository = AppDataSource.getRepository(Department);
    private static positionRepository = AppDataSource.getRepository(Position);
    private static leaveRepository = AppDataSource.getRepository(Leave);
    private static reportRepository = AppDataSource.getRepository(DepartmentReport);
    private static attendanceRepository = AppDataSource.getRepository(Attendance);
    private static payrollRepository = AppDataSource.getRepository(Payroll);
    private static performancePlanRepository = AppDataSource.getRepository(PerformancePlan);
    private static performanceReviewRepository = AppDataSource.getRepository(PerformanceReview);

    // Helper to hash password
    private static async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    // Helper to find or return null
    private static async findOneUser(options: FindOneOptions<User>): Promise<User | null> {
        try {
            return await this.userRepository.findOne(options);
        } catch (error) {
            console.warn(`Warning finding user with options ${JSON.stringify(options)}:`, error);
            return null;
        }
    }


    static async seedAll() {
        try {
            console.log("Starting data seeding...");

            // 0. Clear existing data using TRUNCATE CASCADE
            console.log("Clearing existing data using TRUNCATE CASCADE...");
            const queryRunner = AppDataSource.createQueryRunner();
            await queryRunner.connect();

            // Get table names from metadata - adjust if your naming strategy differs
            const tableNames = AppDataSource.entityMetadatas.map(metadata => `"${metadata.tableName}"`);

            // Construct the TRUNCATE query for all tables managed by TypeORM
            // Using RESTART IDENTITY is good practice for seeding to reset sequences
            const truncateQuery = `TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE;`;

            try {
                await queryRunner.query(truncateQuery);
                console.log("Existing data truncated with CASCADE.");
            } catch (truncateError) {
                console.error("Error during TRUNCATE CASCADE:", truncateError);
                // Re-throw the error to stop the seeding process if truncation fails
                throw truncateError;
            } finally {
                // Ensure the query runner is released even if an error occurs
                await queryRunner.release();
            }


            // 1. Seed Roles and Permissions (includes default admin)
            const roles = await this.seedRolesAndPermissions();
            if (!roles || roles.length === 0) {
                throw new Error("Failed to seed roles. Aborting.");
            }
            const adminRole = roles.find(r => r.roleType === RoleType.SYSTEM_ADMIN);
            const hrRole = roles.find(r => r.roleType === RoleType.HR_STAFF);
            const headRole = roles.find(r => r.roleType === RoleType.DEPARTMENT_HEAD);
            const employeeRole = roles.find(r => r.roleType === RoleType.EMPLOYEE);

            if (!adminRole || !hrRole || !headRole || !employeeRole) {
                 throw new Error("One or more essential roles not found after seeding.");
            }

            // 2. Seed Departments and Positions
            const { departments, positions } = await this.seedDepartmentsAndPositions();
            if (!departments || departments.length === 0 || !positions || positions.length === 0) {
                throw new Error("Failed to seed departments or positions. Aborting.");
            }

            // 3. Seed Users (Department Heads, HR Staff, Employees)
            const users = await this.seedUsers(roles, departments, positions);
             if (!users || users.length === 0) {
                console.warn("No additional users were seeded (Admin might already exist).");
                // Continue if admin exists, otherwise throw error might be better depending on desired behavior
            }

            // 4. Seed Leaves
            await this.seedLeaves(users);

            // 5. Seed Reports
            await this.seedReports(users, departments);

            // 6. Seed Attendances
            await this.seedAttendances(users);

            // 7. Seed Payrolls
            await this.seedPayrolls(users);

            // 8. Seed Performance Plans and Reviews
            await this.seedPerformance(users, departments);

            console.log("Data seeding completed successfully.");

        } catch (error) {
             console.error("Error during full data seeding:", error);
             throw error; // Re-throw to be caught by seedData.ts
        }
    }


    static async seedRolesAndPermissions(): Promise<Role[]> {
        // Use class properties
        // const permissionRepository = this.permissionRepository;
        // const roleRepository = this.roleRepository;

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

        // Check existing permissions
        const existingPermissions = await this.permissionRepository.find();
        const existingPermissionCodes = new Set(existingPermissions.map(p => p.code));
        const newPermissions = permissions.filter(p => !existingPermissionCodes.has(p.code));

        let savedPermissions: Permission[] = [...existingPermissions];
        if (newPermissions.length > 0) {
            const newlySaved = await this.permissionRepository.save(newPermissions);
            savedPermissions = [...existingPermissions, ...newlySaved];
            console.log(`${newlySaved.length} new permissions seeded successfully`);
        } else {
            console.log('All permissions already exist');
        }


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
                permissions: savedPermissions.filter((p: Permission) => // Add type Permission
                    !['MANAGE_ROLES', 'MANAGE_PERMISSIONS'].includes(p.code)
                )
            },
            {
                name: 'Department Head',
                roleType: RoleType.DEPARTMENT_HEAD,
                description: 'Department manager',
                permissions: savedPermissions.filter((p: Permission) => // Add type Permission
                    ['VIEW_USERS', 'VIEW_LEAVES', 'APPROVE_LEAVES',
                     'VIEW_PERFORMANCE', 'CREATE_PERFORMANCE_REVIEW',
                     'UPDATE_PERFORMANCE_REVIEW', 'VIEW_DEPARTMENTS'].includes(p.code)
                )
            },
            {
                name: 'Employee',
                roleType: RoleType.EMPLOYEE,
                description: 'Regular employee',
                permissions: savedPermissions.filter((p: Permission) => // Add type Permission
                    ['VIEW_USERS', 'CREATE_LEAVE', 'VIEW_PERFORMANCE'].includes(p.code)
                )
            }
        ];

        // Check existing roles by loading through the join table
        const existingRoles = await this.roleRepository.find({
            relations: ['rolePermissions', 'rolePermissions.permission']
        });
        const existingRoleTypes = new Set(existingRoles.map(r => r.roleType));
        const newRolesData = roles.filter(r => !existingRoleTypes.has(r.roleType));

        let allRoles: Role[] = [...existingRoles]; // Declare allRoles here
        if (newRolesData.length > 0) {
             // Map permissions to the new roles data before saving
             const newRolesToSave = newRolesData.map(roleData => {
                 // Find the corresponding permissions from the savedPermissions list
                 // Ensure roleData.permissions is treated as an array of objects with 'code'
                 const rolePermissionCodes = (roleData.permissions as { code: string }[]).map(p => p.code);
                 const rolePermissions = savedPermissions.filter(p => rolePermissionCodes.includes(p.code));
                 return {
                     ...roleData,
                     permissions: rolePermissions // Assign actual Permission entities
                 };
             });

            // Explicitly assert the type via unknown first to resolve TS Error 73
            const newlySavedRoles = await this.roleRepository.save(newRolesToSave as unknown as DeepPartial<Role>[]);
            allRoles = [...existingRoles, ...newlySavedRoles]; // Combine existing and new
            console.log(`${newlySavedRoles.length} new roles seeded successfully`);
        } else {
             console.log('All roles already exist');
        }


        // Create default admin user
        // Explicitly assert the type as Role to resolve TS2345
        const adminRole = allRoles.find((r: Role) => r.roleType === RoleType.SYSTEM_ADMIN); // Use allRoles and add type
        if (adminRole) {
             await SeedService.seedDefaultAdmin(adminRole); // Pass the admin role
        } else {
            // If seeding for the first time, admin role might be in newlySavedRoles
             const newlyCreatedAdminRole = allRoles.find((r: Role) => r.roleType === RoleType.SYSTEM_ADMIN);
             if (newlyCreatedAdminRole) {
                 await SeedService.seedDefaultAdmin(newlyCreatedAdminRole);
             } else {
                console.error("Admin role not found after seeding roles!");
             }
        }
        return allRoles; // Return all roles for use in seedAll
    }

    static async seedDefaultAdmin(adminRole: Role) {
        // const userRepository = AppDataSource.getRepository(User); // Use class property

        // Check if admin already exists
        const existingAdmin = await this.findOneUser({ where: { username: 'admin' } });


        if (!existingAdmin) {
            const passwordHash = await this.hashPassword('admin123');

            const adminUser = this.userRepository.create({
                username: 'admin',
                passwordHash: passwordHash,
                email: 'admin@company.com',
                fullName: 'System Administrator',
                role: adminRole, // Use the passed Role entity
                roleId: adminRole.id, // Ensure roleId is set if needed
                isActive: true,
                hireDate: new Date(),
                remainingLeaves: 15, // Give admin some leaves too
                baseSalary: 90000,
                // departmentId and positionId can be null for admin or assigned to a specific one if needed
            });


            await this.userRepository.save(adminUser);
            console.log('Default admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
    }

    static async seedDepartmentsAndPositions(): Promise<{ departments: Department[], positions: Position[] }> {
        // Seed Departments - Cấu trúc phòng ban của một công ty Việt Nam thực tế
        const departmentData = [
            { name: 'Ban Giám đốc', description: 'Ban lãnh đạo điều hành công ty' },
            { name: 'Phòng Nhân sự', description: 'Quản lý các vấn đề về nhân sự và tuyển dụng' },
            { name: 'Phòng Hành chính', description: 'Quản lý công tác hành chính, văn phòng và tổng vụ' },
            { name: 'Phòng Kế toán', description: 'Quản lý tài chính, kế toán và thanh toán' },
            { name: 'Phòng Kinh doanh', description: 'Phát triển kinh doanh và bán hàng' },
            { name: 'Phòng Marketing', description: 'Xây dựng chiến lược và thực hiện các hoạt động marketing' },
            { name: 'Phòng IT', description: 'Phát triển, vận hành và bảo trì hệ thống CNTT' },
            { name: 'Phòng R&D', description: 'Nghiên cứu và phát triển sản phẩm mới' },
            { name: 'Phòng Dịch vụ Khách hàng', description: 'Hỗ trợ và chăm sóc khách hàng' },
            { name: 'Phòng Logistics', description: 'Quản lý kho vận và chuỗi cung ứng' },
        ];

        // Check existing departments
        const existingDepartments = await this.departmentRepository.find();
        const existingDepartmentNames = new Set(existingDepartments.map(d => d.name));
        const newDepartments = departmentData.filter(d => !existingDepartmentNames.has(d.name));

        let allDepartments: Department[] = [...existingDepartments];
        if (newDepartments.length > 0) {
            const newlySavedDepts = await this.departmentRepository.save(newDepartments);
            allDepartments = [...existingDepartments, ...newlySavedDepts];
            console.log(`${newlySavedDepts.length} new departments seeded successfully`);
        } else {
            console.log('All departments already exist');
        }

        // Seed Positions - Vị trí công việc chi tiết hơn theo từng phòng ban
        // Map department names to department entities for easier lookup
        const deptMap = new Map(allDepartments.map(d => [d.name, d]));

        const positionData = [
            // Ban Giám đốc
            { title: 'Tổng Giám đốc', level: 5, department: deptMap.get('Ban Giám đốc') },
            { title: 'Phó Tổng Giám đốc', level: 4, department: deptMap.get('Ban Giám đốc') },
            { title: 'Trợ lý Giám đốc', level: 2, department: deptMap.get('Ban Giám đốc') },
            
            // Phòng Nhân sự
            { title: 'Trưởng phòng Nhân sự', level: 3, department: deptMap.get('Phòng Nhân sự') },
            { title: 'Chuyên viên Tuyển dụng', level: 2, department: deptMap.get('Phòng Nhân sự') },
            { title: 'Chuyên viên Đào tạo và Phát triển', level: 2, department: deptMap.get('Phòng Nhân sự') },
            { title: 'Chuyên viên Chính sách Nhân sự', level: 2, department: deptMap.get('Phòng Nhân sự') },
            { title: 'Nhân viên Nhân sự', level: 1, department: deptMap.get('Phòng Nhân sự') },
            
            // Phòng Hành chính
            { title: 'Trưởng phòng Hành chính', level: 3, department: deptMap.get('Phòng Hành chính') },
            { title: 'Chuyên viên Hành chính', level: 2, department: deptMap.get('Phòng Hành chính') },
            { title: 'Nhân viên Văn thư', level: 1, department: deptMap.get('Phòng Hành chính') },
            { title: 'Nhân viên Lễ tân', level: 1, department: deptMap.get('Phòng Hành chính') },
            
            // Phòng Kế toán
            { title: 'Kế toán trưởng', level: 3, department: deptMap.get('Phòng Kế toán') },
            { title: 'Kế toán tổng hợp', level: 2, department: deptMap.get('Phòng Kế toán') },
            { title: 'Kế toán thanh toán', level: 2, department: deptMap.get('Phòng Kế toán') },
            { title: 'Kế toán công nợ', level: 2, department: deptMap.get('Phòng Kế toán') },
            { title: 'Nhân viên Kế toán', level: 1, department: deptMap.get('Phòng Kế toán') },
            
            // Phòng Kinh doanh
            { title: 'Giám đốc Kinh doanh', level: 3, department: deptMap.get('Phòng Kinh doanh') },
            { title: 'Trưởng nhóm Kinh doanh', level: 2, department: deptMap.get('Phòng Kinh doanh') },
            { title: 'Chuyên viên Kinh doanh', level: 2, department: deptMap.get('Phòng Kinh doanh') },
            { title: 'Nhân viên Kinh doanh', level: 1, department: deptMap.get('Phòng Kinh doanh') },
            
            // Phòng Marketing
            { title: 'Giám đốc Marketing', level: 3, department: deptMap.get('Phòng Marketing') },
            { title: 'Chuyên viên Marketing Online', level: 2, department: deptMap.get('Phòng Marketing') },
            { title: 'Chuyên viên Content', level: 2, department: deptMap.get('Phòng Marketing') },
            { title: 'Chuyên viên Thiết kế', level: 2, department: deptMap.get('Phòng Marketing') },
            { title: 'Nhân viên Marketing', level: 1, department: deptMap.get('Phòng Marketing') },
            
            // Phòng IT
            { title: 'Giám đốc CNTT', level: 3, department: deptMap.get('Phòng IT') },
            { title: 'Trưởng nhóm Phát triển', level: 2, department: deptMap.get('Phòng IT') },
            { title: 'Lập trình viên Frontend', level: 2, department: deptMap.get('Phòng IT') },
            { title: 'Lập trình viên Backend', level: 2, department: deptMap.get('Phòng IT') },
            { title: 'Kỹ sư DevOps', level: 2, department: deptMap.get('Phòng IT') },
            { title: 'Chuyên viên QA/QC', level: 2, department: deptMap.get('Phòng IT') },
            { title: 'Nhân viên IT Support', level: 1, department: deptMap.get('Phòng IT') },
            
            // Phòng R&D
            { title: 'Giám đốc R&D', level: 3, department: deptMap.get('Phòng R&D') },
            { title: 'Trưởng nhóm Nghiên cứu', level: 2, department: deptMap.get('Phòng R&D') },
            { title: 'Chuyên viên Nghiên cứu', level: 2, department: deptMap.get('Phòng R&D') },
            { title: 'Kỹ sư Phát triển Sản phẩm', level: 2, department: deptMap.get('Phòng R&D') },
            
            // Phòng Dịch vụ Khách hàng
            { title: 'Trưởng phòng DVKH', level: 3, department: deptMap.get('Phòng Dịch vụ Khách hàng') },
            { title: 'Chuyên viên CSKH', level: 2, department: deptMap.get('Phòng Dịch vụ Khách hàng') },
            { title: 'Nhân viên Tổng đài', level: 1, department: deptMap.get('Phòng Dịch vụ Khách hàng') },
            
            // Phòng Logistics
            { title: 'Trưởng phòng Logistics', level: 3, department: deptMap.get('Phòng Logistics') },
            { title: 'Chuyên viên Quản lý Kho', level: 2, department: deptMap.get('Phòng Logistics') },
            { title: 'Chuyên viên Vận chuyển', level: 2, department: deptMap.get('Phòng Logistics') },
            { title: 'Nhân viên Kho vận', level: 1, department: deptMap.get('Phòng Logistics') },
        ].filter(p => p.department); // Filter out positions if department wasn't found


        // Check existing positions based on title and departmentId
        const existingPositions = await this.positionRepository.find({ relations: ['department'] });
        const existingPositionKeys = new Set(existingPositions.map(p => `${p.title}-${p.departmentId}`));

        // Map department object to departmentId before filtering
        const positionDataWithDeptId = positionData.map(p => ({
            ...p,
            departmentId: p.department?.id
        }));

        const newPositions = positionDataWithDeptId.filter(p =>
            p.departmentId && !existingPositionKeys.has(`${p.title}-${p.departmentId}`)
        );

        let allPositions: Position[] = [...existingPositions];
        if (newPositions.length > 0) {
            // Create Position entities explicitly using the repository's create method
            const positionEntitiesToSave = newPositions.map(pData => {
                return this.positionRepository.create(pData);
            });

            const newlySavedPos = await this.positionRepository.save(positionEntitiesToSave);
            allPositions = [...existingPositions, ...newlySavedPos];
            console.log(`${newlySavedPos.length} new positions seeded successfully`);
        } else {
             console.log('All positions already exist');
        }

        return { departments: allDepartments, positions: allPositions };
    }

     static async seedUsers(roles: Role[], departments: Department[], positions: Position[]): Promise<User[]> {
        const usersData: DeepPartial<User>[] = [];
        const createdUsers: User[] = [];

        // Tìm các role
        const adminRole = roles.find(r => r.roleType === RoleType.SYSTEM_ADMIN);
        const hrRole = roles.find(r => r.roleType === RoleType.HR_STAFF);
        const headRole = roles.find(r => r.roleType === RoleType.DEPARTMENT_HEAD);
        const employeeRole = roles.find(r => r.roleType === RoleType.EMPLOYEE);

        if (!adminRole || !hrRole || !headRole || !employeeRole) {
            console.error("Essential role not found for seeding users.");
            return [];
        }

        // Tìm các phòng ban
        const boardDept = departments.find(d => d.name === 'Ban Giám đốc');
        const hrDept = departments.find(d => d.name === 'Phòng Nhân sự');
        const adminDept = departments.find(d => d.name === 'Phòng Hành chính');
        const accountingDept = departments.find(d => d.name === 'Phòng Kế toán');
        const salesDept = departments.find(d => d.name === 'Phòng Kinh doanh');
        const marketingDept = departments.find(d => d.name === 'Phòng Marketing');
        const itDept = departments.find(d => d.name === 'Phòng IT');
        const rndDept = departments.find(d => d.name === 'Phòng R&D');
        const customerServiceDept = departments.find(d => d.name === 'Phòng Dịch vụ Khách hàng');
        const logisticsDept = departments.find(d => d.name === 'Phòng Logistics');

        // Hàm hỗ trợ tìm vị trí
        const findPosition = (title: string, dept: Department | undefined) =>
            dept ? positions.find(p => p.title === title && p.departmentId === dept.id) : undefined;

        // Danh sách người dùng
        const userData = [
            // Ban Giám đốc
            { username: 'tonggiandoc', email: 'tgd@company.com', fullName: 'Nguyễn Minh Quân', role: headRole, department: boardDept, position: findPosition('Tổng Giám đốc', boardDept), baseSalary: 150000000, hireDate: new Date(2015, 0, 15) },
            { username: 'photgd', email: 'photgd@company.com', fullName: 'Trần Thị Hương', role: headRole, department: boardDept, position: findPosition('Phó Tổng Giám đốc', boardDept), baseSalary: 120000000, hireDate: new Date(2016, 3, 10) },
            { username: 'trolygiandoc', email: 'trolygiandoc@company.com', fullName: 'Lê Thị Ngọc Ánh', role: employeeRole, department: boardDept, position: findPosition('Trợ lý Giám đốc', boardDept), baseSalary: 25000000, hireDate: new Date(2018, 6, 5) },
            
            // Phòng Nhân sự
            { username: 'hrmanager', email: 'hrmanager@company.com', fullName: 'Phạm Văn Lộc', role: headRole, department: hrDept, position: findPosition('Trưởng phòng Nhân sự', hrDept), baseSalary: 45000000, hireDate: new Date(2017, 2, 15) },
            { username: 'hr_recruitment', email: 'recruitment@company.com', fullName: 'Hoàng Thị Minh Tâm', role: hrRole, department: hrDept, position: findPosition('Chuyên viên Tuyển dụng', hrDept), baseSalary: 20000000, hireDate: new Date(2019, 4, 20) },
            { username: 'hr_training', email: 'training@company.com', fullName: 'Đỗ Văn Nam', role: hrRole, department: hrDept, position: findPosition('Chuyên viên Đào tạo và Phát triển', hrDept), baseSalary: 22000000, hireDate: new Date(2019, 7, 10) },
            { username: 'hr_policy', email: 'hrpolicy@company.com', fullName: 'Vũ Thị Thảo', role: hrRole, department: hrDept, position: findPosition('Chuyên viên Chính sách Nhân sự', hrDept), baseSalary: 21000000, hireDate: new Date(2020, 1, 3) },
            { username: 'hr_staff1', email: 'hrstaff1@company.com', fullName: 'Nguyễn Thị Lan', role: employeeRole, department: hrDept, position: findPosition('Nhân viên Nhân sự', hrDept), baseSalary: 15000000, hireDate: new Date(2021, 8, 15) },
            
            // Phòng Hành chính
            { username: 'adminmanager', email: 'adminmanager@company.com', fullName: 'Mai Văn Tùng', role: headRole, department: adminDept, position: findPosition('Trưởng phòng Hành chính', adminDept), baseSalary: 35000000, hireDate: new Date(2017, 5, 12) },
            { username: 'admin_specialist', email: 'adminspec@company.com', fullName: 'Trần Văn Khoa', role: employeeRole, department: adminDept, position: findPosition('Chuyên viên Hành chính', adminDept), baseSalary: 18000000, hireDate: new Date(2019, 11, 8) },
            { username: 'admin_clerk', email: 'clerk@company.com', fullName: 'Ngô Thị Hồng', role: employeeRole, department: adminDept, position: findPosition('Nhân viên Văn thư', adminDept), baseSalary: 12000000, hireDate: new Date(2021, 2, 22) },
            { username: 'receptionist', email: 'reception@company.com', fullName: 'Phan Thị Thu Hà', role: employeeRole, department: adminDept, position: findPosition('Nhân viên Lễ tân', adminDept), baseSalary: 10000000, hireDate: new Date(2022, 5, 5) },
            
            // Phòng Kế toán
            { username: 'chiefaccountant', email: 'chiefacc@company.com', fullName: 'Lê Thị Bích Ngọc', role: headRole, department: accountingDept, position: findPosition('Kế toán trưởng', accountingDept), baseSalary: 40000000, hireDate: new Date(2016, 8, 1) },
            { username: 'acc_general', email: 'accgeneral@company.com', fullName: 'Nguyễn Văn Tuấn', role: employeeRole, department: accountingDept, position: findPosition('Kế toán tổng hợp', accountingDept), baseSalary: 25000000, hireDate: new Date(2018, 3, 10) },
            { username: 'acc_payment', email: 'accpayment@company.com', fullName: 'Trịnh Thị Hoa', role: employeeRole, department: accountingDept, position: findPosition('Kế toán thanh toán', accountingDept), baseSalary: 22000000, hireDate: new Date(2019, 2, 15) },
            { username: 'acc_debt', email: 'accdebt@company.com', fullName: 'Hoàng Văn Minh', role: employeeRole, department: accountingDept, position: findPosition('Kế toán công nợ', accountingDept), baseSalary: 22000000, hireDate: new Date(2020, 6, 20) },
            { username: 'acc_staff', email: 'accstaff@company.com', fullName: 'Bùi Thị Mai', role: employeeRole, department: accountingDept, position: findPosition('Nhân viên Kế toán', accountingDept), baseSalary: 15000000, hireDate: new Date(2022, 1, 10) },
            
            // Phòng Kinh doanh
            { username: 'salesdirector', email: 'salesdirector@company.com', fullName: 'Vũ Đình Hùng', role: headRole, department: salesDept, position: findPosition('Giám đốc Kinh doanh', salesDept), baseSalary: 50000000, hireDate: new Date(2017, 1, 10) },
            { username: 'salesleader', email: 'salesleader@company.com', fullName: 'Nguyễn Thị Thúy', role: employeeRole, department: salesDept, position: findPosition('Trưởng nhóm Kinh doanh', salesDept), baseSalary: 30000000, hireDate: new Date(2018, 5, 15) },
            { username: 'sales_specialist1', email: 'salesspec1@company.com', fullName: 'Trần Văn Long', role: employeeRole, department: salesDept, position: findPosition('Chuyên viên Kinh doanh', salesDept), baseSalary: 20000000, hireDate: new Date(2019, 7, 20) },
            { username: 'sales_specialist2', email: 'salesspec2@company.com', fullName: 'Phạm Thị Ngọc', role: employeeRole, department: salesDept, position: findPosition('Chuyên viên Kinh doanh', salesDept), baseSalary: 20000000, hireDate: new Date(2020, 2, 5) },
            { username: 'sales_staff1', email: 'salesstaff1@company.com', fullName: 'Lê Minh Hoàng', role: employeeRole, department: salesDept, position: findPosition('Nhân viên Kinh doanh', salesDept), baseSalary: 15000000, hireDate: new Date(2021, 3, 12) },
            { username: 'sales_staff2', email: 'salesstaff2@company.com', fullName: 'Đặng Thị Hương', role: employeeRole, department: salesDept, position: findPosition('Nhân viên Kinh doanh', salesDept), baseSalary: 15000000, hireDate: new Date(2022, 4, 15) },
            
            // Phòng Marketing
            { username: 'marketingdirector', email: 'mktdirector@company.com', fullName: 'Nguyễn Minh Đức', role: headRole, department: marketingDept, position: findPosition('Giám đốc Marketing', marketingDept), baseSalary: 45000000, hireDate: new Date(2018, 1, 15) },
            { username: 'mkt_online', email: 'mktonline@company.com', fullName: 'Trần Thị Kim Anh', role: employeeRole, department: marketingDept, position: findPosition('Chuyên viên Marketing Online', marketingDept), baseSalary: 25000000, hireDate: new Date(2019, 3, 10) },
            { username: 'mkt_content', email: 'content@company.com', fullName: 'Vũ Hoàng Nam', role: employeeRole, department: marketingDept, position: findPosition('Chuyên viên Content', marketingDept), baseSalary: 23000000, hireDate: new Date(2020, 5, 20) },
            { username: 'mkt_design', email: 'design@company.com', fullName: 'Phạm Thị Thanh', role: employeeRole, department: marketingDept, position: findPosition('Chuyên viên Thiết kế', marketingDept), baseSalary: 24000000, hireDate: new Date(2019, 9, 5) },
            { username: 'mkt_staff', email: 'mktstaff@company.com', fullName: 'Lê Văn Quang', role: employeeRole, department: marketingDept, position: findPosition('Nhân viên Marketing', marketingDept), baseSalary: 16000000, hireDate: new Date(2021, 7, 15) },
            
            // Phòng IT
            { username: 'itdirector', email: 'itdirector@company.com', fullName: 'Đỗ Minh Tuấn', role: headRole, department: itDept, position: findPosition('Giám đốc CNTT', itDept), baseSalary: 55000000, hireDate: new Date(2017, 3, 1) },
            { username: 'devlead', email: 'devlead@company.com', fullName: 'Nguyễn Văn Hải', role: employeeRole, department: itDept, position: findPosition('Trưởng nhóm Phát triển', itDept), baseSalary: 40000000, hireDate: new Date(2018, 6, 15) },
            { username: 'frontend1', email: 'frontend1@company.com', fullName: 'Trần Minh Khoa', role: employeeRole, department: itDept, position: findPosition('Lập trình viên Frontend', itDept), baseSalary: 30000000, hireDate: new Date(2019, 5, 10) },
            { username: 'frontend2', email: 'frontend2@company.com', fullName: 'Lê Thị Thu Trang', role: employeeRole, department: itDept, position: findPosition('Lập trình viên Frontend', itDept), baseSalary: 30000000, hireDate: new Date(2020, 3, 5) },
            { username: 'backend1', email: 'backend1@company.com', fullName: 'Phạm Văn Dũng', role: employeeRole, department: itDept, position: findPosition('Lập trình viên Backend', itDept), baseSalary: 32000000, hireDate: new Date(2019, 2, 15) },
            { username: 'backend2', email: 'backend2@company.com', fullName: 'Hoàng Thị Hà', role: employeeRole, department: itDept, position: findPosition('Lập trình viên Backend', itDept), baseSalary: 32000000, hireDate: new Date(2020, 4, 20) },
            { username: 'devops', email: 'devops@company.com', fullName: 'Nguyễn Xuân Thành', role: employeeRole, department: itDept, position: findPosition('Kỹ sư DevOps', itDept), baseSalary: 35000000, hireDate: new Date(2019, 8, 12) },
            { username: 'qa_qc', email: 'qaqc@company.com', fullName: 'Vũ Thị Phương', role: employeeRole, department: itDept, position: findPosition('Chuyên viên QA/QC', itDept), baseSalary: 28000000, hireDate: new Date(2020, 6, 10) },
            { username: 'itsupport', email: 'itsupport@company.com', fullName: 'Lê Văn Hưng', role: employeeRole, department: itDept, position: findPosition('Nhân viên IT Support', itDept), baseSalary: 18000000, hireDate: new Date(2021, 5, 15) },
            
            // Phòng R&D
            { username: 'rnddirector', email: 'rnddirector@company.com', fullName: 'Trần Văn Minh', role: headRole, department: rndDept, position: findPosition('Giám đốc R&D', rndDept), baseSalary: 50000000, hireDate: new Date(2018, 2, 5) },
            { username: 'researchlead', email: 'researchlead@company.com', fullName: 'Nguyễn Thị Hồng Nhung', role: employeeRole, department: rndDept, position: findPosition('Trưởng nhóm Nghiên cứu', rndDept), baseSalary: 38000000, hireDate: new Date(2019, 4, 10) },
            { username: 'researcher1', email: 'researcher1@company.com', fullName: 'Phạm Minh Hiếu', role: employeeRole, department: rndDept, position: findPosition('Chuyên viên Nghiên cứu', rndDept), baseSalary: 30000000, hireDate: new Date(2020, 3, 15) },
            { username: 'researcher2', email: 'researcher2@company.com', fullName: 'Lê Thị Lan Anh', role: employeeRole, department: rndDept, position: findPosition('Chuyên viên Nghiên cứu', rndDept), baseSalary: 30000000, hireDate: new Date(2021, 2, 20) },
            { username: 'product_engineer', email: 'prodeng@company.com', fullName: 'Đỗ Văn Thắng', role: employeeRole, department: rndDept, position: findPosition('Kỹ sư Phát triển Sản phẩm', rndDept), baseSalary: 32000000, hireDate: new Date(2020, 5, 10) },
            
            // Phòng Dịch vụ Khách hàng
            { username: 'csmanager', email: 'csmanager@company.com', fullName: 'Nguyễn Thị Thùy Dương', role: headRole, department: customerServiceDept, position: findPosition('Trưởng phòng DVKH', customerServiceDept), baseSalary: 35000000, hireDate: new Date(2018, 7, 10) },
            { username: 'cs_specialist1', email: 'csspec1@company.com', fullName: 'Trần Văn Quý', role: employeeRole, department: customerServiceDept, position: findPosition('Chuyên viên CSKH', customerServiceDept), baseSalary: 20000000, hireDate: new Date(2019, 9, 15) },
            { username: 'cs_specialist2', email: 'csspec2@company.com', fullName: 'Lê Thị Thu Huyền', role: employeeRole, department: customerServiceDept, position: findPosition('Chuyên viên CSKH', customerServiceDept), baseSalary: 20000000, hireDate: new Date(2020, 8, 20) },
            { username: 'callcenter1', email: 'callcenter1@company.com', fullName: 'Phạm Văn Hiệp', role: employeeRole, department: customerServiceDept, position: findPosition('Nhân viên Tổng đài', customerServiceDept), baseSalary: 12000000, hireDate: new Date(2021, 4, 5) },
            { username: 'callcenter2', email: 'callcenter2@company.com', fullName: 'Hoàng Thị Ngọc', role: employeeRole, department: customerServiceDept, position: findPosition('Nhân viên Tổng đài', customerServiceDept), baseSalary: 12000000, hireDate: new Date(2022, 2, 10) },
            
            // Phòng Logistics
            { username: 'logisticsmanager', email: 'logmanager@company.com', fullName: 'Đỗ Văn Hòa', role: headRole, department: logisticsDept, position: findPosition('Trưởng phòng Logistics', logisticsDept), baseSalary: 38000000, hireDate: new Date(2018, 5, 15) },
            { username: 'warehouse_specialist', email: 'warehouse@company.com', fullName: 'Nguyễn Văn Thắng', role: employeeRole, department: logisticsDept, position: findPosition('Chuyên viên Quản lý Kho', logisticsDept), baseSalary: 22000000, hireDate: new Date(2019, 6, 20) },
            { username: 'shipping_specialist', email: 'shipping@company.com', fullName: 'Trần Thị Lan', role: employeeRole, department: logisticsDept, position: findPosition('Chuyên viên Vận chuyển', logisticsDept), baseSalary: 22000000, hireDate: new Date(2020, 7, 5) },
            { username: 'logistics_staff1', email: 'logstaff1@company.com', fullName: 'Lê Văn Khoa', role: employeeRole, department: logisticsDept, position: findPosition('Nhân viên Kho vận', logisticsDept), baseSalary: 13000000, hireDate: new Date(2021, 9, 10) },
            { username: 'logistics_staff2', email: 'logstaff2@company.com', fullName: 'Phạm Thị Thảo', role: employeeRole, department: logisticsDept, position: findPosition('Nhân viên Kho vận', logisticsDept), baseSalary: 13000000, hireDate: new Date(2022, 3, 15) },
        ];

        // Lọc ra những người dùng hợp lệ (có đủ thông tin department, position và role)
        const validUserData = userData.filter(u => u.department && u.position && u.role);

        for (const userData of validUserData) {
            const existingUser = await this.findOneUser({ where: [{ username: userData.username }, {email: userData.email}] });
            if (!existingUser) {
                const passwordHash = await this.hashPassword('password123'); // Default password for seeded users
                const userToCreate = this.userRepository.create({
                    ...userData,
                    passwordHash: passwordHash,
                    isActive: true,
                    remainingLeaves: 12, // Default leaves
                    roleId: userData.role?.id, // Ensure IDs are set if objects are used
                    departmentId: userData.department?.id,
                    description: userData.position?.title,
                });
                try {
                    const savedUser = await this.userRepository.save(userToCreate);
                    createdUsers.push(savedUser);
                    console.log(`User ${savedUser.username} created.`);
                } catch (error: any) {
                    console.error(`Failed to save user ${userData.username}: ${error.message}`);
                }
            } else {
                console.log(`User ${userData.username} or email ${userData.email} already exists, skipping.`);
                createdUsers.push(existingUser);
            }
        }

        console.log(`${createdUsers.length} users processed (created or already existing).`);
        return createdUsers;
    }

    static async seedLeaves(users: User[]) {
        const employees = users.filter(u => u.role.roleType !== RoleType.SYSTEM_ADMIN);
        if (employees.length === 0) {
            console.log("No employees found to seed leaves for.");
            return;
        }

        const leaveData: DeepPartial<Leave>[] = [];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // Lấy danh sách các trưởng phòng để phê duyệt đơn
        const departmentHeads = users.filter(u => u.role.roleType === RoleType.DEPARTMENT_HEAD);
        
        // Lấy danh sách nhân viên HR để phê duyệt đơn (backup)
        const hrStaff = users.filter(u => 
            u.role.roleType === RoleType.HR_STAFF || 
            (u.department?.name === 'Phòng Nhân sự' && u.role.roleType === RoleType.DEPARTMENT_HEAD)
        );

        // Các lý do nghỉ phép thực tế
        const sickLeaveReasons = [
            "Bị cảm, sốt", 
            "Đau bụng, tiêu chảy", 
            "Đau đầu, chóng mặt", 
            "Đau răng, phải đi nhổ răng", 
            "Viêm họng, khó nuốt", 
            "Bị thương cần nghỉ ngơi", 
            "Bị ốm cần đi khám bệnh"
        ];
        
        const annualLeaveReasons = [
            "Về quê thăm gia đình", 
            "Có việc gia đình cần giải quyết", 
            "Nghỉ mát cùng gia đình", 
            "Đi du lịch", 
            "Có việc cá nhân quan trọng", 
            "Tham dự đám cưới người thân", 
            "Nghỉ ngơi, phục hồi sức khỏe"
        ];
        
        const otherLeaveReasons = [
            "Đưa con đi khám bệnh", 
            "Đi làm giấy tờ cá nhân", 
            "Sửa chữa nhà cửa", 
            "Tham dự đám cưới bạn bè", 
            "Tổ chức sự kiện gia đình", 
            "Giải quyết vấn đề tài chính cá nhân"
        ];

        // Tạo lịch nghỉ lễ trong năm
        const holidays = [
            { startDate: new Date(currentYear, 0, 1), endDate: new Date(currentYear, 0, 1), name: "Tết Dương lịch" },
            { startDate: new Date(currentYear, 1, 8), endDate: new Date(currentYear, 1, 14), name: "Tết Nguyên đán" },
            { startDate: new Date(currentYear, 3, 30), endDate: new Date(currentYear, 4, 1), name: "Giỗ tổ Hùng Vương và Lễ 30/4 - 1/5" },
            { startDate: new Date(currentYear, 8, 2), endDate: new Date(currentYear, 8, 2), name: "Quốc khánh 2/9" },
        ];

        // Thêm các ngày lễ vào cơ sở dữ liệu
        for (const holiday of holidays) {
            const days = Math.ceil((holiday.endDate.getTime() - holiday.startDate.getTime()) / (1000 * 3600 * 24)) + 1;
            
            // Tạo nghỉ lễ cho nhân viên được chọn ngẫu nhiên (đối với lễ dài ngày như Tết)
            if (days > 1) {
                // Chọn một số lượng nhân viên ngẫu nhiên (80% tổng số)
                const selectedEmployees = employees
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.floor(employees.length * 0.8));
                
                for (const employee of selectedEmployees) {
                    leaveData.push({
                        user: employee,
                        userId: employee.id,
                        startDate: holiday.startDate,
                        endDate: holiday.endDate,
                        type: LeaveType.HOLIDAY,
                        reason: `Nghỉ lễ: ${holiday.name}`,
                        status: LeaveStatus.APPROVED,
                        approverId: departmentHeads.find(h => h.departmentId === employee.departmentId)?.id 
                            || hrStaff[0]?.id,
                        numberOfDays: days,
                        holidayBatchId: `${holiday.name}-${currentYear}`,
                        holidayBatchName: holiday.name
                    });
                }
            } else { // Đối với lễ ngắn 1 ngày, tạo cho tất cả nhân viên
                for (const employee of employees) {
                    leaveData.push({
                        user: employee,
                        userId: employee.id,
                        startDate: holiday.startDate,
                        endDate: holiday.endDate,
                        type: LeaveType.HOLIDAY,
                        reason: `Nghỉ lễ: ${holiday.name}`,
                        status: LeaveStatus.APPROVED,
                        approverId: departmentHeads.find(h => h.departmentId === employee.departmentId)?.id 
                            || hrStaff[0]?.id,
                        numberOfDays: days,
                        holidayBatchId: `${holiday.name}-${currentYear}`,
                        holidayBatchName: holiday.name
                    });
                }
            }
        }

        // Tạo đơn nghỉ phép cho từng nhân viên
        for (const employee of employees) {
            // Hàm để lấy người phê duyệt của nhân viên
            const getApprover = () => {
                // Người duyệt là trưởng phòng của nhân viên đó
                const approver = departmentHeads.find(h => h.departmentId === employee.departmentId && h.id !== employee.id);
                
                // Nếu không tìm thấy, lấy một người từ phòng HR
                if (!approver) {
                    return hrStaff[0];
                }
                return approver;
            };
            
            const approver = getApprover();
            
            // Số lượng đơn nghỉ phép tạo cho mỗi nhân viên (ngẫu nhiên từ 1-4)
            const leaveCount = Math.floor(Math.random() * 4) + 1;
            
            for (let i = 0; i < leaveCount; i++) {
                // Tạo ngày bắt đầu ngẫu nhiên trong năm, nhưng không quá hiện tại
                const randomMonth = Math.floor(Math.random() * (currentMonth + 1));
                const randomDay = Math.floor(Math.random() * 28) + 1; // Tránh lỗi ngày không hợp lệ
                const startDate = new Date(currentYear, randomMonth, randomDay);
                
                // Số ngày nghỉ ngẫu nhiên từ 1-5
                const leaveDuration = Math.floor(Math.random() * 5) + 1;
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + leaveDuration - 1);
                
                // Loại nghỉ phép ngẫu nhiên
                const leaveTypes = [LeaveType.ANNUAL, LeaveType.SICK, LeaveType.OTHER];
                const randomType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
                
                // Lấy lý do nghỉ phép tương ứng
                let reasonList;
                switch (randomType) {
                    case LeaveType.SICK:
                        reasonList = sickLeaveReasons;
                        break;
                    case LeaveType.ANNUAL:
                        reasonList = annualLeaveReasons;
                        break;
                    default:
                        reasonList = otherLeaveReasons;
                        break;
                }
                const reason = reasonList[Math.floor(Math.random() * reasonList.length)];
                
                // Trạng thái đơn: nếu đã hết thời gian nghỉ phép, đơn sẽ được chấp thuận
                // Nếu là đơn trong tương lai, sẽ ở trạng thái pending
                const today = new Date();
                let status = LeaveStatus.PENDING;
                let rejectionReason = null;
                
                if (endDate < today) {
                    // 90% đơn được chấp thuận, 10% bị từ chối
                    status = Math.random() < 0.9 ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
                    if (status === LeaveStatus.REJECTED) {
                        const rejectionReasons = [
                            "Quá thời hạn nộp đơn",
                            "Công việc cần hoàn thành gấp",
                            "Thiếu nhân sự trong thời gian xin nghỉ",
                            "Thông tin trong đơn không đầy đủ"
                        ];
                        rejectionReason = rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];
                    }
                }
                
                leaveData.push({
                    user: employee,
                    userId: employee.id,
                    startDate: startDate,
                    endDate: endDate,
                    type: randomType,
                    reason: reason,
                    status: status,
                    approver: status !== LeaveStatus.PENDING ? approver : undefined,
                    approverId: status !== LeaveStatus.PENDING ? approver?.id : undefined,
                    rejectionReason: status === LeaveStatus.REJECTED ? rejectionReason as string : undefined,
                    numberOfDays: leaveDuration
                });
            }
        }

        // Lưu dữ liệu vào cơ sở dữ liệu
        if (leaveData.length > 0) {
            await this.leaveRepository.save(leaveData);
            console.log(`${leaveData.length} leaves seeded successfully`);
        }
    }

     static async seedReports(users: User[], departments: Department[]) {
        const departmentHeads = users.filter(u => u.role.roleType === RoleType.DEPARTMENT_HEAD);
        if (departmentHeads.length === 0 || departments.length === 0) {
            console.log("No department heads or departments found to seed reports for.");
            return;
        }

        const reportData: DeepPartial<DepartmentReport>[] = [];
        const currentYear = new Date().getFullYear();
        const lastMonth = new Date().getMonth(); // 0-indexed

        for (const head of departmentHeads) {
             const department = departments.find(d => d.id === head.departmentId);
             if (department) {
                 // Generate some dummy stats for the report
                 const totalEmployees = users.filter(u => u.departmentId === department.id).length;
                 const totalLeaves = Math.floor(Math.random() * 5); // Random leaves
                 const avgPerf = parseFloat((Math.random() * (5 - 3) + 3).toFixed(2)); // Random rating 3-5
                 const totalSalary = Math.floor(Math.random() * 500000) + 200000; // Random salary sum

                 reportData.push({
                     department: department,
                     departmentId: department.id,
                     reportDate: new Date(currentYear, lastMonth, 1), // Report for last month
                     totalEmployees: totalEmployees,
                     newEmployees: Math.floor(Math.random() * 3),
                     resignedEmployees: Math.floor(Math.random() * 2),
                     totalLeaves: totalLeaves,
                     totalTrainingHours: Math.floor(Math.random() * 100),
                     totalSalary: totalSalary,
                     totalAllowances: totalSalary * 0.1, // Dummy allowances
                     totalDeductions: totalSalary * 0.05, // Dummy deductions
                     averagePerformanceRating: avgPerf
                     // generatedAt is handled by @CreateDateColumn
                 });
             }
        }


        if (reportData.length > 0) {
            await this.reportRepository.save(reportData);
            console.log('Department reports seeded successfully');
        }
    }

    static async seedAttendances(users: User[]) {
        const employees = users.filter(u => u.role.roleType !== RoleType.SYSTEM_ADMIN);
        if (employees.length === 0) {
            console.log("No employees found to seed attendances for.");
            return;
        }

        const attendanceData: DeepPartial<Attendance>[] = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        // Hàm format ngày
        const formatDate = (date: Date): string => date.toISOString().split('T')[0];
        
        // Hàm tạo giờ check-in ngẫu nhiên (từ 7:30 đến 9:30)
        const generateRandomCheckInTime = (): string => {
            const hour = Math.floor(Math.random() * 2) + 7; // 7-8h
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        };
        
        // Hàm tạo giờ check-out ngẫu nhiên (từ 17:00 đến 19:00)
        const generateRandomCheckOutTime = (): string => {
            const hour = Math.floor(Math.random() * 2) + 17; // 17-18h
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        };
        
        // Hàm tính số giờ làm việc
        const calculateWorkHours = (checkInTime: string, checkOutTime: string): number => {
            const [inHour, inMinute, inSecond] = checkInTime.split(':').map(Number);
            const [outHour, outMinute, outSecond] = checkOutTime.split(':').map(Number);
            
            const inTotalMinutes = inHour * 60 + inMinute + inSecond / 60;
            const outTotalMinutes = outHour * 60 + outMinute + outSecond / 60;
            
            return parseFloat(((outTotalMinutes - inTotalMinutes) / 60).toFixed(2));
        };
        
        // Tạo dữ liệu chấm công cho 30 ngày gần nhất (không tính ngày hiện tại)
        const startDate = new Date();
        startDate.setDate(today.getDate() - 30);
        
        // Lấy danh sách các đơn nghỉ phép đã được phê duyệt
        const approvedLeaves = await this.leaveRepository.find({
            where: {
                status: LeaveStatus.APPROVED,
                startDate: MoreThanOrEqual(startDate),
                endDate: LessThanOrEqual(today)
            },
            relations: ['user']
        });
        
        // Tạo Map để tra cứu nhanh các ngày nghỉ phép của nhân viên
        const leaveMap = new Map<string, Leave>();
        for (const leave of approvedLeaves) {
            const startTime = new Date(leave.startDate).getTime();
            const endTime = new Date(leave.endDate).getTime();
            const userId = leave.userId;
            
            // Tạo key cho mỗi ngày nghỉ của nhân viên
            for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
                const date = new Date(time);
                const key = `${userId}-${formatDate(date)}`;
                leaveMap.set(key, leave);
            }
        }
        
        // Lọc ra các ngày cuối tuần (thứ 7, chủ nhật)
        const isWeekend = (date: Date): boolean => {
            const day = date.getDay();
            return day === 0 || day === 6; // 0 = Chủ nhật, 6 = Thứ 7
        };
        
        // Tạo dữ liệu chấm công cho mỗi nhân viên
        for (const employee of employees) {
            for (let d = new Date(startDate); d < today; d.setDate(d.getDate() + 1)) {
                const currentDate = new Date(d);
                
                // Bỏ qua ngày cuối tuần
                if (isWeekend(currentDate)) {
                    continue;
                }
                
                const dateKey = `${employee.id}-${formatDate(currentDate)}`;
                
                // Kiểm tra xem nhân viên có nghỉ phép đã được duyệt hay không
                if (leaveMap.has(dateKey)) {
                    const leave = leaveMap.get(dateKey);
                    attendanceData.push({
                        user: employee,
                        date: formatDate(currentDate),
                        checkInTime: null,
                        checkOutTime: null,
                        status: AttendanceStatus.LEAVE,
                        workHours: 0,
                        leaveRequest: leave, // Liên kết với đơn nghỉ phép
                        notes: `Nghỉ phép - ${leave?.type}: ${leave?.reason}`
                    });
                } else {
                    // Tạo ngẫu nhiên trạng thái đi làm
                    // 80% đi làm đúng giờ, 15% đi muộn, 5% vắng mặt không lý do
                    const random = Math.random();
                    
                    if (random < 0.80) { // Đi làm đúng giờ
                        const checkInTime = generateRandomCheckInTime();
                        const checkOutTime = generateRandomCheckOutTime();
                        const workHours = calculateWorkHours(checkInTime, checkOutTime);
                        
                        attendanceData.push({
                            user: employee,
                            date: formatDate(currentDate),
                            checkInTime: checkInTime,
                            checkOutTime: checkOutTime,
                            status: AttendanceStatus.PRESENT,
                            workHours: workHours
                        });
                    } else if (random < 0.95) { // Đi làm muộn
                        // Tạo thời gian check-in muộn (từ 9:00 đến 10:30)
                        const hour = Math.floor(Math.random() * 2) + 9; // 9-10h
                        const minute = Math.floor(Math.random() * 60);
                        const second = Math.floor(Math.random() * 60);
                        const lateCheckInTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
                        
                        const checkOutTime = generateRandomCheckOutTime();
                        const workHours = calculateWorkHours(lateCheckInTime, checkOutTime);
                        
                        attendanceData.push({
                            user: employee,
                            date: formatDate(currentDate),
                            checkInTime: lateCheckInTime,
                            checkOutTime: checkOutTime,
                            status: AttendanceStatus.LATE,
                            workHours: workHours,
                            notes: 'Đi muộn'
                        });
                    } else { // Vắng mặt không lý do
                        attendanceData.push({
                            user: employee,
                            date: formatDate(currentDate),
                            checkInTime: null,
                            checkOutTime: null,
                            status: AttendanceStatus.ABSENT,
                            workHours: 0,
                            notes: 'Vắng mặt không lý do'
                        });
                    }
                }
            }
            
            // Thêm dữ liệu cho ngày hôm nay (nếu không phải cuối tuần)
            if (!isWeekend(today)) {
                const todayKey = `${employee.id}-${formatDate(today)}`;
                
                // Kiểm tra xem nhân viên có nghỉ phép không
                if (leaveMap.has(todayKey)) {
                    const leave = leaveMap.get(todayKey);
                    attendanceData.push({
                        user: employee,
                        date: formatDate(today),
                        checkInTime: null,
                        checkOutTime: null,
                        status: AttendanceStatus.LEAVE,
                        workHours: 0,
                        leaveRequest: leave,
                        notes: `Nghỉ phép - ${leave?.type}: ${leave?.reason}`
                    });
                } else {
                    // 90% nhân viên đã check-in, 10% chưa check-in
                    const hasCheckedIn = Math.random() < 0.9;
                    
                    if (hasCheckedIn) {
                        const checkInTime = generateRandomCheckInTime();
                        // 50% nhân viên đã check-out, 50% chưa check-out
                        const hasCheckedOut = Math.random() < 0.5;
                        
                        attendanceData.push({
                            user: employee,
                            date: formatDate(today),
                            checkInTime: checkInTime,
                            checkOutTime: hasCheckedOut ? generateRandomCheckOutTime() : null,
                            status: parseInt(checkInTime.split(':')[0]) >= 9 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
                            workHours: hasCheckedOut ? calculateWorkHours(checkInTime, generateRandomCheckOutTime()) : null,
                            notes: parseInt(checkInTime.split(':')[0]) >= 9 ? 'Đi muộn' : null
                        });
                    }
                }
            }
        }

        if (attendanceData.length > 0) {
            // Kiểm tra bản ghi đã tồn tại để tránh trùng lặp
            const existingChecks = attendanceData.map(ad => ({ userId: ad.user?.id, date: ad.date }));
            const existingRecords = await this.attendanceRepository.find({
                where: existingChecks
                    .filter(ec => ec.userId)
                    .map(ec => ({ user: { id: ec.userId }, date: ec.date }))
            });
            const existingKeys = new Set(existingRecords.map(ar => `${ar.user?.id}-${ar.date}`));

            const newAttendanceData = attendanceData.filter(ad => ad.user?.id && !existingKeys.has(`${ad.user.id}-${ad.date}`));

            if (newAttendanceData.length > 0) {
                // Lưu dữ liệu theo lô để tránh lỗi khi lượng dữ liệu lớn
                const batchSize = 100;
                for (let i = 0; i < newAttendanceData.length; i += batchSize) {
                    const batch = newAttendanceData.slice(i, i + batchSize);
                    await this.attendanceRepository.save(batch);
                    console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} attendance records saved`);
                }
                console.log(`Total: ${newAttendanceData.length} attendance records seeded successfully`);
            } else {
                console.log('All seeded attendance records already exist or conflict.');
            }
        }
    }

    static async seedPerformance(users: User[], departments: Department[]) {
        // Lọc ra trưởng phòng và nhân viên
        const departmentHeads = users.filter(u => u.role.roleType === RoleType.DEPARTMENT_HEAD);
        const employees = users.filter(u => u.role.roleType === RoleType.EMPLOYEE);

        if (departmentHeads.length === 0 || employees.length === 0) {
            console.log("No department heads or employees found to seed performance data for.");
            return;
        }

        const plans: DeepPartial<PerformancePlan>[] = [];
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;

        // Tiêu chí đánh giá chi tiết
        const performanceCriteria = [
            {
                id: 1,
                name: "Chất lượng công việc",
                weight: 0.25,
                description: "Đánh giá chất lượng và độ chính xác của công việc hoàn thành"
            },
            {
                id: 2,
                name: "Hiệu suất làm việc",
                weight: 0.25,
                description: "Đánh giá số lượng công việc hoàn thành và thời gian thực hiện"
            },
            {
                id: 3,
                name: "Tinh thần làm việc",
                weight: 0.15,
                description: "Đánh giá thái độ, trách nhiệm và chủ động trong công việc"
            },
            {
                id: 4,
                name: "Kỹ năng giao tiếp",
                weight: 0.15,
                description: "Đánh giá khả năng giao tiếp, trình bày và lắng nghe"
            },
            {
                id: 5,
                name: "Kỹ năng làm việc nhóm",
                weight: 0.1,
                description: "Đánh giá khả năng phối hợp với đồng nghiệp và làm việc nhóm"
            },
            {
                id: 6,
                name: "Tuân thủ quy định",
                weight: 0.1,
                description: "Đánh giá việc tuân thủ nội quy, quy định của công ty"
            }
        ];

        // Tạo kế hoạch đánh giá năm trước đã hoàn thành
        for (const head of departmentHeads) {
            const dept = departments.find(d => d.id === head.departmentId);
            if (dept) {
                const previousYearPlan = {
                    title: `Đánh giá hiệu suất ${dept.name} năm ${previousYear}`,
                    description: `Kế hoạch đánh giá hiệu suất nhân viên ${dept.name} năm ${previousYear}`,
                    startDate: new Date(previousYear, 0, 1), // 1/1/năm trước
                    endDate: new Date(previousYear, 11, 31), // 31/12/năm trước
                    departments: [dept],
                    createdBy: head.id,
                    creator: head,
                    status: PlanStatus.COMPLETED,
                    criteria: performanceCriteria
                };
                plans.push(previousYearPlan);
                
                // Tạo kế hoạch đánh giá năm hiện tại
                const currentYearPlan = {
                    title: `Đánh giá hiệu suất ${dept.name} năm ${currentYear}`,
                    description: `Kế hoạch đánh giá hiệu suất nhân viên ${dept.name} năm ${currentYear}`,
                    startDate: new Date(currentYear, 0, 1), // 1/1/năm hiện tại
                    endDate: new Date(currentYear, 11, 31), // 31/12/năm hiện tại
                    departments: [dept],
                    createdBy: head.id,
                    creator: head,
                    status: PlanStatus.ACTIVE,
                    criteria: performanceCriteria
                };
                plans.push(currentYearPlan);
            }
        }

        // Lưu kế hoạch đánh giá
        const savedPlans = await this.performancePlanRepository.save(plans);
        console.log(`${savedPlans.length} performance plans seeded successfully`);

        // Tạo dữ liệu đánh giá hiệu suất
        const reviews: DeepPartial<PerformanceReview>[] = [];

        // Các mẫu comment đánh giá
        const commentTemplates: Record<string, string[]> = {
            excellent: [
                "Nhân viên luôn hoàn thành xuất sắc công việc được giao, vượt chỉ tiêu đề ra.",
                "Luôn chủ động, sáng tạo và mang lại kết quả vượt trội trong công việc.",
                "Đưa ra nhiều sáng kiến cải tiến quy trình, giúp tăng hiệu quả công việc."
            ],
            good: [
                "Hoàn thành tốt các nhiệm vụ được giao, đáp ứng đầy đủ yêu cầu công việc.",
                "Có tinh thần trách nhiệm cao, luôn hoàn thành đúng tiến độ.",
                "Kết quả công việc đạt chất lượng tốt, ít khi cần chỉnh sửa."
            ],
            average: [
                "Hoàn thành các nhiệm vụ cơ bản, đôi khi cần hướng dẫn thêm.",
                "Đáp ứng được yêu cầu công việc, nhưng cần cải thiện về tiến độ.",
                "Kết quả công việc đạt yêu cầu, nhưng đôi khi còn thiếu sáng tạo."
            ],
            needImprovement: [
                "Cần nỗ lực hơn để đạt được kết quả tốt hơn trong công việc.",
                "Đôi khi còn chậm tiến độ, cần cải thiện khả năng quản lý thời gian.",
                "Cần tăng cường tính chủ động và sáng tạo trong công việc."
            ]
        };
        
        const improvementTemplates: Record<string, string[]> = {
            communication: [
                "Cần cải thiện kỹ năng giao tiếp và trình bày ý tưởng.",
                "Nên tăng cường khả năng lắng nghe và tiếp thu ý kiến đóng góp.",
                "Cần phản hồi email và các yêu cầu một cách kịp thời hơn."
            ],
            teamwork: [
                "Cần cải thiện khả năng làm việc nhóm và phối hợp với đồng nghiệp.",
                "Nên chủ động chia sẻ thông tin và kiến thức với thành viên trong nhóm.",
                "Cần tích cực tham gia vào các hoạt động nhóm hơn nữa."
            ],
            timeManagement: [
                "Cần cải thiện kỹ năng quản lý thời gian và sắp xếp công việc.",
                "Nên lập kế hoạch công việc chi tiết hơn để tránh trễ deadline.",
                "Cần phân bổ thời gian hợp lý cho các nhiệm vụ khác nhau."
            ],
            technical: [
                "Cần cập nhật và nâng cao kiến thức chuyên môn.",
                "Nên tham gia các khóa đào tạo để bổ sung kỹ năng còn thiếu.",
                "Cần tìm hiểu sâu hơn về quy trình và công cụ mới."
            ],
            initiative: [
                "Cần chủ động hơn trong việc đề xuất ý tưởng và giải pháp.",
                "Nên tích cực tìm kiếm cơ hội cải tiến quy trình hiện tại.",
                "Cần mạnh dạn đưa ra ý kiến và góp ý trong các cuộc họp."
            ]
        };
        
        const strengthTemplates: Record<string, string[]> = {
            professional: [
                "Có kiến thức chuyên môn vững vàng và khả năng ứng dụng tốt.",
                "Luôn cập nhật xu hướng mới và áp dụng vào công việc hiệu quả.",
                "Có khả năng giải quyết vấn đề phức tạp một cách sáng tạo."
            ],
            attitude: [
                "Có thái độ làm việc tích cực và tinh thần trách nhiệm cao.",
                "Luôn sẵn sàng hỗ trợ đồng nghiệp khi cần thiết.",
                "Có tinh thần cầu tiến và không ngừng học hỏi."
            ],
            efficiency: [
                "Làm việc hiệu quả và tối ưu hóa thời gian.",
                "Có khả năng xử lý nhiều công việc cùng lúc mà vẫn đảm bảo chất lượng.",
                "Luôn hoàn thành công việc đúng hoặc trước thời hạn."
            ],
            teamwork: [
                "Có khả năng làm việc nhóm tốt và phối hợp hiệu quả với đồng nghiệp.",
                "Tạo được không khí làm việc tích cực và đoàn kết.",
                "Có khả năng lãnh đạo và truyền cảm hứng cho thành viên trong nhóm."
            ],
            communication: [
                "Có kỹ năng giao tiếp tốt, truyền đạt thông tin rõ ràng và súc tích.",
                "Có khả năng thuyết trình ấn tượng và thuyết phục người nghe.",
                "Lắng nghe tích cực và tôn trọng ý kiến của người khác."
            ]
        };
        
        const weaknessTemplates: Record<string, string[]> = {
            stress: [
                "Đôi khi còn căng thẳng khi làm việc dưới áp lực cao.",
                "Cần cải thiện khả năng xử lý tình huống khẩn cấp.",
                "Nên học cách cân bằng hơn giữa công việc và nghỉ ngơi."
            ],
            detail: [
                "Đôi khi còn thiếu sự chú ý đến chi tiết nhỏ trong công việc.",
                "Cần kiểm tra kỹ hơn trước khi hoàn thành công việc.",
                "Nên tăng cường tính cẩn thận trong xử lý dữ liệu."
            ],
            flexibility: [
                "Đôi khi còn thiếu linh hoạt khi đối mặt với thay đổi.",
                "Cần cải thiện khả năng thích nghi với quy trình mới.",
                "Nên cởi mở hơn với các phương pháp làm việc khác nhau."
            ],
            confidence: [
                "Đôi khi còn thiếu tự tin khi trình bày ý kiến.",
                "Cần mạnh dạn hơn trong việc đưa ra quyết định.",
                "Nên tin tưởng vào khả năng của bản thân hơn nữa."
            ],
            prioritization: [
                "Đôi khi còn khó khăn trong việc xác định ưu tiên công việc.",
                "Cần cải thiện khả năng phân biệt việc khẩn cấp và quan trọng.",
                "Nên học cách từ chối một cách lịch sự khi quá tải công việc."
            ]
        };

        // Tạo đánh giá cho các kế hoạch đã hoàn thành (năm trước)
        const completedPlans = savedPlans.filter(p => p.status === PlanStatus.COMPLETED);
        for (const plan of completedPlans) {
            // Lấy phòng ban từ kế hoạch
            const dept = plan.departments?.[0];
            if (!dept) continue;

            // Lấy nhân viên thuộc phòng ban
            const deptEmployees = employees.filter(e => e.departmentId === dept.id);
            const head = departmentHeads.find(h => h.departmentId === dept.id);

            if (head && deptEmployees.length > 0) {
                for (const employee of deptEmployees) {
                    // Tạo đánh giá với điểm số ngẫu nhiên
                    // Phân phối điểm theo phân phối chuẩn: 15% xuất sắc (4.5-5), 40% tốt (4-4.5), 30% khá (3.5-4), 15% trung bình (3-3.5)
                    const scoreCategory = Math.random();
                    let baseScore: number;
                    let commentCategory: string;
                    
                    if (scoreCategory < 0.15) { // Xuất sắc
                        baseScore = 4.5 + Math.random() * 0.5; // 4.5-5.0
                        commentCategory = 'excellent';
                    } else if (scoreCategory < 0.55) { // Tốt
                        baseScore = 4 + Math.random() * 0.5; // 4.0-4.5
                        commentCategory = 'good';
                    } else if (scoreCategory < 0.85) { // Khá
                        baseScore = 3.5 + Math.random() * 0.5; // 3.5-4.0
                        commentCategory = 'average';
                    } else { // Trung bình
                        baseScore = 3 + Math.random() * 0.5; // 3.0-3.5
                        commentCategory = 'needImprovement';
                    }
                    
                    // Tạo điểm số cho từng tiêu chí (dao động xung quanh baseScore)
                    const scores = plan.criteria.map(c => {
                        // Dao động +/- 0.5 điểm xung quanh baseScore, nhưng không vượt quá 5
                        const variation = Math.random() - 0.5; // -0.5 đến 0.5
                        let score = baseScore + variation;
                        score = Math.min(5, Math.max(3, score)); // Giới hạn trong khoảng 3-5
                        
                        return {
                            criteriaId: c.id,
                            score: parseFloat(score.toFixed(1)),
                            comment: commentTemplates[commentCategory as keyof typeof commentTemplates][Math.floor(Math.random() * commentTemplates[commentCategory as keyof typeof commentTemplates].length)]
                        };
                    });
                    
                    // Tính điểm tổng hợp
                    const totalScore = parseFloat((scores.reduce((sum, s) => {
                        const criteria = plan.criteria.find(c => c.id === s.criteriaId);
                        return sum + (s.score * (criteria?.weight || 0));
                    }, 0)).toFixed(2));
                    
                    // Chọn ngẫu nhiên các mẫu comment
                    const randomCommentsIndex = Math.floor(Math.random() * commentTemplates[commentCategory as keyof typeof commentTemplates].length);
                    const generalComment = commentTemplates[commentCategory as keyof typeof commentTemplates][randomCommentsIndex];
                    
                    // Chọn ngẫu nhiên điểm cần cải thiện (2 mục)
                    const improvementCategories = Object.keys(improvementTemplates);
                    const improvementCategory1 = improvementCategories[Math.floor(Math.random() * improvementCategories.length)];
                    let improvementCategory2 = improvementCategories[Math.floor(Math.random() * improvementCategories.length)];
                    while (improvementCategory2 === improvementCategory1) {
                        improvementCategory2 = improvementCategories[Math.floor(Math.random() * improvementCategories.length)];
                    }
                    const improvement1 = improvementTemplates[improvementCategory1 as keyof typeof improvementTemplates][Math.floor(Math.random() * improvementTemplates[improvementCategory1 as keyof typeof improvementTemplates].length)];
                    const improvement2 = improvementTemplates[improvementCategory2 as keyof typeof improvementTemplates][Math.floor(Math.random() * improvementTemplates[improvementCategory2 as keyof typeof improvementTemplates].length)];
                    
                    // Chọn ngẫu nhiên điểm mạnh (2 mục)
                    const strengthCategories = Object.keys(strengthTemplates);
                    const strengthCategory1 = strengthCategories[Math.floor(Math.random() * strengthCategories.length)];
                    let strengthCategory2 = strengthCategories[Math.floor(Math.random() * strengthCategories.length)];
                    while (strengthCategory2 === strengthCategory1) {
                        strengthCategory2 = strengthCategories[Math.floor(Math.random() * strengthCategories.length)];
                    }
                    const strength1 = strengthTemplates[strengthCategory1 as keyof typeof strengthTemplates][Math.floor(Math.random() * strengthTemplates[strengthCategory1 as keyof typeof strengthTemplates].length)];
                    const strength2 = strengthTemplates[strengthCategory2 as keyof typeof strengthTemplates][Math.floor(Math.random() * strengthTemplates[strengthCategory2 as keyof typeof strengthTemplates].length)];
                    
                    // Chọn ngẫu nhiên điểm yếu
                    const weaknessCategories = Object.keys(weaknessTemplates);
                    const weaknessCategory = weaknessCategories[Math.floor(Math.random() * weaknessCategories.length)];
                    const weakness = weaknessTemplates[weaknessCategory as keyof typeof weaknessTemplates][Math.floor(Math.random() * weaknessTemplates[weaknessCategory as keyof typeof weaknessTemplates].length)];

                    // Tạo đối tượng đánh giá
                    const review = {
                        plan: plan,
                        planId: plan.id,
                        employee: employee,
                        employeeId: employee.id,
                        reviewer: head,
                        reviewerId: head.id,
                        status: ReviewStatus.APPROVED,
                        scores: scores,
                        totalScore: totalScore,
                        comments: generalComment,
                        improvement: `${improvement1} ${improvement2}`,
                        strengths: `${strength1} ${strength2}`,
                        weaknesses: weakness,
                        reviewDate: new Date()
                    };
                    reviews.push(review);
                }
            }
        }

        // Save performance reviews
        if (reviews.length > 0) {
            await this.performanceReviewRepository.save(reviews);
            console.log(`${reviews.length} performance reviews seeded successfully`);
        }
    }

    static async seedPayrolls(users: User[]) {
        // Lấy danh sách nhân viên (loại trừ admin)
        const employees = users.filter(u => u.role.roleType !== RoleType.SYSTEM_ADMIN);
        if (employees.length === 0) {
            console.log("No employees found to seed payrolls for.");
            return;
        }

        const payrollData: DeepPartial<Payroll>[] = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

        // Lấy dữ liệu chấm công trong 3 tháng gần nhất để tính toán khấu trừ nghỉ phép và đi muộn
        const startDate = new Date(currentYear, currentMonth - 4, 1); // Bắt đầu từ 3 tháng trước
        const endDate = new Date(currentYear, currentMonth, 0); // Đến cuối tháng hiện tại
        
        // Lấy dữ liệu chấm công từ database
        const attendanceRecords = await this.attendanceRepository.find({
            where: {
                date: Between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
            },
            relations: ['user']
        });
        
        // Nhóm dữ liệu chấm công theo userId và tháng
        const attendanceByUserAndMonth = new Map<string, Attendance[]>();
        for (const record of attendanceRecords) {
            const date = new Date(record.date);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const key = `${record.user.id}-${year}-${month}`;
            
            if (!attendanceByUserAndMonth.has(key)) {
                attendanceByUserAndMonth.set(key, []);
            }
            
            attendanceByUserAndMonth.get(key)?.push(record);
        }

        // Tạo dữ liệu lương cho 3 tháng gần nhất
        const months = [
            { month: currentMonth, year: currentYear },
            { month: currentMonth - 1 > 0 ? currentMonth - 1 : 12, year: currentMonth - 1 > 0 ? currentYear : currentYear - 1 },
            { month: currentMonth - 2 > 0 ? currentMonth - 2 : 12 - (2 - currentMonth), year: currentMonth - 2 > 0 ? currentYear : currentYear - 1 }
        ];

        // Mảng các thành phần lương phụ cấp và phúc lợi
        const allowanceComponents = [
            { name: "Phụ cấp ăn trưa", amount: 1000000, type: ComponentType.ALLOWANCE },
            { name: "Phụ cấp đi lại", amount: 500000, type: ComponentType.ALLOWANCE },
            { name: "Phụ cấp điện thoại", amount: 300000, type: ComponentType.ALLOWANCE },
            { name: "Phụ cấp chức vụ", min: 1000000, max: 5000000, type: ComponentType.ALLOWANCE }, // Sẽ tính dựa trên level
        ];
        
        const benefitComponents = [
            { name: "Bảo hiểm sức khỏe", amount: 1500000, type: ComponentType.BENEFIT },
            { name: "Quà sinh nhật", amount: 500000, type: ComponentType.BENEFIT, oncePerYear: true },
        ];
        
        const deductionComponents = [
            { name: "BHXH", percentage: 0.08, type: ComponentType.DEDUCTION }, // 8% lương cơ bản
            { name: "BHYT", percentage: 0.015, type: ComponentType.DEDUCTION }, // 1.5% lương cơ bản
            { name: "BHTN", percentage: 0.01, type: ComponentType.DEDUCTION }, // 1% lương cơ bản
            { name: "Thuế TNCN", percentage: 0.1, type: ComponentType.DEDUCTION }, // 10% thu nhập chịu thuế
        ];
        
        // Hàm tính phụ cấp chức vụ dựa vào level
        const calculatePositionAllowance = (position: Position | undefined): number => {
            if (!position) return 0;
            
            switch (position.level) {
                case 5: // Tổng giám đốc
                    return 5000000;
                case 4: // Phó tổng giám đốc
                    return 4000000;
                case 3: // Trưởng phòng
                    return 3000000;
                case 2: // Trưởng nhóm/Chuyên viên
                    return 2000000;
                default: // Nhân viên
                    return 1000000;
            }
        };

        for (const employee of employees) {
            // Tìm vị trí của nhân viên trong database
            const employeePosition = await this.positionRepository.findOne({
                where: {
                    departmentId: employee.departmentId,
                    title: employee.description
                }
            }) || undefined; // Chuyển null thành undefined
            
            for (const { month, year } of months) {
                // Tìm dữ liệu chấm công của nhân viên trong tháng
                const key = `${employee.id}-${year}-${month}`;
                const employeeAttendance = attendanceByUserAndMonth.get(key) || [];
                
                // Tính số ngày đi muộn và vắng mặt
                const lateDays = employeeAttendance.filter(a => a.status === AttendanceStatus.LATE).length;
                const absentDays = employeeAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
                const leaveDays = employeeAttendance.filter(a => a.status === AttendanceStatus.LEAVE).length;
                
                // Tính khấu trừ nghỉ phép không phép và đi muộn
                const leaveDeduction = absentDays * (employee.baseSalary / 22); // Trừ 1 ngày lương cho mỗi ngày nghỉ không phép
                const lateDeduction = lateDays * 100000; // Trừ 100,000 VND cho mỗi ngày đi muộn
                
                // Tính tổng phụ cấp
                let totalAllowance = 0;
                const allowanceDetails: any[] = [];
                
                // Thêm các phụ cấp cố định
                for (const component of allowanceComponents) {
                    if (component.name === "Phụ cấp chức vụ") {
                        const positionAllowance = calculatePositionAllowance(employeePosition);
                        totalAllowance += positionAllowance;
                        allowanceDetails.push({
                            name: component.name,
                            amount: positionAllowance,
                            type: component.type
                        });
                    } else if (component.amount !== undefined) {
                        totalAllowance += component.amount;
                        allowanceDetails.push({
                            name: component.name,
                            amount: component.amount,
                            type: component.type
                        });
                    }
                }
                
                // Tính tổng phúc lợi
                let totalBenefit = 0;
                const benefitDetails: any[] = [];
                
                for (const component of benefitComponents) {
                    // Nếu là quà sinh nhật, chỉ tính trong tháng sinh nhật của nhân viên
                    if (component.oncePerYear && component.amount !== undefined) {
                        // Giả sử tháng sinh nhật là tháng tuyển dụng
                        const hireMonth = employee.hireDate.getMonth() + 1;
                        
                        if (hireMonth === month) {
                            totalBenefit += component.amount;
                            benefitDetails.push({
                                name: component.name,
                                amount: component.amount,
                                type: component.type
                            });
                        }
                    } else if (component.amount !== undefined) {
                        totalBenefit += component.amount;
                        benefitDetails.push({
                            name: component.name,
                            amount: component.amount,
                            type: component.type
                        });
                    }
                }
                
                // Tính tổng khấu trừ (BHXH, BHYT, BHTN)
                let mandatoryDeduction = 0;
                const deductionDetails: any[] = [];
                
                for (const component of deductionComponents.filter(c => c.name !== "Thuế TNCN")) {
                    const amount = employee.baseSalary * component.percentage;
                    mandatoryDeduction += amount;
                    deductionDetails.push({
                        name: component.name,
                        amount: amount,
                        type: component.type,
                        percentage: component.percentage
                    });
                }
                
                // Tính tiền thưởng (bonus)
                const bonus = month !== currentMonth ? Math.floor(Math.random() * 3) * 1000000 : 0; // 0-2 triệu
                
                // Tính thu nhập trước thuế
                const incomeBeforeTax = employee.baseSalary + totalAllowance + totalBenefit - mandatoryDeduction - leaveDeduction - lateDeduction + bonus;
                
                // Tính thuế TNCN (10% thu nhập trước thuế)
                const taxComponent = deductionComponents.find(c => c.name === "Thuế TNCN");
                const tax = incomeBeforeTax * (taxComponent?.percentage || 0.1);
                deductionDetails.push({
                    name: "Thuế TNCN",
                    amount: tax,
                    type: ComponentType.DEDUCTION,
                    percentage: taxComponent?.percentage || 0.1
                });
                
                // Tính lương thực nhận
                const netSalary = incomeBeforeTax - tax;
                
                // Tạo ghi chú
                const payrollNote = `Lương tháng ${month}/${year} - ${employee.fullName}`;
                
                // Thiết lập ngày thanh toán (null nếu chưa thanh toán)
                const paymentDate = month !== currentMonth ? 
                    new Date(year, month, 10) : // Ngày 10 của tháng sau
                    undefined; // Dùng undefined thay vì null để phù hợp với DeepPartial
                
                payrollData.push({
                    user: employee,
                    userId: employee.id,
                    month: month,
                    year: year,
                    baseSalary: employee.baseSalary,
                    totalAllowance: totalAllowance,
                    totalDeduction: mandatoryDeduction + leaveDeduction + lateDeduction + tax,
                    totalBenefit: totalBenefit,
                    leaveDeductionAmount: leaveDeduction,
                    latePenaltyAmount: lateDeduction,
                    bonus: bonus,
                    tax: tax,
                    netSalary: netSalary,
                    paymentDate: paymentDate,
                    note: payrollNote,
                    isFinalized: month !== currentMonth, // Chỉ tháng hiện tại là chưa finalize
                } as DeepPartial<Payroll>);
            }
        }

        if (payrollData.length > 0) {
            // Lưu dữ liệu theo lô để tránh lỗi khi lượng dữ liệu lớn
            const batchSize = 50;
            for (let i = 0; i < payrollData.length; i += batchSize) {
                const batch = payrollData.slice(i, i + batchSize);
                await this.payrollRepository.save(batch);
                console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} payrolls saved`);
            }
            console.log(`Total: ${payrollData.length} payrolls seeded successfully`);
        }
    }
}