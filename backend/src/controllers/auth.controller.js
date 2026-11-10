const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");

// REGISTER
async function register(req, res) {
    const { fullName, email, password, role, phone } = req.body || {};

    if (
        typeof fullName !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof role !== "string"
    ) {
        return res.status(400).json({
            message: "Full name, email, password, and role are required.",
        });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({
            message: "Full name must contain between 2 and 100 characters.",
        });
    }

    if (
        cleanEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
        return res.status(400).json({
            message: "Enter a valid email address.",
        });
    }

    if (password.length < 15 || password.length > 128) {
        return res.status(400).json({
            message: "Password must contain between 15 and 128 characters.",
        });
    }

    if (!["donor", "ngo", "volunteer"].includes(cleanRole)) {
        return res.status(400).json({
            message: "Role must be donor, ngo, or volunteer.",
        });
    }

    if (
        phone != null &&
        (typeof phone !== "string" || phone.trim().length > 20)
    ) {
        return res.status(400).json({
            message: "Phone must be a string of no more than 20 characters.",
        });
    }

    const cleanPhone =
        typeof phone === "string" ? phone.trim() || null : null;

    try {
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
        });

        const pool = await getPool();

        const result = await pool
            .request()
            .input("FullName", sql.NVarChar(100), cleanName)
            .input("Email", sql.NVarChar(254), cleanEmail)
            .input("PasswordHash", sql.NVarChar(255), passwordHash)
            .input("Role", sql.VarChar(20), cleanRole)
            .input("Phone", sql.NVarChar(20), cleanPhone)
            .query(`
  INSERT INTO dbo.Users (
    FullName,
    Email,
    PasswordHash,
    Role,
    Phone,
    IsVerified
  )
  OUTPUT
    INSERTED.UserId,
    INSERTED.FullName,
    INSERTED.Email,
    INSERTED.Role,
    INSERTED.IsVerified
  VALUES (
    @FullName,
    @Email,
    @PasswordHash,
    @Role,
    @Phone,
    0
  );
`);

        return res.status(201).json({
            message: "Account created successfully.",
            user: result.recordset[0],
        });
    } catch (error) {
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        console.error("Registration failed:", error.message);

        return res.status(500).json({
            message: "Unable to create account. Please try again later.",
        });
    }
}

// LOGIN
async function login(req, res) {
    const { email, password } = req.body || {};

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        email.trim().length > 254 ||
        password.length < 1 ||
        password.length > 128
    ) {
        return res.status(400).json({
            message: "Enter a valid email and password.",
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const pool = await getPool();

        const result = await pool
            .request()
            .input("Email", sql.NVarChar(254), cleanEmail)
            .query(`
        SELECT
          UserId,
          FullName,
          Email,
          PasswordHash,
          Role,
          IsActive,
          IsVerified
        FROM dbo.Users
        WHERE Email = @Email;
      `);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        const passwordMatches = await argon2.verify(
            user.PasswordHash,
            password
        );

        if (!passwordMatches || !user.IsActive) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        const token = jwt.sign({},
            process.env.JWT_SECRET, {
                algorithm: "HS256",
                subject: String(user.UserId),
                issuer: "foodbridge-api",
                audience: "foodbridge-app",
                expiresIn: "15m",
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                userId: user.UserId,
                fullName: user.FullName,
                email: user.Email,
                role: user.Role,
                isVerified: user.IsVerified,
            },
        });
    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            message: "Unable to log in. Please try again later.",
        });
    }
}

// Export both functions.
module.exports = { register, login };