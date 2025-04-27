import { AppDataSource } from '../config/data-source';
import { SeedService } from '../services/SeedService';

AppDataSource.initialize().then(async () => {
    console.log("Database connection established successfully.");
    
    try {
        await SeedService.seedRolesAndPermissions();
        console.log("Data seeding completed successfully.");
    } catch (error) {
        console.error("Error during data seeding:", error);
    }

    process.exit(0);
}).catch(error => {
    console.error("Error during database connection:", error);
    process.exit(1);
});