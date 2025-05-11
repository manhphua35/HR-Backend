import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddResignationDateToUser implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "users",
            new TableColumn({
                name: "resignation_date",
                type: "date",
                isNullable: true
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "resignation_date");
    }
} 