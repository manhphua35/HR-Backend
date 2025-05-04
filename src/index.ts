import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// Load env variables first
dotenv.config();

import { AppDataSource } from './config/data-source';
import routes from './routes/indexRoutes';
const app: Application = express();

app.use(cors({ origin: '*' , credentials: true }));


const PORT = process.env.PORT || 3001;

app.use(express.json());

// Apply routes
app.use('/', routes);

// Connect to the database
AppDataSource.initialize().then(async () => {
    console.log("Database connection established successfully.");
}).catch((error) => {
    console.error("Error during database connection:", error);
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});