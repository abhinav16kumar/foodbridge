require("dotenv").config();

const { sql, getPool } = require("./config/db");

async function testConnection() {
    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .query("SELECT GETDATE() AS currentTime");

        console.log("Azure SQL connected successfully!");
        console.log("Database time:", result.recordset[0].currentTime);
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await sql.close();
    }
}

testConnection();