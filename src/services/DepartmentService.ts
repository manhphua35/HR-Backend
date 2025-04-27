import { AppDataSource } from '../config/data-source';
import { Department } from '../entities/core/Department';

interface CreateDepartmentData {
    name: string;
    description?: string;
}

class DepartmentService {
    private static instance: DepartmentService;
    private departmentRepository = AppDataSource.getRepository(Department);

    public static getInstance(): DepartmentService {
        if (!DepartmentService.instance) {
            DepartmentService.instance = new DepartmentService();
        }
        return DepartmentService.instance;
    }

    public async createDepartment(data: CreateDepartmentData): Promise<Department> {
        try {
            // Check if department name already exists
            const existingDepartment = await this.departmentRepository.findOne({
                where: { name: data.name }
            });

            if (existingDepartment) {
                throw new Error('Department name already exists');
            }

            // Create new department
            const department = this.departmentRepository.create({
                name: data.name,
                description: data.description
            });

            await this.departmentRepository.save(department);
            return department;

        } catch (error) {
            throw error;
        }
    }

    public async getAllDepartments(): Promise<Department[]> {
        try {
            return await this.departmentRepository.find();
        } catch (error) {
            throw error;
        }
    }

    public async getDepartmentById(id: number): Promise<Department | null> {
        try {
            return await this.departmentRepository.findOneBy({ id });
        } catch (error) {
            throw error;
        }
    }

    public async updateDepartment(
        id: number,
        data: Partial<CreateDepartmentData>
    ): Promise<Department | null> {
        try {
            const department = await this.departmentRepository.findOneBy({ id });
            if (!department) return null;

            // Check if new name already exists
            if (data.name && data.name !== department.name) {
                const existingDepartment = await this.departmentRepository.findOne({
                    where: { name: data.name }
                });

                if (existingDepartment) {
                    throw new Error('Department name already exists');
                }
            }

            Object.assign(department, data);
            await this.departmentRepository.save(department);
            return department;

        } catch (error) {
            throw error;
        }
    }

    public async deleteDepartment(id: number): Promise<boolean> {
        try {
            const department = await this.departmentRepository.findOneBy({ id });
            if (!department) return false;

            await this.departmentRepository.remove(department);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

export const departmentService = DepartmentService.getInstance();