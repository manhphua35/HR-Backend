import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDefaultValueToResignedEmployees implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            "department_reports",
            "resigned_employees",
            new TableColumn({
                name: "resigned_employees",
                type: "integer",
                default: 0
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            "department_reports",
            "resigned_employees",
            new TableColumn({
                name: "resigned_employees",
                type: "integer",
                isNullable: false
            })
        );
    }
} 