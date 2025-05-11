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
import { PerformancePlan, PlanStatus } from '../entities/performance/PerformancePlan';
import { PerformanceReview, ReviewStatus } from '../entities/performance/PerformanceReview';
import bcrypt from 'bcrypt';
import { FindOneOptions, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

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
        // Seed Departments
        const departmentData = [
            { name: 'Phòng Nhân sự', description: 'Quản lý các vấn đề về nhân sự' },
            { name: 'Phòng Kinh doanh – Marketing', description: 'Phát triển kinh doanh và tiếp thị' },
            { name: 'Phòng Kỹ thuật', description: 'Phát triển và bảo trì kỹ thuật' },
            { name: 'Phòng Tài chính - Kế toán', description: 'Quản lý tài chính và kế toán' },
            { name: 'Phòng Hành chính', description: 'Hỗ trợ hoạt động hành chính' },
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


        // Seed Positions
        // Map department names to department entities for easier lookup
        const deptMap = new Map(allDepartments.map(d => [d.name, d]));

        const positionData = [
            // HR
            { title: 'Trưởng phòng Nhân sự', level: 3, department: deptMap.get('Phòng Nhân sự') },
            { title: 'Chuyên viên Nhân sự', level: 1, department: deptMap.get('Phòng Nhân sự') },
            // Sales & Marketing
            { title: 'Trưởng phòng Kinh doanh', level: 3, department: deptMap.get('Phòng Kinh doanh – Marketing') },
            { title: 'Trưởng phòng Marketing', level: 3, department: deptMap.get('Phòng Kinh doanh – Marketing') },
            { title: 'Nhân viên Kinh doanh', level: 1, department: deptMap.get('Phòng Kinh doanh – Marketing') },
            { title: 'Chuyên viên Marketing', level: 1, department: deptMap.get('Phòng Kinh doanh – Marketing') },
            // Tech
            { title: 'Trưởng nhóm Kỹ thuật', level: 2, department: deptMap.get('Phòng Kỹ thuật') }, // Level 2 for Lead
            { title: 'Lập trình viên', level: 1, department: deptMap.get('Phòng Kỹ thuật') },
            { title: 'Kiểm thử viên', level: 1, department: deptMap.get('Phòng Kỹ thuật') },
            // Finance & Accounting
            { title: 'Trưởng phòng Tài chính', level: 3, department: deptMap.get('Phòng Tài chính - Kế toán') },
            { title: 'Kế toán viên', level: 1, department: deptMap.get('Phòng Tài chính - Kế toán') },
            // Admin
            { title: 'Trưởng phòng Hành chính', level: 3, department: deptMap.get('Phòng Hành chính') },
            { title: 'Nhân viên Hành chính', level: 1, department: deptMap.get('Phòng Hành chính') },
        ].filter(p => p.department); // Filter out positions if department wasn't found


        // Check existing positions based on title and departmentId
        const existingPositions = await this.positionRepository.find({ relations: ['department'] }); // Load department relation if needed later
        const existingPositionKeys = new Set(existingPositions.map(p => `${p.title}-${p.departmentId}`)); // Create unique key

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
            // This helps ensure listeners like @BeforeInsert are triggered correctly
            const positionEntitiesToSave = newPositions.map(pData => {
                // Pass the data including the department object to create
                // The 'departmentId' property from pData is ignored by create if 'department' object exists
                return this.positionRepository.create(pData);
            });

            // Save the array of created entities
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

        const hrDept = departments.find(d => d.name === 'Phòng Nhân sự');
        const salesDept = departments.find(d => d.name === 'Phòng Kinh doanh – Marketing');
        const techDept = departments.find(d => d.name === 'Phòng Kỹ thuật');
        const financeDept = departments.find(d => d.name === 'Phòng Tài chính - Kế toán');
        const adminDept = departments.find(d => d.name === 'Phòng Hành chính');

        // Find positions by title and departmentId (more robust)
        const findPosition = (title: string, dept: Department | undefined) =>
            dept ? positions.find(p => p.title === title && p.departmentId === dept.id) : undefined;

        const hrMgrPos = findPosition('Trưởng phòng Nhân sự', hrDept);
        const hrSpecPos = findPosition('Chuyên viên Nhân sự', hrDept);
        const salesMgrPos = findPosition('Trưởng phòng Kinh doanh', salesDept);
        // Assuming MKT_MGR is not used directly for users, or find it similarly if needed
        const salesRepPos = findPosition('Nhân viên Kinh doanh', salesDept);
        const techLeadPos = findPosition('Trưởng nhóm Kỹ thuật', techDept);
        const devPos = findPosition('Lập trình viên', techDept);
        const finMgrPos = findPosition('Trưởng phòng Tài chính', financeDept);
        const accPos = findPosition('Kế toán viên', financeDept);
        const adminMgrPos = findPosition('Trưởng phòng Hành chính', adminDept);
        const adminStaffPos = findPosition('Nhân viên Hành chính', adminDept);


        const hrRole = roles.find(r => r.roleType === RoleType.HR_STAFF);
        const headRole = roles.find(r => r.roleType === RoleType.DEPARTMENT_HEAD);
        const employeeRole = roles.find(r => r.roleType === RoleType.EMPLOYEE);

        if (!hrDept || !salesDept || !techDept || !financeDept || !adminDept ||
            !hrMgrPos || !hrSpecPos || !salesMgrPos || !salesRepPos || !techLeadPos || !devPos ||
            !finMgrPos || !accPos || !adminMgrPos || !adminStaffPos ||
            !hrRole || !headRole || !employeeRole) {
            console.error("Essential department, position, or role not found for seeding users.");
            return [];
        }

        // Department Heads
        usersData.push(
            { username: 'hrhead', email: 'hr.head@company.com', fullName: 'Trần Thị Mai', role: headRole, department: hrDept, position: hrMgrPos, baseSalary: 70000 },
            { username: 'saleshead', email: 'sales.head@company.com', fullName: 'Nguyễn Văn Hùng', role: headRole, department: salesDept, position: salesMgrPos, baseSalary: 75000 },
            { username: 'techhead', email: 'tech.head@company.com', fullName: 'Lê Minh Tuấn', role: headRole, department: techDept, position: techLeadPos, baseSalary: 80000 }, // Tech Lead as Head for simplicity
            { username: 'financehead', email: 'finance.head@company.com', fullName: 'Phạm Thị Bích', role: headRole, department: financeDept, position: finMgrPos, baseSalary: 72000 },
            { username: 'adminhead', email: 'admin.head@company.com', fullName: 'Hoàng Văn Nam', role: headRole, department: adminDept, position: adminMgrPos, baseSalary: 68000 }
        );

        // HR Staff
        usersData.push(
            { username: 'hrstaff1', email: 'hr.staff1@company.com', fullName: 'Vũ Thị Lan', role: hrRole, department: hrDept, position: hrSpecPos, baseSalary: 50000 },
             { username: 'hrstaff2', email: 'hr.staff2@company.com', fullName: 'Đặng Văn An', role: hrRole, department: hrDept, position: hrSpecPos, baseSalary: 52000 }
        );

        // Employees
        usersData.push(
            // Sales
            { username: 'sales1', email: 'sales1@company.com', fullName: 'Bùi Thị Hoa', role: employeeRole, department: salesDept, position: salesRepPos, baseSalary: 45000 },
            { username: 'sales2', email: 'sales2@company.com', fullName: 'Đỗ Văn Bình', role: employeeRole, department: salesDept, position: salesRepPos, baseSalary: 46000 },
            // Tech
            { username: 'dev1', email: 'dev1@company.com', fullName: 'Ngô Thị Thu', role: employeeRole, department: techDept, position: devPos, baseSalary: 60000 },
            { username: 'dev2', email: 'dev2@company.com', fullName: 'Trịnh Văn Minh', role: employeeRole, department: techDept, position: devPos, baseSalary: 62000 },
            // Finance
            { username: 'acc1', email: 'acc1@company.com', fullName: 'Mai Thị Quỳnh', role: employeeRole, department: financeDept, position: accPos, baseSalary: 55000 },
            // Admin
            { username: 'adminstaff1', email: 'admin.staff1@company.com', fullName: 'Lý Văn Dũng', role: employeeRole, department: adminDept, position: adminStaffPos, baseSalary: 48000 }
        );

        for (const userData of usersData) {
             const existingUser = await this.findOneUser({ where: [{ username: userData.username }, {email: userData.email}] });
             if (!existingUser) {
                 const passwordHash = await this.hashPassword('password123'); // Default password for seeded users
                 const userToCreate = this.userRepository.create({
                     ...userData,
                     passwordHash: passwordHash,
                     isActive: true,
                     hireDate: new Date(new Date().setFullYear(new Date().getFullYear() - Math.floor(Math.random() * 3))), // Random hire date in last 3 years
                     remainingLeaves: 12, // Default leaves
                     roleId: userData.role?.id, // Ensure IDs are set if objects are used
                     departmentId: userData.department?.id,
                     positionId: userData.position?.id
                 });
                 try {
                    const savedUser = await this.userRepository.save(userToCreate);
                    createdUsers.push(savedUser);
                    console.log(`User ${savedUser.username} created.`);
                 } catch (error: any) {
                     console.error(`Failed to save user ${userData.username}: ${error.message}`);
                     // Optionally skip or handle specific errors (e.g., unique constraint)
                 }

             } else {
                 console.log(`User ${userData.username} or email ${userData.email} already exists, skipping.`);
                 // Add existing user to list if needed for subsequent seeding steps
                 createdUsers.push(existingUser);
             }
        }

        console.log(`${createdUsers.length} users processed (created or already existing).`);
        return createdUsers; // Return users (newly created or existing ones found)
    }

    static async seedLeaves(users: User[]) {
        const employees = users.filter(u => u.role.roleType === RoleType.EMPLOYEE);
        if (employees.length === 0) {
            console.log("No employees found to seed leaves for.");
            return;
        }

        const leaveData: DeepPartial<Leave>[] = [];
        const currentYear = new Date().getFullYear();

        // Seed some leaves for the first few employees
        for (let i = 0; i < Math.min(employees.length, 3); i++) {
            const startDate1 = new Date(currentYear, 2, 10);
            const endDate1 = new Date(currentYear, 2, 11);
            const days1 = Math.ceil((endDate1.getTime() - startDate1.getTime()) / (1000 * 3600 * 24)) + 1; // Calculate days

            const startDate2 = new Date(currentYear, 5, 15);
            const endDate2 = new Date(currentYear, 5, 18);
            const days2 = Math.ceil((endDate2.getTime() - startDate2.getTime()) / (1000 * 3600 * 24)) + 1; // Calculate days

            leaveData.push(
                { user: employees[i], userId: employees[i].id, startDate: startDate1, endDate: endDate1, reason: 'Nghỉ ốm', status: LeaveStatus.APPROVED, type: LeaveType.SICK, numberOfDays: days1 },
                { user: employees[i], userId: employees[i].id, startDate: startDate2, endDate: endDate2, reason: 'Nghỉ phép năm', status: LeaveStatus.PENDING, type: LeaveType.ANNUAL, numberOfDays: days2 }
            );
        }

        if (leaveData.length > 0) {
            await this.leaveRepository.save(leaveData);
            console.log('Leaves seeded successfully');
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
        const employees = users.filter(u => u.role.roleType === RoleType.EMPLOYEE);
        if (employees.length === 0) {
            console.log("No employees found to seed attendances for.");
            return;
        }

        const attendanceData: DeepPartial<Attendance>[] = [];
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const dayBeforeYesterday = new Date(today);
        dayBeforeYesterday.setDate(today.getDate() - 2);

        const formatDate = (date: Date): string => date.toISOString().split('T')[0];

        // Seed some attendances for the first few employees
        for (let i = 0; i < Math.min(employees.length, 2); i++) {
            const user = employees[i];

            // Day before yesterday: Present, full day
            attendanceData.push({
                user: user, // Use user object directly
                date: formatDate(dayBeforeYesterday),
                checkInTime: '08:01:15', checkOutTime: '17:05:30',
                status: AttendanceStatus.PRESENT, workHours: 8.07 // Example calculation
            });

            // Yesterday: Late check-in
            attendanceData.push({
                user: user, // Use user object directly
                date: formatDate(yesterday),
                checkInTime: '08:45:05', checkOutTime: '17:30:10',
                status: AttendanceStatus.LATE, workHours: 7.75 // Example calculation
            });

             // Today: Checked in, not checked out yet
             attendanceData.push({
                user: user, // Use user object directly
                date: formatDate(today),
                checkInTime: '07:58:00', checkOutTime: null,
                status: AttendanceStatus.PRESENT, workHours: null
            });
        }

         // Seed leave for another employee yesterday
         if (employees.length >= 3) {
             const userOnLeave = employees[2];
             // Find a leave record for this user yesterday if it exists from seedLeaves
             const existingLeave = await this.leaveRepository.findOne({
                 where: { user: { id: userOnLeave.id }, startDate: LessThanOrEqual(yesterday), endDate: MoreThanOrEqual(yesterday), status: LeaveStatus.APPROVED } // Use Date object directly with operators
             });

             attendanceData.push({
                 user: userOnLeave, // Use user object directly
                 date: formatDate(yesterday),
                 checkInTime: null, checkOutTime: null,
                 status: AttendanceStatus.LEAVE, workHours: 0,
                 leaveRequest: existingLeave ? existingLeave : undefined, // Link if found
                 notes: existingLeave ? `Nghỉ phép - Đơn: ${existingLeave.id}` : 'Nghỉ phép (auto-seed)'
             });
         }


        if (attendanceData.length > 0) {
             // Check existing records for the same user and date to avoid duplicates
             const existingChecks = attendanceData.map(ad => ({ userId: ad.user?.id, date: ad.date })); // Access user.id safely
             const existingRecords = await this.attendanceRepository.find({
                 where: existingChecks
                            .filter(ec => ec.userId) // Ensure userId exists
                            .map(ec => ({ user: { id: ec.userId }, date: ec.date }))
             });
             const existingKeys = new Set(existingRecords.map(ar => `${ar.user?.id}-${ar.date}`)); // Access user.id safely

             const newAttendanceData = attendanceData.filter(ad => ad.user?.id && !existingKeys.has(`${ad.user.id}-${ad.date}`)); // Access user.id safely


            if (newAttendanceData.length > 0) {
                await this.attendanceRepository.save(newAttendanceData);
                console.log(`${newAttendanceData.length} attendance records seeded successfully`);
            } else {
                 console.log('All seeded attendance records already exist or conflict.');
           }
       }
   }

    static async seedPerformance(users: User[], departments: Department[]) {
        // Filter department heads and employees
        const departmentHeads = users.filter(u => u.role.roleType === RoleType.DEPARTMENT_HEAD);
        const employees = users.filter(u => u.role.roleType === RoleType.EMPLOYEE);

        if (departmentHeads.length === 0 || employees.length === 0) {
            console.log("No department heads or employees found to seed performance data for.");
            return;
        }

        const plans: DeepPartial<PerformancePlan>[] = [];
        const currentYear = new Date().getFullYear();

        // Create performance plans for each department
        for (const head of departmentHeads) {
            const dept = departments.find(d => d.id === head.departmentId);
            if (dept) {
                const plan = {
                    title: `Đánh giá hiệu suất ${dept.name} ${currentYear}`,
                    description: `Kế hoạch đánh giá hiệu suất nhân viên ${dept.name} năm ${currentYear}`,
                    startDate: new Date(currentYear, 0, 1), // Jan 1st
                    endDate: new Date(currentYear, 11, 31), // Dec 31st
                    department: dept,
                    departmentId: dept.id,
                    createdBy: head.id,
                    creator: head,
                    status: PlanStatus.ACTIVE,
                    criteria: [
                        {
                            id: 1,
                            name: "Chất lượng công việc",
                            weight: 0.3,
                            description: "Đánh giá chất lượng và độ chính xác của công việc"
                        },
                        {
                            id: 2,
                            name: "Hiệu suất làm việc",
                            weight: 0.3,
                            description: "Đánh giá số lượng công việc hoàn thành và thời gian"
                        },
                        {
                            id: 3,
                            name: "Tinh thần làm việc",
                            weight: 0.2,
                            description: "Đánh giá thái độ và tinh thần làm việc"
                        },
                        {
                            id: 4,
                            name: "Kỹ năng mềm",
                            weight: 0.2,
                            description: "Đánh giá khả năng giao tiếp và làm việc nhóm"
                        }
                    ]
                };
                plans.push(plan);
            }
        }

        // Save performance plans
        const savedPlans = await this.performancePlanRepository.save(plans);
        console.log(`${savedPlans.length} performance plans seeded successfully`);

        // Create performance reviews
        const reviews: DeepPartial<PerformanceReview>[] = [];

        for (const plan of savedPlans) {
            // Get employees of this department
            const deptEmployees = employees.filter(e => e.departmentId === plan.departmentId);
            const head = departmentHeads.find(h => h.departmentId === plan.departmentId);

            if (head && deptEmployees.length > 0) {
                for (const employee of deptEmployees) {
                    const scores = plan.criteria.map(c => ({
                        criteriaId: c.id,
                        score: parseFloat((Math.random() * (5 - 3) + 3).toFixed(1)), // Random score between 3-5
                        comment: "Hoàn thành tốt nhiệm vụ được giao"
                    }));

                    const totalScore = parseFloat((scores.reduce((sum, s) => {
                        const criteria = plan.criteria.find(c => c.id === s.criteriaId);
                        return sum + (s.score * (criteria?.weight || 0));
                    }, 0)).toFixed(2));

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
                        comments: "Nhân viên có tinh thần làm việc tốt, hoàn thành công việc đúng tiến độ",
                        improvement: "Cần cải thiện kỹ năng quản lý thời gian",
                        strengths: "Có tinh thần trách nhiệm cao, kỹ năng chuyên môn tốt",
                        weaknesses: "Đôi khi chưa linh hoạt trong xử lý tình huống",
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
        // Get repository for Payroll
        const payrollRepository = this.payrollRepository;

        const employees = users.filter(u => u.role.roleType === RoleType.EMPLOYEE);
        if (employees.length === 0) {
            console.log("No employees found to seed payrolls for.");
            return;
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

        const payrollData: DeepPartial<Payroll>[] = [];

        // Create payrolls for the last 3 months
        for (const employee of employees) {
            // Tạo các giá trị cơ bản cho mỗi nhân viên
            const baseSalary = employee.baseSalary;
            const totalAllowance = 1500000;  // Tổng phụ cấp (phụ cấp ăn trưa + đi lại)
            const totalBenefit = 2000000;    // Phúc lợi (bảo hiểm sức khỏe)
            const totalDeduction = baseSalary * 0.095;  // Khấu trừ (BHXH 8% + BHYT 1.5%)

            // Generate payroll for last 3 months
            const months = [
                { month: 5, year: currentYear }, // Tháng 5
                { month: 4, year: currentYear }, // Tháng 4
                { month: 3, year: currentYear }  // Tháng 3
            ];

            for (const { month, year } of months) {
                // Nếu là tháng 5 thì tạo nhiều bản ghi hơn
                const recordCount = month === 5 ? 10 : 1;
                
                for (let i = 0; i < recordCount; i++) {
                    // Thêm biến động cho mỗi bản ghi
                    const variation = month === 5 ? (Math.random() * 1000000 - 500000) : 0;
                    const adjustedAllowance = totalAllowance + variation;
                    
                    // Tính toán các giá trị khấu trừ
                    const leaveDeductionAmount = Math.floor(Math.random() * 3) * 0.03 * baseSalary; // 0-2 ngày nghỉ
                    const latePenaltyAmount = Math.floor(Math.random() * 3) * 100000; // 0-2 lần đi muộn
                    
                    // Tính tiền thưởng (bonus)
                    const bonus = month === currentMonth ? 0 : Math.floor(Math.random() * 5) * 500000; // 0-2.5 triệu
                    
                    // Tính thu nhập trước thuế
                    const incomeBeforeTax = baseSalary + adjustedAllowance + totalBenefit - totalDeduction - leaveDeductionAmount - latePenaltyAmount + bonus;
                    
                    // Tính thuế (10% thu nhập trước thuế)
                    const tax = incomeBeforeTax * 0.1;
                    
                    // Tính lương thực nhận
                    const netSalary = incomeBeforeTax - tax;

                    // Tạo ghi chú
                    const payrollNote = recordCount === 1
                        ? `Lương tháng ${month}/${year} - ${employee.fullName}`
                        : `Lương tháng ${month}/${year} - Đợt ${i + 1} - ${employee.fullName}`;

                    // Thiết lập ngày thanh toán (null nếu chưa thanh toán)
                    const paymentDate = month !== currentMonth ? 
                        new Date(year, month, 10) : // Ngày 10 của tháng sau
                        undefined; // Dùng undefined thay vì null để phù hợp với DeepPartial

                    payrollData.push({
                        user: employee,
                        userId: employee.id,
                        month: month,
                        year: year,
                        baseSalary: baseSalary,
                        totalAllowance: adjustedAllowance,
                        totalDeduction: totalDeduction + leaveDeductionAmount + latePenaltyAmount,
                        totalBenefit: totalBenefit,
                        leaveDeductionAmount: leaveDeductionAmount,
                        latePenaltyAmount: latePenaltyAmount,
                        bonus: bonus,
                        tax: tax,
                        netSalary: netSalary,
                        paymentDate: paymentDate,
                        note: payrollNote,
                        isFinalized: month !== currentMonth // Chỉ tháng hiện tại là chưa finalize
                    });
                }
            }
        }

        if (payrollData.length > 0) {
            await payrollRepository.save(payrollData);
            console.log(`${payrollData.length} payrolls seeded successfully`);
        }
    }
}