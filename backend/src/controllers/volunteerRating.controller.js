const { sql, getPool } = require("../config/db");

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

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("AssignmentId", sql.Int, assignmentId)
            .input("NgoUserId", sql.Int, req.user.userId)
            .input("Rating", sql.TinyInt, rating)
            .input("Comment", sql.NVarChar(sql.MAX), safeComment)
            .query(`
        SET XACT_ABORT ON;

        BEGIN TRY
          BEGIN TRANSACTION;

          DECLARE @VolunteerUserId INT;

          SELECT
            @VolunteerUserId = pa.VolunteerUserId
          FROM dbo.PickupAssignments pa WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.DonationRequests dr WITH (UPDLOCK, HOLDLOCK)
            ON dr.RequestId = pa.RequestId
          WHERE pa.AssignmentId = @AssignmentId
            AND pa.Status = 'delivered'
            AND dr.NgoUserId = @NgoUserId;

          IF @VolunteerUserId IS NULL
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'not_rateable' AS Outcome;
            RETURN;
          END;

          IF EXISTS (
            SELECT 1
            FROM dbo.VolunteerRatings WITH (UPDLOCK, HOLDLOCK)
            WHERE AssignmentId = @AssignmentId
          )
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'already_rated' AS Outcome;
            RETURN;
          END;

          INSERT INTO dbo.VolunteerRatings (
            AssignmentId,
            NgoUserId,
            VolunteerUserId,
            Rating,
            Comment
          )
          OUTPUT
            inserted.RatingId,
            inserted.AssignmentId,
            inserted.NgoUserId,
            inserted.VolunteerUserId,
            inserted.Rating,
            inserted.Comment,
            inserted.CreatedAt
          VALUES (
            @AssignmentId,
            @NgoUserId,
            @VolunteerUserId,
            @Rating,
            @Comment
          );

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

          THROW;
        END CATCH;
      `);

        const outcome = result.recordset[0];

        if (outcome.Outcome === "not_rateable") {
            return res.status(409).json({
                message: "This assignment cannot be rated. It must be delivered and belong to your NGO.",
            });
        }

        if (outcome.Outcome === "already_rated") {
            return res.status(409).json({
                message: "This delivery has already been rated.",
            });
        }

        const { Outcome, ...savedRating } = outcome;

        return res.status(201).json({
            message: "Volunteer rating submitted successfully.",
            rating: savedRating,
        });
    } catch (error) {
        const errorNumber =
            error.number ||
            (error.originalError &&
                error.originalError.number) ||
            null;

        if (errorNumber === 2601 || errorNumber === 2627) {
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
        const pool = await getPool();

        const result = await pool
            .request()
            .input("VolunteerUserId", sql.Int, volunteerId)
            .query(`
        SELECT
          COUNT(*) AS ratingCount,
          CAST(AVG(CAST(Rating AS DECIMAL(5,2))) AS DECIMAL(5,2)) AS averageRating
        FROM dbo.VolunteerRatings
        WHERE VolunteerUserId = @VolunteerUserId;
      `);

        const summary = result.recordset[0];

        return res.status(200).json({
            message: "Volunteer rating summary retrieved successfully.",
            volunteerId,
            ratingCount: summary.ratingCount || 0,
            averageRating: summary.averageRating || null,
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