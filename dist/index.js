"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load env variables first
dotenv_1.default.config();
const data_source_1 = require("./config/data-source");
const indexRoutes_1 = __importDefault(require("./routes/indexRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
const PORT = process.env.PORT || 3001;
app.use(express_1.default.json());
// Apply routes
app.use('/', indexRoutes_1.default);
// Connect to the database
data_source_1.AppDataSource.initialize().then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Database connection established successfully.");
})).catch((error) => {
    console.error("Error during database connection:", error);
});
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
