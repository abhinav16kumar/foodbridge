require("dotenv").config();
const sql = require("mssql");

const config = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  port: Number(process.env.AZURE_SQL_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

async function main() {
  const pool = await sql.connect(config);

  const tables = await pool.request().query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;
  `);

  console.log("Tables:");
  console.log(tables.recordset.map((row) => row.TABLE_NAME).join("\n"));

  const requests = await pool.request().query(`
    SELECT *
    FROM DonationRequests
    ORDER BY RequestId DESC;
  `);

  console.log("\nDonation requests:");
  console.log(JSON.stringify(requests.recordset, null, 2));

  await pool.close();
}

main().catch((error) => {
  console.error("Database check failed:");
  console.error(error.message);
  process.exit(1);
});