const pool = require("../config/db");

async function getPendingVolunteers(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    user_id,
                    full_name,
                    email,
                    phone,
                    is_verified
                FROM public.users
                WHERE role = 'volunteer'
                    AND is_active = true
                    AND is_verified = false
                ORDER BY user_id ASC
                LIMIT 100;
            `
        );

        const volunteers = result.rows.map((volunteer) => ({
            userId: volunteer.user_id,
            fullName: volunteer.full_name,
            email: volunteer.email,
            phone: volunteer.phone,
            isVerified: volunteer.is_verified,
        }));

        return res.status(200).json({
            message: "Pending volunteers retrieved successfully.",
            volunteers,
        });
    } catch (error) {
        console.error(
            "Get pending volunteers failed:",
            error.message
        );

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

    if (!Number.isSafeInteger(userId) ||
        userId > 2147483647
    ) {
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
        const result = await pool.query(
            `
                UPDATE public.users
                SET is_verified = $1
                WHERE user_id = $2
                    AND role = 'volunteer'
                    AND is_active = true
                RETURNING
                    user_id,
                    full_name,
                    email,
                    is_verified;
            `, [isVerified, userId]
        );

        const volunteer = result.rows[0];

        if (!volunteer) {
            return res.status(404).json({
                message: "Active volunteer account not found.",
            });
        }

        return res.status(200).json({
            message: isVerified ?
                "Volunteer approved successfully." : "Volunteer approval revoked.",
            volunteer: {
                userId: volunteer.user_id,
                fullName: volunteer.full_name,
                email: volunteer.email,
                isVerified: volunteer.is_verified,
            },
        });
    } catch (error) {
        console.error(
            "Set volunteer approval failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to update volunteer approval.",
        });
    }
}

async function getVolunteers(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    user_id,
                    full_name,
                    email,
                    phone,
                    is_verified
                FROM public.users
                WHERE role = 'volunteer'
                    AND is_active = true
                ORDER BY is_verified ASC, user_id ASC
                LIMIT 100;
            `
        );

        const volunteers = result.rows.map((volunteer) => ({
            userId: volunteer.user_id,
            fullName: volunteer.full_name,
            email: volunteer.email,
            phone: volunteer.phone,
            isVerified: volunteer.is_verified,
        }));

        return res.status(200).json({
            message: "Volunteers retrieved successfully.",
            volunteers,
        });
    } catch (error) {
        console.error(
            "Get volunteers failed:",
            error.message
        );

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