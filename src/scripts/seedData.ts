import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first
import { AppDataSource } from '../config/data-source';
import { SeedService } from '../services/SeedService';

AppDataSource.initialize().then(async () => {
    console.log("Database connection established successfully.");
    
    try {
        // Call the new comprehensive seeding method
        await SeedService.seedAll();
        // console.log("Data seeding completed successfully."); // seedAll logs completion
    } catch (error) {
        console.error("Error during data seeding:", error);
    }

    process.exit(0);
}).catch(error => {
    console.error("Error during database connection:", error);
    process.exit(1);
});