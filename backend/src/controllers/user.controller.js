const pool = require("../config/db");

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
        const result = await pool.query(
            `
                UPDATE public.users
                SET is_verified = $1
                WHERE user_id = $2
                    AND role = 'ngo'
                RETURNING
                    user_id,
                    full_name,
                    email,
                    role,
                    is_verified;
            `, [isVerified, userId]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                message: "NGO user not found.",
            });
        }

        return res.status(200).json({
            message: isVerified ?
                "NGO account approved." : "NGO account verification revoked.",
            user: {
                UserId: user.user_id,
                FullName: user.full_name,
                Email: user.email,
                Role: user.role,
                IsVerified: user.is_verified,
            },
        });
    } catch (error) {
        console.error(
            "Set user verification failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to update NGO verification.",
        });
    }
}

async function getPendingNgos(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    user_id,
                    full_name,
                    email,
                    phone,
                    role,
                    is_verified,
                    is_active,
                    created_at
                FROM public.users
                WHERE role = 'ngo'
                    AND is_verified = false
                ORDER BY created_at ASC;
            `
        );

        const users = result.rows.map((user) => ({
            UserId: user.user_id,
            FullName: user.full_name,
            Email: user.email,
            Phone: user.phone,
            Role: user.role,
            IsVerified: user.is_verified,
            IsActive: user.is_active,
            CreatedAt: user.created_at,
        }));

        return res.status(200).json({
            message: "Pending NGO accounts retrieved successfully.",
            count: users.length,
            users,
        });
    } catch (error) {
        console.error(
            "Get pending NGOs failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to retrieve pending NGO accounts.",
        });
    }
}

module.exports = {
    setUserVerification,
    getPendingNgos,
};