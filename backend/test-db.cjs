const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env"),
});

const { sql, getPool } = require("./src/config/db");

async function testDatabase() {
    try {
        console.log("Connecting to the database...");

        const pool = await getPool();

        const databaseResult = await pool.request().query(`
      SELECT DB_NAME() AS DatabaseName;
    `);

        console.log("Database connection successful:");
        console.table(databaseResult.recordset);

        const usersResult = await pool.request().query(`
      SELECT COUNT(*) AS UserCount
      FROM dbo.Users;
    `);

        console.log("Users table check successful:");
        console.table(usersResult.recordset);
    } catch (error) {
        console.error("Database test failed:");
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await sql.close();
    }
}

testDatabase();