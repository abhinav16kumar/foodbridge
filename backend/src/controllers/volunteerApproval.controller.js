const { sql, getPool } = require("../config/db");

async function getPendingVolunteers(req, res) {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT TOP (100)
        UserId AS userId,
        FullName AS fullName,
        Email AS email,
        Phone AS phone,
        IsVerified AS isVerified
      FROM dbo.Users
      WHERE Role = 'volunteer'
        AND IsActive = 1
        AND IsVerified = 0
      ORDER BY UserId ASC;
    `);

        return res.status(200).json({
            message: "Pending volunteers retrieved successfully.",
            volunteers: result.recordset,
        });
    } catch (error) {
        console.error("Get pending volunteers failed:", error.message);

        return res.status(500).json({
            message: "Unable to load pending volunteers.",
        });
    }
}

async function setVolunteerApproval(req, res) {
    const rawUserId = req.params.userId;
    const { isVerified } = req.body || {};

    if (!/^[1-9]\d*$/.test(rawUserId)) {
        return res.status(400).json({
            message: "Invalid volunteer ID.",
        });
    }

    const userId = Number(rawUserId);

    if (!Number.isSafeInteger(userId) || userId > 2147483647) {
        return res.status(400).json({
            message: "Invalid volunteer ID.",
        });
    }

    if (typeof isVerified !== "boolean") {
        return res.status(400).json({
            message: "isVerified must be true or false.",
        });
    }

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("UserId", sql.Int, userId)
            .input("IsVerified", sql.Bit, isVerified)
            .query(`
        UPDATE dbo.Users
        SET IsVerified = @IsVerified
        OUTPUT
          inserted.UserId AS userId,
          inserted.FullName AS fullName,
          inserted.Email AS email,
          inserted.IsVerified AS isVerified
        WHERE UserId = @UserId
          AND Role = 'volunteer'
          AND IsActive = 1;
      `);

        const volunteer = result.recordset[0];

        if (!volunteer) {
            return res.status(404).json({
                message: "Active volunteer account not found.",
            });
        }

        return res.status(200).json({
            message: isVerified ?
                "Volunteer approved successfully." : "Volunteer approval revoked.",
            volunteer,
        });
    } catch (error) {
        console.error("Set volunteer approval failed:", error.message);

        return res.status(500).json({
            message: "Unable to update volunteer approval.",
        });
    }
}
async function getVolunteers(req, res) {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT TOP (100)
        UserId AS userId,
        FullName AS fullName,
        Email AS email,
        Phone AS phone,
        IsVerified AS isVerified
      FROM dbo.Users
      WHERE Role = 'volunteer'
        AND IsActive = 1
      ORDER BY IsVerified ASC, UserId ASC;
    `);

        return res.status(200).json({
            message: "Volunteers retrieved successfully.",
            volunteers: result.recordset,
        });
    } catch (error) {
        console.error("Get volunteers failed:", error.message);

        return res.status(500).json({
            message: "Unable to load volunteers.",
        });
    }
}
module.exports = {
    getPendingVolunteers,
    getVolunteers,
    setVolunteerApproval,
};