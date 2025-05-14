import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUpdateHistoryToPayroll implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "payrolls",
            new TableColumn({
                name: "update_history",
                type: "json",
                isNullable: true
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("payrolls", "update_history");
    }
} 