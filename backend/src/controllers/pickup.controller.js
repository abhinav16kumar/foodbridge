const { sql, getPool } = require("../config/db");

async function getAvailablePickups(req, res) {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT TOP (100)
        dr.RequestId,
        fl.ListingId,
        fl.Title,
        fl.FoodType,
        fl.Quantity,
        fl.Unit,
        fl.City,
        fl.ExpiresAt,
        fl.StorageConditions,
        fl.AllergenInfo,
        donor.FullName AS DonorName,
        ngo.FullName AS NgoName
      FROM dbo.DonationRequests dr
      INNER JOIN dbo.FoodListings fl
        ON fl.ListingId = dr.ListingId
      INNER JOIN dbo.Users donor
        ON donor.UserId = fl.DonorUserId
      INNER JOIN dbo.Users ngo
        ON ngo.UserId = dr.NgoUserId
      WHERE dr.Status = 'accepted'
        AND fl.Status = 'reserved'
        AND fl.ExpiresAt > SYSUTCDATETIME()
        AND NULLIF(
          LTRIM(RTRIM(dr.DeliveryAddress)),
          ''
        ) IS NOT NULL
        AND donor.IsActive = 1
        AND ngo.IsActive = 1
        AND ngo.IsVerified = 1
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.PickupAssignments pa
          WHERE pa.ListingId = fl.ListingId
             OR pa.RequestId = dr.RequestId
        )
      ORDER BY
        fl.ExpiresAt ASC,
        dr.RequestId ASC;
    `);

        return res.status(200).json({
            message: "Available pickups retrieved successfully.",
            count: result.recordset.length,
            pickups: result.recordset,
        });
    } catch (error) {
        console.error(
            "Get available pickups failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to load available pickups.",
        });
    }
}
async function claimPickup(req, res) {
    const rawRequestId = req.params.requestId;

    if (!/^[1-9]\d*$/.test(rawRequestId)) {
        return res.status(400).json({
            message: "Invalid request ID.",
        });
    }

    const requestId = Number(rawRequestId);

    if (!Number.isSafeInteger(requestId) || requestId > 2147483647) {
        return res.status(400).json({
            message: "Invalid request ID.",
        });
    }

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("RequestId", sql.Int, requestId)
            .input("VolunteerUserId", sql.Int, req.user.userId)
            .query(`
        SET XACT_ABORT ON;

        BEGIN TRY
          BEGIN TRANSACTION;

          DECLARE @ListingId INT;
          DECLARE @NewAssignment TABLE (
            AssignmentId INT,
            RequestId INT,
            ListingId INT,
            VolunteerUserId INT,
            Status VARCHAR(20),
            AssignedAt DATETIME2
          );

          SELECT @ListingId = fl.ListingId
          FROM dbo.DonationRequests dr WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.FoodListings fl WITH (UPDLOCK, HOLDLOCK)
            ON fl.ListingId = dr.ListingId
          INNER JOIN dbo.Users donor WITH (HOLDLOCK)
            ON donor.UserId = fl.DonorUserId
          INNER JOIN dbo.Users ngo WITH (HOLDLOCK)
            ON ngo.UserId = dr.NgoUserId
          WHERE dr.RequestId = @RequestId
            AND dr.Status = 'accepted'
            AND fl.Status = 'reserved'
            AND fl.ExpiresAt > SYSUTCDATETIME()
            AND NULLIF(
              LTRIM(RTRIM(dr.DeliveryAddress)), ''
            ) IS NOT NULL
            AND donor.IsActive = 1
            AND ngo.IsActive = 1
            AND ngo.IsVerified = 1;

          IF @ListingId IS NULL
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'unavailable' AS Outcome;
            RETURN;
          END;

          IF EXISTS (
            SELECT 1
            FROM dbo.PickupAssignments WITH (UPDLOCK, HOLDLOCK)
            WHERE ListingId = @ListingId
               OR RequestId = @RequestId
          )
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'claimed' AS Outcome;
            RETURN;
          END;

          INSERT INTO dbo.PickupAssignments (
            RequestId,
            ListingId,
            VolunteerUserId
          )
          OUTPUT
            inserted.AssignmentId,
            inserted.RequestId,
            inserted.ListingId,
            inserted.VolunteerUserId,
            inserted.Status,
            inserted.AssignedAt
          INTO @NewAssignment
          VALUES (
            @RequestId,
            @ListingId,
            @VolunteerUserId
          );

          COMMIT TRANSACTION;

          SELECT 'created' AS Outcome, *
          FROM @NewAssignment;
        END TRY
        BEGIN CATCH
          IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

          THROW;
        END CATCH;
      `);

        const assignment = result.recordset[0];

        if (assignment.Outcome === "unavailable") {
            return res.status(409).json({
                message: "This donation is no longer eligible for pickup. Refresh the list.",
            });
        }

        if (assignment.Outcome === "claimed") {
            return res.status(409).json({
                message: "This pickup has already been claimed. Refresh the list.",
            });
        }

        const { Outcome, ...savedAssignment } = assignment;

        return res.status(201).json({
            message: "Pickup claimed successfully.",
            assignment: savedAssignment,
        });
    } catch (error) {
        const errorNumber =
            error.number ? error.number : error.originalError ? error.originalError.number : error.originalError ? error.originalError.info ? error.originalError.info.number : null : null;

        if (errorNumber === 2601 || errorNumber === 2627) {
            return res.status(409).json({
                message: "This pickup has already been claimed.",
            });
        }

        if (errorNumber === 1205) {
            return res.status(409).json({
                message: "Another operation conflicted with this claim. Refresh and try again.",
            });
        }

        console.error("Claim pickup failed:", error.message);

        return res.status(500).json({
            message: "Unable to confirm the claim. Refresh My assignments before trying again.",
        });
    }
}

async function getMyAssignments(req, res) {
    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("VolunteerUserId", sql.Int, req.user.userId)
            .query(`
        SELECT TOP (100)
          pa.AssignmentId,
          pa.RequestId,
          pa.ListingId,
          pa.Status,
          pa.AssignedAt,
          pa.PickedUpAt,
          pa.DeliveredAt,
          fl.Title,
          fl.FoodType,
          fl.Quantity,
          fl.Unit,
          fl.City,
          fl.ExpiresAt,
          fl.StorageConditions,
          fl.AllergenInfo,
          dr.DeliveryAddress,
          donor.FullName AS DonorName,
          ngo.FullName AS NgoName
        FROM dbo.PickupAssignments pa
        INNER JOIN dbo.DonationRequests dr
          ON dr.RequestId = pa.RequestId
        INNER JOIN dbo.FoodListings fl
          ON fl.ListingId = pa.ListingId
        INNER JOIN dbo.Users donor
          ON donor.UserId = fl.DonorUserId
        INNER JOIN dbo.Users ngo
          ON ngo.UserId = dr.NgoUserId
        WHERE pa.VolunteerUserId = @VolunteerUserId
        ORDER BY pa.AssignedAt DESC, pa.AssignmentId DESC;
      `);

        return res.status(200).json({
            message: "Your assignments retrieved successfully.",
            count: result.recordset.length,
            assignments: result.recordset,
        });
    } catch (error) {
        console.error("Get my assignments failed:", error.message);

        return res.status(500).json({
            message: "Unable to load your assignments.",
        });
    }
}
async function markPickupCollected(req, res) {
    const rawAssignmentId = req.params.assignmentId;

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

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("AssignmentId", sql.Int, assignmentId)
            .input("VolunteerUserId", sql.Int, req.user.userId)
            .query(`
        UPDATE dbo.PickupAssignments
        SET
          Status = 'picked_up',
          PickedUpAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
        OUTPUT
          inserted.AssignmentId,
          inserted.RequestId,
          inserted.ListingId,
          inserted.VolunteerUserId,
          inserted.Status,
          inserted.AssignedAt,
          inserted.PickedUpAt,
          inserted.DeliveredAt,
          inserted.UpdatedAt
        WHERE AssignmentId = @AssignmentId
          AND VolunteerUserId = @VolunteerUserId
          AND Status = 'assigned';
      `);

        const assignment = result.recordset[0];

        if (!assignment) {
            return res.status(409).json({
                message: "This assignment cannot be marked as picked up. It may not belong to you, may no longer exist, or may already have progressed. Refresh your assignments.",
            });
        }

        return res.status(200).json({
            message: "Food marked as picked up successfully.",
            assignment,
        });
    } catch (error) {
        console.error("Mark pickup collected failed:", error.message);

        return res.status(500).json({
            message: "Unable to confirm the update. Refresh your assignments before trying again.",
        });
    }
}
async function markPickupDelivered(req, res) {
    const rawAssignmentId = req.params.assignmentId;

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

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("AssignmentId", sql.Int, assignmentId)
            .input("VolunteerUserId", sql.Int, req.user.userId)
            .query(`
        SET XACT_ABORT ON;

        BEGIN TRY
          BEGIN TRANSACTION;

          DECLARE @RequestId INT;
          DECLARE @ListingId INT;
          DECLARE @AssignmentStatus VARCHAR(20);
          DECLARE @RequestStatus VARCHAR(20);
          DECLARE @ListingStatus VARCHAR(20);
          DECLARE @Now DATETIME2 = SYSUTCDATETIME();

          SELECT
            @RequestId = dr.RequestId,
            @ListingId = fl.ListingId,
            @AssignmentStatus = pa.Status,
            @RequestStatus = dr.Status,
            @ListingStatus = fl.Status
          FROM dbo.PickupAssignments pa WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.DonationRequests dr WITH (UPDLOCK, HOLDLOCK)
            ON dr.RequestId = pa.RequestId
          INNER JOIN dbo.FoodListings fl WITH (UPDLOCK, HOLDLOCK)
            ON fl.ListingId = pa.ListingId
            AND fl.ListingId = dr.ListingId
          WHERE pa.AssignmentId = @AssignmentId
            AND pa.VolunteerUserId = @VolunteerUserId;

          IF @RequestId IS NULL
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'not_found' AS Outcome;
            RETURN;
          END;

          IF @AssignmentStatus <> 'picked_up'
            OR @RequestStatus <> 'accepted'
            OR @ListingStatus <> 'reserved'
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'invalid_state' AS Outcome;
            RETURN;
          END;

          UPDATE dbo.PickupAssignments
          SET
            Status = 'delivered',
            DeliveredAt = @Now,
            UpdatedAt = @Now
          WHERE AssignmentId = @AssignmentId;

          UPDATE dbo.DonationRequests
          SET
            Status = 'completed',
            UpdatedAt = @Now
          WHERE RequestId = @RequestId;

          UPDATE dbo.FoodListings
          SET
            Status = 'completed',
            UpdatedAt = @Now
          WHERE ListingId = @ListingId;

          COMMIT TRANSACTION;

          SELECT
            'delivered' AS Outcome,
            @AssignmentId AS AssignmentId,
            @RequestId AS RequestId,
            @ListingId AS ListingId,
            'delivered' AS Status,
            @Now AS DeliveredAt;
        END TRY
        BEGIN CATCH
          IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

          THROW;
        END CATCH;
      `);

        const outcome = result.recordset[0];

        if (outcome.Outcome === "not_found") {
            return res.status(404).json({
                message: "Assignment not found for this volunteer.",
            });
        }

        if (outcome.Outcome === "invalid_state") {
            return res.status(409).json({
                message: "This assignment cannot be completed in its current state. Refresh your assignments. It must be picked up, with an accepted request and reserved listing.",
            });
        }

        const { Outcome, ...assignment } = outcome;

        return res.status(200).json({
            message: "Delivery confirmed successfully.",
            assignment,
        });
    } catch (error) {
        console.error("Mark pickup delivered failed:", error.message);

        return res.status(500).json({
            message: "Unable to confirm delivery. Refresh your assignments before trying again.",
        });
    }
}
module.exports = {
    getAvailablePickups,
    claimPickup,
    getMyAssignments,
    markPickupCollected,
    markPickupDelivered,
};