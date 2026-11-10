const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");

async function authenticate(req, res, next) {
    const authorization = req.headers.authorization;

    if (typeof authorization !== "string") {
        return res.status(401).json({
            message: "Authentication required. Send a Bearer token.",
        });
    }

    const parts = authorization.trim().split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== "bearer"
    ) {
        return res.status(401).json({
            message: "Use the format: Authorization: Bearer <token>",
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured.");

        return res.status(500).json({
            message: "Authentication is temporarily unavailable.",
        });
    }

    let payload;

    try {
        payload = jwt.verify(parts[1], process.env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: "foodbridge-api",
            audience: "foodbridge-app",
        });
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired access token. Please log in again.",
        });
    }

    if (
        typeof payload !== "object" ||
        payload === null ||
        typeof payload.sub !== "string" ||
        !/^[1-9]\d*$/.test(payload.sub) ||
        !Number.isInteger(payload.exp)
    ) {
        return res.status(401).json({
            message: "Invalid access token.",
        });
    }

    const userId = Number(payload.sub);

    if (!Number.isSafeInteger(userId) || userId > 2147483647) {
        return res.status(401).json({
            message: "Invalid access token.",
        });
    }

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("UserId", sql.Int, userId)
            .query(`
        SELECT
          UserId,
          FullName,
          Email,
          Role,
          IsActive,
          IsVerified
        FROM dbo.Users
        WHERE UserId = @UserId;
      `);

        const user = result.recordset[0];

        if (!user || !user.IsActive) {
            return res.status(401).json({
                message: "Account unavailable. Please log in again.",
            });
        }

        req.user = {
            userId: user.UserId,
            fullName: user.FullName,
            email: user.Email,
            role: user.Role,
            isVerified: user.IsVerified,
        };

        return next();
    } catch (error) {
        console.error("Authentication database error:", error.message);

        return res.status(500).json({
            message: "Unable to authenticate. Please try again later.",
        });
    }
}

module.exports = { authenticate };