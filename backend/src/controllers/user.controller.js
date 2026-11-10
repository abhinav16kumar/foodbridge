const { sql, getPool } = require("../config/db");


async function setUserVerification(req, res) {
    const userId = Number(req.params.userId);
    const { isVerified } = req.body || {};


    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID.",
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
                    INSERTED.UserId,
                    INSERTED.FullName,
                    INSERTED.Email,
                    INSERTED.Role,
                    INSERTED.IsVerified
                WHERE UserId = @UserId
                    AND Role = 'ngo';
            `);


        const user = result.recordset[0];


        if (!user) {
            return res.status(404).json({
                message: "NGO user not found.",
            });
        }


        return res.status(200).json({
            message: isVerified ?
                "NGO account approved." : "NGO account verification revoked.",
            user,
        });
    } catch (error) {
        console.error("Set user verification failed:", error.message);


        return res.status(500).json({
            message: "Unable to update NGO verification.",
        });
    }
}


async function getPendingNgos(req, res) {
    try {
        const pool = await getPool();


        const result = await pool.request().query(`
            SELECT
                UserId,
                FullName,
                Email,
                Phone,
                Role,
                IsVerified,
                IsActive,
                CreatedAt
            FROM dbo.Users
            WHERE Role = 'ngo'
                AND IsVerified = 0
            ORDER BY CreatedAt ASC;
        `);


        return res.status(200).json({
            message: "Pending NGO accounts retrieved successfully.",
            count: result.recordset.length,
            users: result.recordset,
        });
    } catch (error) {
        console.error("Get pending NGOs failed:", error.message);


        return res.status(500).json({
            message: "Unable to retrieve pending NGO accounts.",
        });
    }
}


module.exports = {
    setUserVerification,
    getPendingNgos,
};