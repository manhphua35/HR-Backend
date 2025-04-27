import { AppDataSource } from '../config/data-source';
import { Position } from '../entities/core/Position';
import { Department } from '../entities/core/Department';

interface CreatePositionData {
    title: string;
    level: number;
    departmentId: number;
}

class PositionService {
    private static instance: PositionService;
    private positionRepository = AppDataSource.getRepository(Position);
    private departmentRepository = AppDataSource.getRepository(Department);

    public static getInstance(): PositionService {
        if (!PositionService.instance) {
            PositionService.instance = new PositionService();
        }
        return PositionService.instance;
    }

    public async createPosition(data: CreatePositionData): Promise<Position> {
        try {
            // Check if department exists
            const department = await this.departmentRepository.findOneBy({ id: data.departmentId });
            if (!department) {
                throw new Error('Department not found');
            }

            // Check if position title already exists in this department
            const existingPosition = await this.positionRepository.findOne({
                where: {
                    title: data.title,
                    departmentId: data.departmentId
                }
            });

            if (existingPosition) {
                throw new Error('Position title already exists in this department');
            }

            // Create new position
            const position = this.positionRepository.create({
                title: data.title,
                level: data.level,
                departmentId: data.departmentId
            });

            await this.positionRepository.save(position);
            return position;

        } catch (error) {
            throw error;
        }
    }

    public async getAllPositions(): Promise<Position[]> {
        try {
            return await this.positionRepository.find({
                relations: ['department']
            });
        } catch (error) {
            throw error;
        }
    }

    public async getPositionsByDepartment(departmentId: number): Promise<Position[]> {
        try {
            return await this.positionRepository.find({
                where: { departmentId },
                relations: ['department']
            });
        } catch (error) {
            throw error;
        }
    }

    public async getPositionById(id: string): Promise<Position | null> {
        try {
            return await this.positionRepository.findOne({
                where: { id },
                relations: ['department']
            });
        } catch (error) {
            throw error;
        }
    }

    public async updatePosition(
        id: string,
        data: Partial<CreatePositionData>
    ): Promise<Position | null> {
        try {
            const position = await this.positionRepository.findOneBy({ id });
            if (!position) return null;

            // Check department if provided
            if (data.departmentId) {
                const department = await this.departmentRepository.findOneBy({ id: data.departmentId });
                if (!department) {
                    throw new Error('Department not found');
                }
            }

            // Check if new title already exists in target department
            if (data.title && 
                (data.title !== position.title || 
                data.departmentId !== position.departmentId)) {
                const existingPosition = await this.positionRepository.findOne({
                    where: {
                        title: data.title,
                        departmentId: data.departmentId || position.departmentId
                    }
                });

                if (existingPosition) {
                    throw new Error('Position title already exists in this department');
                }
            }

            Object.assign(position, data);
            await this.positionRepository.save(position);
            return position;

        } catch (error) {
            throw error;
        }
    }

    public async deletePosition(id: string): Promise<boolean> {
        try {
            const position = await this.positionRepository.findOneBy({ id });
            if (!position) return false;

            await this.positionRepository.remove(position);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

export const positionService = PositionService.getInstance();