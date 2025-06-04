import { DataSource } from "typeorm";
import dotenv from 'dotenv';
// Load env variables first
dotenv.config();
import { AppDataSource } from "../config/data-source";
import { SeedService } from "../services/SeedService";

async function resetAndSeedDatabase() {
    console.log("=== BẮT ĐẦU QUÁ TRÌNH RESET VÀ SEED DATABASE ===");

    try {
        // 1. Initialize AppDataSource
        console.log("1. Khởi tạo kết nối database...");
        await AppDataSource.initialize();
        console.log("   ✅ Kết nối database thành công!");

        // 2. Drop all existing data using TRUNCATE CASCADE
        console.log("\n2. Xóa toàn bộ dữ liệu cũ...");
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            // Get all table names from metadata
            const tableNames = AppDataSource.entityMetadatas.map(metadata => `"${metadata.tableName}"`);
            console.log(`   📋 Tìm thấy ${tableNames.length} bảng: ${tableNames.join(', ')}`);

            // Truncate all tables with CASCADE to handle foreign key constraints
            const truncateQuery = `TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE;`;
            console.log("   🗑️  Đang xóa dữ liệu với TRUNCATE CASCADE...");
            await queryRunner.query(truncateQuery);
            console.log("   ✅ Đã xóa toàn bộ dữ liệu cũ thành công!");

        } catch (truncateError) {
            console.error("   ❌ Lỗi khi xóa dữ liệu:", truncateError);
            throw truncateError;
        } finally {
            await queryRunner.release();
        }

        // 3. Verify tables are empty
        console.log("\n3. Kiểm tra các bảng đã trống...");
        const verifyQueryRunner = AppDataSource.createQueryRunner();
        await verifyQueryRunner.connect();
        
        try {
            for (const metadata of AppDataSource.entityMetadatas) {
                const count = await verifyQueryRunner.query(`SELECT COUNT(*) as count FROM "${metadata.tableName}"`);
                const rowCount = parseInt(count[0].count);
                if (rowCount > 0) {
                    console.log(`   ⚠️  Bảng ${metadata.tableName} vẫn còn ${rowCount} bản ghi`);
                } else {
                    console.log(`   ✅ Bảng ${metadata.tableName}: trống`);
                }
            }
        } finally {
            await verifyQueryRunner.release();
        }

        // 4. Run the seed service
        console.log("\n4. Bắt đầu tạo dữ liệu mới...");
        await SeedService.seedAll();
        console.log("   ✅ Tạo dữ liệu mới thành công!");

        console.log("\n=== HOÀN THÀNH QUÁ TRÌNH RESET VÀ SEED DATABASE ===");
        
        // 5. Close connection
        await AppDataSource.destroy();
        console.log("✅ Đã đóng kết nối database.");

    } catch (error) {
        console.error("\n❌ LỖI TRONG QUÁ TRÌNH RESET VÀ SEED:", error);
        
        // Ensure connection is closed even on error
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        
        throw error;
    }
}

// Run the reset and seed process
resetAndSeedDatabase().then(() => {
    console.log("\n🎉 QUÁ TRÌNH HOÀN TẤT THÀNH CÔNG!");
    console.log("💡 Bạn có thể chạy server bằng lệnh: npm run dev");
    process.exit(0);
}).catch(error => {
    console.error("\n💥 QUÁ TRÌNH THẤT BẠI:", error);
    console.log("\n🔧 Hướng dẫn khắc phục:");
    console.log("1. Kiểm tra kết nối database");
    console.log("2. Đảm bảo database đã được tạo");
    console.log("3. Kiểm tra file .env có đúng thông tin kết nối");
    process.exit(1);
});