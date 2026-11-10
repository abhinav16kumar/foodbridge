require("dotenv").config();

const argon2 = require("argon2");
const { sql, getPool } = require("../src/config/db");


async function createAdmin() {
    const email = "admin@foodbridge.com";
    const password = "Admin@12345";
    const fullName = "FoodBridge Admin";
    const phone = "9999999999";


    try {
        const passwordHash = await argon2.hash(password);


        const pool = await getPool();


        const result = await pool
            .request()
            .input("FullName", sql.NVarChar(100), fullName)
            .input("Email", sql.NVarChar(150), email)
            .input("PasswordHash", sql.NVarChar(sql.MAX), passwordHash)
            .input("Role", sql.NVarChar(20), "admin")
            .input("Phone", sql.NVarChar(20), phone)
            .input("IsActive", sql.Bit, true)
            .input("IsVerified", sql.Bit, true)
            .query(`
                IF EXISTS (
                    SELECT 1 FROM dbo.Users WHERE Email = @Email
                )
                BEGIN
                    SELECT 'exists' AS Result;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.Users
                        (FullName, Email, PasswordHash, Role, Phone, IsActive, IsVerified)
                    VALUES
                        (@FullName, @Email, @PasswordHash, @Role, @Phone, @IsActive, @IsVerified);


                    SELECT 'created' AS Result;
                END
            `);


        console.log(result.recordset[0].Result);
        process.exit(0);
    } catch (error) {
        console.error("Failed to create admin:", error.message);
        process.exit(1);
    }
}


createAdmin();