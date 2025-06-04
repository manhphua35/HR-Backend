import { DeepPartial } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Role, RoleType } from "../entities/auth/Role";
import { User } from "../entities/core/User";
import { Department } from "../entities/core/Department";

import { DepartmentReport } from "../entities/report/DepartmentReport";
import {
  Attendance,
  AttendanceStatus,
} from "../entities/attendance/Attendance";
import { Payroll } from "../entities/payroll/Payroll";

import bcrypt from "bcrypt";
import { FindOneOptions, LessThanOrEqual, MoreThanOrEqual } from "typeorm";

export class SeedService {
  private static userRepository = AppDataSource.getRepository(User);
  private static roleRepository = AppDataSource.getRepository(Role);
  private static departmentRepository = AppDataSource.getRepository(Department);

  private static reportRepository =
    AppDataSource.getRepository(DepartmentReport);
  private static attendanceRepository = AppDataSource.getRepository(Attendance);
  private static payrollRepository = AppDataSource.getRepository(Payroll);

  // Helper to hash password
  private static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Helper to find or return null
  private static async findOneUser(
    options: FindOneOptions<User>
  ): Promise<User | null> {
    try {
      return await this.userRepository.findOne(options);
    } catch (error) {
      console.warn(
        `Warning finding user with options ${JSON.stringify(options)}:`,
        error
      );
      return null;
    }
  }
  static async seedAll() {
    try {
      console.log("Bắt đầu quá trình tạo dữ liệu mẫu...");

      // 1. Seed Roles (without permissions system)
      const roles = await this.seedRoles();
      if (!roles || roles.length === 0) {
        throw new Error("Không thể tạo roles. Dừng quá trình.");
      }
      const adminRole = roles.find((r) => r.roleType === RoleType.SYSTEM_ADMIN);
      const hrRole = roles.find((r) => r.roleType === RoleType.HR_STAFF);
      const headRole = roles.find(
        (r) => r.roleType === RoleType.DEPARTMENT_HEAD
      );
      const employeeRole = roles.find((r) => r.roleType === RoleType.EMPLOYEE);

      if (!adminRole || !hrRole || !headRole || !employeeRole) {
        throw new Error(
          "Không tìm thấy một hoặc nhiều role cần thiết sau khi tạo."
        );
      }

      // 2. Seed Departments
      const departments = await this.seedDepartments();
      if (!departments || departments.length === 0) {
        throw new Error("Không thể tạo departments. Dừng quá trình.");
      }

      // 2.1. Create System Admin and assign to Ban Giám đốc
      const boardDept = departments.find((d) => d.name === "Ban Giám đốc");
      await this.seedDefaultAdmin(adminRole, boardDept);

      // 3. Seed Users (Department Heads, HR Staff, Employees)
      const users = await this.seedUsers(roles, departments);
      if (!users || users.length === 0) {
        console.warn(
          "Không có người dùng nào được tạo thêm (Admin có thể đã tồn tại)."
        );
        // Continue if admin exists, otherwise throw error might be better depending on desired behavior
      }

      // 4. Seed Reports
      await this.seedReports(users, departments);

      // 5. Seed Attendances
      await this.seedAttendances(users);

      // 6. Seed Payrolls
      await this.seedPayrolls(users);

      console.log("Hoàn thành quá trình tạo dữ liệu mẫu thành công.");
    } catch (error) {
      console.error("Lỗi trong quá trình tạo dữ liệu mẫu:", error);
      throw error; // Re-throw to be caught by resetAndSeedDatabase.ts
    }
  }
  static async seedRoles(): Promise<Role[]> {
    // Create basic roles without permissions system
    const roles = [
      {
        name: "System Administrator",
        roleType: RoleType.SYSTEM_ADMIN,
        description: "Full system access",
      },
      {
        name: "HR Staff",
        roleType: RoleType.HR_STAFF,
        description: "HR department staff",
      },
      {
        name: "Department Head",
        roleType: RoleType.DEPARTMENT_HEAD,
        description: "Department manager",
      },
      {
        name: "Employee",
        roleType: RoleType.EMPLOYEE,
        description: "Regular employee",
      },
    ];

    // Check existing roles
    const existingRoles = await this.roleRepository.find();
    const existingRoleTypes = new Set(existingRoles.map((r) => r.roleType));
    const newRolesData = roles.filter(
      (r) => !existingRoleTypes.has(r.roleType)
    );

    let allRoles: Role[] = [...existingRoles];
    if (newRolesData.length > 0) {
      const newlySavedRoles = await this.roleRepository.save(newRolesData);
      allRoles = [...existingRoles, ...newlySavedRoles];
      console.log(`${newlySavedRoles.length} new roles seeded successfully`);
    } else {
      console.log("All roles already exist");
    } // Create default admin user
    const adminRole = allRoles.find(
      (r: Role) => r.roleType === RoleType.SYSTEM_ADMIN
    );
    if (adminRole) {
      // Note: Admin will be created later in seedAll() when departments are available
      console.log(
        "Admin role created, will create admin user after departments are seeded"
      );
    } else {
      console.error("Admin role not found after seeding roles!");
    }

    return allRoles;
  }
  static async seedDefaultAdmin(adminRole: Role, boardDept?: Department) {
    // const userRepository = AppDataSource.getRepository(User); // Use class property

    // Check if admin already exists
    const existingAdmin = await this.findOneUser({
      where: { username: "admin" },
    });

    if (!existingAdmin) {
      const passwordHash = await this.hashPassword("admin123");

      const adminUser = this.userRepository.create({
        username: "admin",
        passwordHash: passwordHash,
        email: "admin@company.com",
        fullName: "System Administrator",
        role: adminRole, // Use the passed Role entity
        roleId: adminRole.id, // Ensure roleId is set if needed
        department: boardDept, // Assign to Ban Giám đốc
        departmentId: boardDept?.id, // Set departmentId if department exists
        isActive: true,
        hireDate: new Date(),
        baseSalary: 90000000, // 90 triệu VNĐ
        description: "Quản trị viên hệ thống", // Add description
        address: "50 Nguyễn Du, Quận 1, TP.HCM", // Add address in HCMC
      });

      await this.userRepository.save(adminUser);
      console.log("Default admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  }
  static async seedDepartments(): Promise<Department[]> {
    // Seed Departments - Cấu trúc phòng ban của một công ty Việt Nam thực tế
    const departmentData = [
      { name: "Ban Giám đốc", description: "Ban lãnh đạo điều hành công ty" },
      {
        name: "Phòng Nhân sự",
        description: "Quản lý các vấn đề về nhân sự và tuyển dụng",
      },
      {
        name: "Phòng Kinh doanh - Marketing",
        description: "Phát triển kinh doanh, bán hàng và marketing",
      },
      {
        name: "Phòng Kỹ thuật",
        description: "Phát triển, vận hành và bảo trì hệ thống kỹ thuật",
      },
      {
        name: "Phòng Tài chính - Kế toán",
        description: "Quản lý tài chính, kế toán và thanh toán",
      },
      {
        name: "Phòng Hành chính",
        description: "Quản lý công tác hành chính, văn phòng và tổng vụ",
      },
    ];

    // Check existing departments
    const existingDepartments = await this.departmentRepository.find();
    const existingDepartmentNames = new Set(
      existingDepartments.map((d) => d.name)
    );
    const newDepartments = departmentData.filter(
      (d) => !existingDepartmentNames.has(d.name)
    );

    let allDepartments: Department[] = [...existingDepartments];
    if (newDepartments.length > 0) {
      const newlySavedDepts = await this.departmentRepository.save(
        newDepartments
      );
      allDepartments = [...existingDepartments, ...newlySavedDepts];
      console.log(
        `${newlySavedDepts.length} new departments seeded successfully`
      );
    } else {
      console.log("All departments already exist");
    }

    return allDepartments;
  }
  static async seedUsers(
    roles: Role[],
    departments: Department[]
  ): Promise<User[]> {
    const usersData: DeepPartial<User>[] = [];
    const createdUsers: User[] = [];

    // Tìm các role
    const adminRole = roles.find((r) => r.roleType === RoleType.SYSTEM_ADMIN);
    const hrRole = roles.find((r) => r.roleType === RoleType.HR_STAFF);
    const headRole = roles.find((r) => r.roleType === RoleType.DEPARTMENT_HEAD);
    const employeeRole = roles.find((r) => r.roleType === RoleType.EMPLOYEE);

    if (!adminRole || !hrRole || !headRole || !employeeRole) {
      console.error("Essential role not found for seeding users.");
      return [];
    } // Tìm các phòng ban
    const boardDept = departments.find((d) => d.name === "Ban Giám đốc");
    const hrDept = departments.find((d) => d.name === "Phòng Nhân sự");
    const salesMarketingDept = departments.find(
      (d) => d.name === "Phòng Kinh doanh - Marketing"
    );
    const techDept = departments.find((d) => d.name === "Phòng Kỹ thuật");
    const financeDept = departments.find(
      (d) => d.name === "Phòng Tài chính - Kế toán"
    );
    const adminDept = departments.find((d) => d.name === "Phòng Hành chính"); // Danh sách người dùng với thông tin địa chỉ
    const userData = [
      // Ban Giám đốc
      {
        username: "tonggiandoc",
        email: "tgd@company.com",
        fullName: "Nguyễn Minh Quân",
        role: headRole,
        department: boardDept,
        description: "Tổng Giám đốc",
        baseSalary: 30000000,
        hireDate: new Date(2015, 0, 15),
        address: "123 Nguyễn Du, Quận 1, TP.HCM",
      },
      {
        username: "photgd",
        email: "photgd@company.com",
        fullName: "Trần Thị Hương",
        role: hrRole,
        department: boardDept,
        description: "Phó Tổng Giám đốc",
        baseSalary: 25000000,
        hireDate: new Date(2016, 3, 10),
        address: "456 Lê Lợi, Quận 3, TP.HCM",
      },
      {
        username: "trolygiandoc",
        email: "trolygiandoc@company.com",
        fullName: "Lê Thị Ngọc Ánh",
        role: employeeRole,
        department: boardDept,
        description: "Trợ lý Giám đốc",
        baseSalary: 15000000,
        hireDate: new Date(2018, 6, 5),
        address: "789 Hai Bà Trưng, Quận 3, TP.HCM",
      },

      // Phòng Nhân sự
      {
        username: "hrmanager",
        email: "hrmanager@company.com",
        fullName: "Phạm Văn Lộc",
        role: headRole,
        department: hrDept,
        description: "Trưởng phòng Nhân sự",
        baseSalary: 18000000,
        hireDate: new Date(2017, 2, 15),
        address: "234 Võ Văn Tần, Quận 3, TP.HCM",
      },
      {
        username: "hr_recruitment",
        email: "recruitment@company.com",
        fullName: "Hoàng Thị Minh Tâm",
        role: hrRole,
        department: hrDept,
        description: "Chuyên viên Tuyển dụng",
        baseSalary: 12000000,
        hireDate: new Date(2019, 4, 20),
        address: "567 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
      },
      {
        username: "hr_training",
        email: "training@company.com",
        fullName: "Đỗ Văn Nam",
        role: hrRole,
        department: hrDept,
        description: "Chuyên viên Đào tạo và Phát triển",
        baseSalary: 13000000,
        hireDate: new Date(2019, 7, 10),
        address: "890 Cách Mạng Tháng 8, Quận Tân Bình, TP.HCM",
      },
      {
        username: "hr_policy",
        email: "hrpolicy@company.com",
        fullName: "Vũ Thị Thảo",
        role: hrRole,
        department: hrDept,
        description: "Chuyên viên Chính sách Nhân sự",
        baseSalary: 12000000,
        hireDate: new Date(2020, 1, 3),
        address: "345 Lý Thường Kiệt, Quận 10, TP.HCM",
      },
      {
        username: "hr_staff1",
        email: "hrstaff1@company.com",
        fullName: "Nguyễn Thị Lan",
        role: employeeRole,
        department: hrDept,
        description: "Nhân viên Nhân sự",
        baseSalary: 8000000,
        hireDate: new Date(2021, 8, 15),
        address: "678 Nguyễn Văn Cừ, Quận 5, TP.HCM",
      },

      // Phòng Kinh doanh - Marketing
      {
        username: "salesdirector",
        email: "salesdirector@company.com",
        fullName: "Vũ Đình Hùng",
        role: headRole,
        department: salesMarketingDept,
        description: "Trưởng phòng Kinh doanh - Marketing",
        baseSalary: 20000000,
        hireDate: new Date(2017, 1, 10),
        address: "12 Pasteur, Quận 1, TP.HCM",
      },
      {
        username: "salesleader",
        email: "salesleader@company.com",
        fullName: "Nguyễn Thị Thúy",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Trưởng nhóm Kinh doanh",
        baseSalary: 15000000,
        hireDate: new Date(2018, 5, 15),
        address: "34 Đồng Khởi, Quận 1, TP.HCM",
      },
      {
        username: "sales_specialist1",
        email: "salesspec1@company.com",
        fullName: "Trần Văn Long",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Chuyên viên Kinh doanh",
        baseSalary: 12000000,
        hireDate: new Date(2019, 7, 20),
        address: "56 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
      },
      {
        username: "sales_specialist2",
        email: "salesspec2@company.com",
        fullName: "Phạm Thị Ngọc",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Chuyên viên Kinh doanh",
        baseSalary: 12000000,
        hireDate: new Date(2020, 2, 5),
        address: "78 Võ Thị Sáu, Quận 3, TP.HCM",
      },
      {
        username: "mkt_online",
        email: "mktonline@company.com",
        fullName: "Trần Thị Kim Anh",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Chuyên viên Marketing Online",
        baseSalary: 13000000,
        hireDate: new Date(2019, 3, 10),
        address: "90 Cộng Hòa, Quận Tân Bình, TP.HCM",
      },
      {
        username: "mkt_content",
        email: "content@company.com",
        fullName: "Vũ Hoàng Nam",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Chuyên viên Content",
        baseSalary: 11000000,
        hireDate: new Date(2020, 5, 20),
        address: "111 Hoàng Văn Thụ, Quận Phú Nhuận, TP.HCM",
      },
      {
        username: "mkt_design",
        email: "design@company.com",
        fullName: "Phạm Thị Thanh",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Chuyên viên Thiết kế",
        baseSalary: 12000000,
        hireDate: new Date(2019, 9, 5),
        address: "222 Lê Văn Sỹ, Quận 3, TP.HCM",
      },
      {
        username: "sales_staff1",
        email: "salesstaff1@company.com",
        fullName: "Lê Minh Hoàng",
        role: employeeRole,
        department: salesMarketingDept,
        description: "Nhân viên Kinh doanh",
        baseSalary: 8000000,
        hireDate: new Date(2021, 3, 12),
        address: "333 Phan Văn Trị, Quận Bình Thạnh, TP.HCM",
      },

      // Phòng Kỹ thuật
      {
        username: "techdirector",
        email: "techdirector@company.com",
        fullName: "Đỗ Minh Tuấn",
        role: headRole,
        department: techDept,
        description: "Trưởng phòng Kỹ thuật",
        baseSalary: 22000000,
        hireDate: new Date(2017, 3, 1),
        address: "444 Trường Chinh, Quận Tân Bình, TP.HCM",
      },
      {
        username: "devlead",
        email: "devlead@company.com",
        fullName: "Nguyễn Văn Hải",
        role: employeeRole,
        department: techDept,
        description: "Trưởng nhóm Phát triển",
        baseSalary: 18000000,
        hireDate: new Date(2018, 6, 15),
        address: "555 Huỳnh Tấn Phát, Quận 7, TP.HCM",
      },
      {
        username: "frontend1",
        email: "frontend1@company.com",
        fullName: "Trần Minh Khoa",
        role: employeeRole,
        department: techDept,
        description: "Lập trình viên Frontend",
        baseSalary: 15000000,
        hireDate: new Date(2019, 5, 10),
        address: "666 Nguyễn Văn Linh, Quận 7, TP.HCM",
      },
      {
        username: "frontend2",
        email: "frontend2@company.com",
        fullName: "Lê Thị Thu Trang",
        role: employeeRole,
        department: techDept,
        description: "Lập trình viên Frontend",
        baseSalary: 15000000,
        hireDate: new Date(2020, 3, 5),
        address: "777 Quang Trung, Quận Gò Vấp, TP.HCM",
      },
      {
        username: "backend1",
        email: "backend1@company.com",
        fullName: "Phạm Văn Dũng",
        role: employeeRole,
        department: techDept,
        description: "Lập trình viên Backend",
        baseSalary: 16000000,
        hireDate: new Date(2019, 2, 15),
        address: "888 Lê Đức Thọ, Quận Gò Vấp, TP.HCM",
      },
      {
        username: "backend2",
        email: "backend2@company.com",
        fullName: "Hoàng Thị Hà",
        role: employeeRole,
        department: techDept,
        description: "Lập trình viên Backend",
        baseSalary: 16000000,
        hireDate: new Date(2020, 4, 20),
        address: "999 Phạm Văn Đồng, Quận Bình Thạnh, TP.HCM",
      },
      {
        username: "devops",
        email: "devops@company.com",
        fullName: "Nguyễn Xuân Thành",
        role: employeeRole,
        department: techDept,
        description: "Kỹ sư DevOps",
        baseSalary: 17000000,
        hireDate: new Date(2019, 8, 12),
        address: "101 Xô Viết Nghệ Tĩnh, Quận Bình Thạnh, TP.HCM",
      },
      {
        username: "qa_qc",
        email: "qaqc@company.com",
        fullName: "Vũ Thị Phương",
        role: employeeRole,
        department: techDept,
        description: "Chuyên viên QA/QC",
        baseSalary: 14000000,
        hireDate: new Date(2020, 6, 10),
        address: "202 Hoàng Hoa Thám, Quận Tân Bình, TP.HCM",
      },
      {
        username: "itsupport",
        email: "itsupport@company.com",
        fullName: "Lê Văn Hưng",
        role: employeeRole,
        department: techDept,
        description: "Nhân viên IT Support",
        baseSalary: 10000000,
        hireDate: new Date(2021, 5, 15),
        address: "303 Lạc Long Quân, Quận 11, TP.HCM",
      },

      // Phòng Tài chính - Kế toán
      {
        username: "financedirector",
        email: "financedirector@company.com",
        fullName: "Lê Thị Bích Ngọc",
        role: headRole,
        department: financeDept,
        description: "Trưởng phòng Tài chính - Kế toán",
        baseSalary: 20000000,
        hireDate: new Date(2016, 8, 1),
        address: "404 Tân Sơn Nhì, Quận Tân Phú, TP.HCM",
      },
      {
        username: "acc_general",
        email: "accgeneral@company.com",
        fullName: "Nguyễn Văn Tuấn",
        role: employeeRole,
        department: financeDept,
        description: "Kế toán tổng hợp",
        baseSalary: 13000000,
        hireDate: new Date(2018, 3, 10),
        address: "505 Âu Cơ, Quận Tân Phú, TP.HCM",
      },
      {
        username: "acc_payment",
        email: "accpayment@company.com",
        fullName: "Trịnh Thị Hoa",
        role: employeeRole,
        department: financeDept,
        description: "Kế toán thanh toán",
        baseSalary: 12000000,
        hireDate: new Date(2019, 2, 15),
        address: "606 Kinh Dương Vương, Quận 6, TP.HCM",
      },
      {
        username: "acc_debt",
        email: "accdebt@company.com",
        fullName: "Hoàng Văn Minh",
        role: employeeRole,
        department: financeDept,
        description: "Kế toán công nợ",
        baseSalary: 12000000,
        hireDate: new Date(2020, 6, 20),
        address: "707 Hậu Giang, Quận 6, TP.HCM",
      },
      {
        username: "finance_analyst",
        email: "finanalyst@company.com",
        fullName: "Đặng Thị Mai",
        role: employeeRole,
        department: financeDept,
        description: "Chuyên viên Phân tích Tài chính",
        baseSalary: 14000000,
        hireDate: new Date(2020, 10, 5),
        address: "808 An Dương Vương, Quận 5, TP.HCM",
      },
      {
        username: "acc_staff",
        email: "accstaff@company.com",
        fullName: "Bùi Thị Mai",
        role: employeeRole,
        department: financeDept,
        description: "Nhân viên Kế toán",
        baseSalary: 8000000,
        hireDate: new Date(2022, 1, 10),
        address: "909 Trần Hưng Đạo, Quận 5, TP.HCM",
      },

      // Phòng Hành chính
      {
        username: "adminmanager",
        email: "adminmanager@company.com",
        fullName: "Mai Văn Tùng",
        role: headRole,
        department: adminDept,
        description: "Trưởng phòng Hành chính",
        baseSalary: 16000000,
        hireDate: new Date(2017, 5, 12),
        address: "121 Nguyễn Oanh, Quận Gò Vấp, TP.HCM",
      },
      {
        username: "admin_specialist",
        email: "adminspec@company.com",
        fullName: "Trần Văn Khoa",
        role: employeeRole,
        department: adminDept,
        description: "Chuyên viên Hành chính",
        baseSalary: 10000000,
        hireDate: new Date(2019, 11, 8),
        address: "131 Phan Huy Ích, Quận Gò Vấp, TP.HCM",
      },
      {
        username: "admin_clerk",
        email: "clerk@company.com",
        fullName: "Ngô Thị Hồng",
        role: employeeRole,
        department: adminDept,
        description: "Nhân viên Văn thư",
        baseSalary: 7000000,
        hireDate: new Date(2021, 2, 22),
        address: "141 Tô Hiến Thành, Quận 10, TP.HCM",
      },
      {
        username: "receptionist",
        email: "reception@company.com",
        fullName: "Phan Thị Thu Hà",
        role: employeeRole,
        department: adminDept,
        description: "Nhân viên Lễ tân",
        baseSalary: 6000000,
        hireDate: new Date(2022, 5, 5),
        address: "151 3 Tháng 2, Quận 10, TP.HCM",
      },
      {
        username: "security",
        email: "security@company.com",
        fullName: "Nguyễn Văn Bảo",
        role: employeeRole,
        department: adminDept,
        description: "Nhân viên Bảo vệ",
        baseSalary: 5500000,
        hireDate: new Date(2020, 9, 12),
        address: "161 Lê Hồng Phong, Quận 10, TP.HCM",
      },
    ];

    // Lọc ra những người dùng hợp lệ (có đủ thông tin department và role)
    const validUserData = userData.filter((u) => u.department && u.role);

    for (const userData of validUserData) {
      const existingUser = await this.findOneUser({
        where: [{ username: userData.username }, { email: userData.email }],
      });
      if (!existingUser) {
        const passwordHash = await this.hashPassword("password123"); // Default password for seeded users
        const userToCreate = this.userRepository.create({
          ...userData,
          passwordHash: passwordHash,
          isActive: true,
          roleId: userData.role?.id, // Ensure IDs are set if objects are used
          departmentId: userData.department?.id,
        });
        try {
          const savedUser = await this.userRepository.save(userToCreate);
          createdUsers.push(savedUser);
          console.log(`User ${savedUser.username} created.`);
        } catch (error: any) {
          console.error(
            `Failed to save user ${userData.username}: ${error.message}`
          );
        }
      } else {
        console.log(
          `User ${userData.username} or email ${userData.email} already exists, skipping.`
        );
        createdUsers.push(existingUser);
      }
    }

    console.log(
      `${createdUsers.length} users processed (created or already existing).`
    );
    return createdUsers;
  }

  static async seedReports(users: User[], departments: Department[]) {
    const departmentHeads = users.filter(
      (u) => u.role.roleType === RoleType.DEPARTMENT_HEAD
    );
    if (departmentHeads.length === 0 || departments.length === 0) {
      console.log(
        "No department heads or departments found to seed reports for."
      );
      return;
    }

    const reportData: DeepPartial<DepartmentReport>[] = [];
    const currentYear = new Date().getFullYear();
    const lastMonth = new Date().getMonth(); // 0-indexed

    for (const head of departmentHeads) {
      const department = departments.find((d) => d.id === head.departmentId);
      if (department) {
        // Generate some dummy stats for the report
        const totalEmployees = users.filter(
          (u) => u.departmentId === department.id
        ).length;
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
          averagePerformanceRating: avgPerf,
          // generatedAt is handled by @CreateDateColumn
        });
      }
    }

    if (reportData.length > 0) {
      await this.reportRepository.save(reportData);
      console.log("Department reports seeded successfully");
    }
  }
  static async seedAttendances(users: User[]) {
    // Load users với relation role để đảm bảo có đầy đủ thông tin
    const allUsers = await this.userRepository.find({
      relations: ["role", "department"],
    });

    const employees = allUsers;
    if (employees.length === 0) {
      console.log("Không tìm thấy user nào để tạo dữ liệu chấm công.");
      return;
    }

    const attendanceData: DeepPartial<Attendance>[] = [];
    // Hàm format ngày - sửa lại để tránh vấn đề timezone
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }; // Hàm tạo giờ check-in ngẫu nhiên cho người đi đúng giờ (7:00 - 8:30)
    const generateOnTimeCheckInTime = (): string => {
      const startMinutes = 7 * 60; // 7:00 = 420 phút
      const endMinutes = 8 * 60 + 30; // 8:30 = 510 phút
      const totalMinutes =
        Math.floor(Math.random() * (endMinutes - startMinutes + 1)) +
        startMinutes;

      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const second = Math.floor(Math.random() * 60);

      return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
    };

    // Hàm tạo giờ check-in cho người đi muộn (8:31 - 9:30)
    const generateLateCheckInTime = (): string => {
      const startMinutes = 8 * 60 + 31; // 8:31 = 511 phút
      const endMinutes = 9 * 60 + 30; // 9:30 = 570 phút
      const totalMinutes =
        Math.floor(Math.random() * (endMinutes - startMinutes + 1)) +
        startMinutes;

      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const second = Math.floor(Math.random() * 60);

      return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
    };

    // Tất cả đều ra về lúc 17:30
    const getCheckOutTime = (): string => {
      return "17:30:00";
    };

    // Hàm tính số giờ làm việc
    const calculateWorkHours = (
      checkInTime: string,
      checkOutTime: string
    ): number => {
      const [inHour, inMinute, inSecond] = checkInTime.split(":").map(Number);
      const [outHour, outMinute, outSecond] = checkOutTime
        .split(":")
        .map(Number);

      const inTotalMinutes = inHour * 60 + inMinute + inSecond / 60;
      const outTotalMinutes = outHour * 60 + outMinute + outSecond / 60;

      // Trừ 60 phút nghỉ trưa
      const workMinutes = outTotalMinutes - inTotalMinutes - 60;
      return parseFloat((workMinutes / 60).toFixed(2));
    }; // Tạo dữ liệu chấm công từ 01/06/2025 đến 04/06/2025 (hôm nay)
    const year = 2025;
    const month = 6; // Tháng 6
    const currentDay = 4; // Hôm nay là 04/06

    // Lọc ra các ngày cuối tuần (thứ 7, chủ nhật)
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 0 || day === 6; // 0 = Chủ nhật, 6 = Thứ 7
    }; // Tạo dữ liệu chấm công cho mỗi user từ 01/06 đến 04/06/2025
    console.log(
      `Bắt đầu tạo dữ liệu chấm công cho ${employees.length} user (bao gồm System Admin) từ 01/06 đến 04/06/2025`
    );

    // Debug: Kiểm tra xem có System Admin trong danh sách không
    const adminUsers = employees.filter(
      (e) => e.role.roleType === RoleType.SYSTEM_ADMIN
    );
    console.log(
      `Tìm thấy ${adminUsers.length} System Admin: ${adminUsers
        .map((a) => a.fullName)
        .join(", ")}`
    );
    for (const employee of employees) {
      const isAdmin = employee.role.roleType === RoleType.SYSTEM_ADMIN;
      if (isAdmin) {
        console.log(
          `Đang tạo dữ liệu chấm công cho System Admin: ${employee.fullName}`
        );
      }

      for (let day = 1; day <= currentDay; day++) {
        const currentDate = new Date(year, month - 1, day); // month - 1 vì JavaScript months bắt đầu từ 0
        const formattedDate = formatDate(currentDate);
        const isWeekendDay = isWeekend(currentDate);

        // Bỏ qua ngày cuối tuần
        if (isWeekendDay) {
          continue;
        } // Tạo ngẫu nhiên trạng thái đi làm
        // System Admin có tỷ lệ chấm công tốt hơn: 90% đúng giờ, 10% muộn, 0% vắng
        // Nhân viên khác: 80% đúng giờ, 15% muộn, 5% vắng
        const random = Math.random();
        if ((isAdmin && random < 0.9) || (!isAdmin && random < 0.8)) {
          // Đi làm đúng giờ
          const checkInTime = generateOnTimeCheckInTime();
          const checkOutTime = getCheckOutTime();
          const workHours = calculateWorkHours(checkInTime, checkOutTime);

          attendanceData.push({
            user: employee,
            date: formatDate(currentDate),
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: AttendanceStatus.PRESENT,
            workHours: workHours,
          });
        } else if ((!isAdmin && random < 0.95) || (isAdmin && random < 1.0)) {
          // Đi làm muộn (admin ít muộn hơn)
          const lateCheckInTime = generateLateCheckInTime();
          const checkOutTime = getCheckOutTime();
          const workHours = calculateWorkHours(lateCheckInTime, checkOutTime);

          attendanceData.push({
            user: employee,
            date: formatDate(currentDate),
            checkInTime: lateCheckInTime,
            checkOutTime: checkOutTime,
            status: AttendanceStatus.LATE,
            workHours: workHours,
            notes: "Đi muộn",
          });
        } else {
          // Vắng mặt (chỉ nhân viên thường, System Admin không bao giờ vắng)
          if (!isAdmin) {
            attendanceData.push({
              user: employee,
              date: formatDate(currentDate),
              checkInTime: null,
              checkOutTime: null,
              status: AttendanceStatus.ABSENT,
              workHours: 0,
              notes: "Vắng mặt không lý do",
            });
          } else {
            // System Admin thay vì vắng mặt thì đi muộn
            const lateCheckInTime = generateLateCheckInTime();
            const checkOutTime = getCheckOutTime();
            const workHours = calculateWorkHours(lateCheckInTime, checkOutTime);

            attendanceData.push({
              user: employee,
              date: formatDate(currentDate),
              checkInTime: lateCheckInTime,
              checkOutTime: checkOutTime,
              status: AttendanceStatus.LATE,
              workHours: workHours,
              notes: "Đi muộn",
            });
          }
        }
      }
    }
    if (attendanceData.length > 0) {
      // Kiểm tra bản ghi đã tồn tại để tránh trùng lặp
      const existingChecks = attendanceData.map((ad) => ({
        userId: ad.user?.id,
        date: ad.date,
      }));
      const existingRecords = await this.attendanceRepository.find({
        where: existingChecks
          .filter((ec) => ec.userId)
          .map((ec) => ({ user: { id: ec.userId }, date: ec.date })),
      });
      const existingKeys = new Set(
        existingRecords.map((ar) => `${ar.user?.id}-${ar.date}`)
      );

      const newAttendanceData = attendanceData.filter(
        (ad) => ad.user?.id && !existingKeys.has(`${ad.user.id}-${ad.date}`)
      );

      if (newAttendanceData.length > 0) {
        // Lưu dữ liệu theo lô để tránh lỗi khi lượng dữ liệu lớn
        const batchSize = 100;
        for (let i = 0; i < newAttendanceData.length; i += batchSize) {
          const batch = newAttendanceData.slice(i, i + batchSize);
          await this.attendanceRepository.save(batch);
          console.log(
            `Lô ${Math.floor(i / batchSize) + 1}: Đã lưu ${
              batch.length
            } bản ghi chấm công`
          );
        }
        console.log(
          `Tổng cộng: Đã tạo thành công ${newAttendanceData.length} bản ghi chấm công từ 01/06 đến 04/06/2025`
        );
      } else {
        console.log("Tất cả dữ liệu chấm công đã tồn tại hoặc bị xung đột.");
      }
    }
  }
  static async seedPayrolls(users: User[]) {
    // Tạo dữ liệu lương cho tất cả user (bao gồm cả System Admin)
    const employees = users;
    if (employees.length === 0) {
      console.log("Không tìm thấy user nào để tạo dữ liệu lương.");
      return;
    }

    const payrollData: DeepPartial<Payroll>[] = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Tạo dữ liệu lương cho 3 tháng gần nhất
    const months = [
      { month: currentMonth, year: currentYear },
      {
        month: currentMonth - 1 > 0 ? currentMonth - 1 : 12,
        year: currentMonth - 1 > 0 ? currentYear : currentYear - 1,
      },
      {
        month:
          currentMonth - 2 > 0 ? currentMonth - 2 : 12 - (2 - currentMonth),
        year: currentMonth - 2 > 0 ? currentYear : currentYear - 1,
      },
    ];

    for (const employee of employees) {
      for (const { month, year } of months) {
        // Tạo ghi chú
        const payrollNote = `Lương tháng ${month}/${year} - ${employee.fullName}`;

        // Thiết lập ngày thanh toán (null nếu chưa thanh toán)
        const paymentDate =
          month !== currentMonth
            ? new Date(year, month, 10) // Ngày 10 của tháng sau
            : undefined; // Dùng undefined thay vì null để phù hợp với DeepPartial

        // Chỉ tạo bản ghi lương cơ bản, để PayrollService tự tính toán các khoản khấu trừ
        payrollData.push({
          user: employee,
          userId: employee.id,
          month: month,
          year: year,
          baseSalary: employee.baseSalary,
          paymentDate: paymentDate,
          note: payrollNote,
          isFinalized: month !== currentMonth, // Chỉ tháng hiện tại là chưa finalize
        } as DeepPartial<Payroll>);
      }
    }
    if (payrollData.length > 0) {
      // Kiểm tra bản ghi đã tồn tại để tránh trùng lặp
      const existingChecks = payrollData.map((pd) => ({
        userId: pd.userId,
        month: pd.month,
        year: pd.year,
      }));
      const existingRecords = await this.payrollRepository.find({
        where: existingChecks
          .filter((ec) => ec.userId)
          .map((ec) => ({
            user: { id: ec.userId },
            month: ec.month,
            year: ec.year,
          })),
      });
      const existingKeys = new Set(
        existingRecords.map((pr) => `${pr.user?.id}-${pr.month}-${pr.year}`)
      );

      const newPayrollData = payrollData.filter(
        (pd) =>
          pd.userId && !existingKeys.has(`${pd.userId}-${pd.month}-${pd.year}`)
      );

      if (newPayrollData.length > 0) {
        // Lưu dữ liệu theo lô để tránh lỗi khi lượng dữ liệu lớn
        const batchSize = 50;
        for (let i = 0; i < newPayrollData.length; i += batchSize) {
          const batch = newPayrollData.slice(i, i + batchSize);
          await this.payrollRepository.save(batch);
          console.log(
            `Batch ${Math.floor(i / batchSize) + 1}: ${
              batch.length
            } payrolls saved`
          );
        }
        console.log(
          `Total: ${newPayrollData.length} payrolls seeded successfully`
        );
      } else {
        console.log("All seeded payroll records already exist or conflict.");
      }
    }
  }
}
