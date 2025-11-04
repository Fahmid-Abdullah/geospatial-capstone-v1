import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

const pool = new Pool({
    user: process.env.POSTGRES_USER || "postgis",
    host: process.env.POSTGRES_HOST || "localhost",
    password: process.env.POSTGRES_PASSWORD || "",
    database: process.env.POSTGRES_DB || "",
    port: Number(process.env.POSTGRES_PORT) || 5432
});

export default pool;