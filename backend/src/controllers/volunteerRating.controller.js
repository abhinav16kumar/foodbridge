const pool = require("../config/db");

function isValidRating(value) {
    return (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 5
    );
}

async function createVolunteerRating(req, res) {
    const rawAssignmentId = req.params.assignmentId;
    const { rating, comment } = req.body || {};

    if (!/^[1-9]\d*$/.test(rawAssignmentId)) {
        return res.status(400).json({
            message: "Invalid assignment ID.",
        });
    }

    const assignmentId = Number(rawAssignmentId);

    if (!Number.isSafeInteger(assignmentId) ||
        assignmentId > 2147483647
    ) {
        return res.status(400).json({
            message: "Invalid assignment ID.",
        });
    }

    if (!isValidRating(rating)) {
        return res.status(400).json({
            message: "Rating must be an integer from 1 to 5.",
        });
    }

    let safeComment = null;

    if (comment !== undefined && comment !== null) {
        if (typeof comment !== "string") {
            return res.status(400).json({
                message: "Comment must be text.",
            });
        }

        safeComment = comment.trim();

        if (safeComment.length > 1000) {
            return res.status(400).json({
                message: "Comment must be 1000 characters or fewer.",
            });
        }

        if (safeComment.length === 0) {
            safeComment = null;
        }
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const assignmentResult = await client.query(
            `
                SELECT
                    p.id,
                    p.volunteer_id,
                    r.ngo_id
                FROM public.pickups p
                INNER JOIN public.requests r
                    ON r.id = p.request_id
                WHERE p.id = $1
                    AND p.status = 'delivered'
                    AND r.ngo_id = $2
                FOR UPDATE OF p, r;
            `, [assignmentId, req.user.userId]
        );

        const assignment = assignmentResult.rows[0];

        if (!assignment) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This assignment cannot be rated. It must be delivered and belong to your NGO.",
            });
        }

        const existingResult = await client.query(
            `
                SELECT
                    id
                FROM public.volunteer_ratings
                WHERE assignment_id = $1;
            `, [assignmentId]
        );

        if (existingResult.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This delivery has already been rated.",
            });
        }

        const result = await client.query(
            `
                INSERT INTO public.volunteer_ratings (
                    assignment_id,
                    ngo_user_id,
                    volunteer_user_id,
                    rating,
                    comment
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                RETURNING
                    id,
                    assignment_id,
                    ngo_user_id,
                    volunteer_user_id,
                    rating,
                    comment,
                    created_at;
            `, [
                assignmentId,
                req.user.userId,
                assignment.volunteer_id,
                rating,
                safeComment,
            ]
        );

        await client.query("COMMIT");

        const savedRating = result.rows[0];

        return res.status(201).json({
            message: "Volunteer rating submitted successfully.",
            rating: {
                RatingId: savedRating.id,
                AssignmentId: savedRating.assignment_id,
                NgoUserId: savedRating.ngo_user_id,
                VolunteerUserId: savedRating.volunteer_user_id,
                Rating: savedRating.rating,
                Comment: savedRating.comment,
                CreatedAt: savedRating.created_at,
            },
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Create volunteer rating rollback failed:",
                    rollbackError.message
                );
            }
        }

        if (error && error.code === "23505") {
            return res.status(409).json({
                message: "This delivery has already been rated.",
            });
        }

        console.error(
            "Create volunteer rating failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to submit the rating. Refresh and try again.",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function getVolunteerRatingSummary(req, res) {
    const rawVolunteerId = req.params.volunteerId;

    if (!/^[1-9]\d*$/.test(rawVolunteerId)) {
        return res.status(400).json({
            message: "Invalid volunteer ID.",
        });
    }

    const volunteerId = Number(rawVolunteerId);

    if (!Number.isSafeInteger(volunteerId) ||
        volunteerId > 2147483647
    ) {
        return res.status(400).json({
            message: "Invalid volunteer ID.",
        });
    }

    try {
        const result = await pool.query(
            `
                SELECT
                    COUNT(*) AS rating_count,
                    AVG(rating) AS average_rating
                FROM public.volunteer_ratings
                WHERE volunteer_user_id = $1;
            `, [volunteerId]
        );

        const summary = result.rows[0];

        return res.status(200).json({
            message: "Volunteer rating summary retrieved successfully.",
            volunteerId,
            ratingCount: Number(summary.rating_count),
            averageRating: summary.average_rating == null ?
                null : Number(summary.average_rating),
        });
    } catch (error) {
        console.error(
            "Get volunteer rating summary failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to load the volunteer rating summary.",
        });
    }
}

module.exports = {
    createVolunteerRating,
    getVolunteerRatingSummary,
};