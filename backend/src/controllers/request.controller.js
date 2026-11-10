const { sql, getPool } = require("../config/db");
const {
    createNotification,
} = require("./notification.controller");



async function createRequest(req, res) {
    const {
        listingId,
        message,
        deliveryAddress,
    } = req.body || {};



    if (!Number.isInteger(listingId) ||
        listingId <= 0 ||
        listingId > 2147483647
    ) {
        return res.status(400).json({
            message: "listingId must be a positive integer.",
        });
    }



    if (
        message != null &&
        (typeof message !== "string" || message.trim().length > 1000)
    ) {
        return res.status(400).json({
            message: "Message must be text of no more than 1000 characters.",
        });
    }
    if (
        typeof deliveryAddress !== "string" ||
        !deliveryAddress.trim() ||
        deliveryAddress.trim().length > 500
    ) {
        return res.status(400).json({
            message: "Delivery address is required and must not exceed 500 characters.",
        });
    }


    const ngoUserId = req.user.userId;
    let transaction;
    let transactionOpen = false;



    try {
        const pool = await getPool();



        const ngoResult = await pool
            .request()
            .input("NgoUserId", sql.Int, ngoUserId)
            .query(`
                SELECT IsVerified
                FROM dbo.Users
                WHERE UserId = @NgoUserId
                  AND Role = 'ngo';
            `);



        const ngo = ngoResult.recordset[0];



        if (!ngo) {
            return res.status(404).json({
                message: "NGO account not found.",
            });
        }



        const isVerified =
            ngo.IsVerified === true || ngo.IsVerified === 1;

        if (!isVerified) {
            return res.status(403).json({
                message: "Your NGO account must be verified before submitting donation requests.",
            });
        }


        transaction = new sql.Transaction(pool);



        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionOpen = true;



        const listingResult = await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .query(`
                SELECT
                    ListingId,
                    DonorUserId,
                    Status,
                    CASE
                        WHEN ExpiresAt > SYSUTCDATETIME() THEN 1
                        ELSE 0
                    END AS IsUnexpired
                FROM dbo.FoodListings WITH (UPDLOCK, HOLDLOCK)
                WHERE ListingId = @ListingId;
            `);



        const listing = listingResult.recordset[0];



        if (!listing) {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(404).json({
                message: "Donation listing not found.",
            });
        }



        if (listing.DonorUserId === ngoUserId) {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(403).json({
                message: "You cannot request your own donation.",
            });
        }



        if (
            listing.Status !== "available" ||
            listing.IsUnexpired !== 1
        ) {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(409).json({
                message: "This donation is no longer available.",
            });
        }



        const existingResult = await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .input("NgoUserId", sql.Int, ngoUserId)
            .query(`
                SELECT RequestId
                FROM dbo.DonationRequests
                WHERE ListingId = @ListingId
                  AND NgoUserId = @NgoUserId;
            `);



        if (existingResult.recordset.length > 0) {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(409).json({
                message: "You have already requested this donation.",
            });
        }


        const result = await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .input("NgoUserId", sql.Int, ngoUserId)
            .input(
                "Message",
                sql.NVarChar(1000),
                typeof message === "string" ?
                message.trim() || null :
                null
            )
            .input(
                "DeliveryAddress",
                sql.NVarChar(500),
                deliveryAddress.trim()
            )
            .query(`
    INSERT INTO dbo.DonationRequests (
      ListingId,
      NgoUserId,
      Message,
      DeliveryAddress
    )
    OUTPUT
      INSERTED.RequestId,
      INSERTED.ListingId,
      INSERTED.NgoUserId,
      INSERTED.Message,
      INSERTED.DeliveryAddress,
      INSERTED.Status,
      INSERTED.CreatedAt
    VALUES (
      @ListingId,
      @NgoUserId,
      @Message,
      @DeliveryAddress
    );
  `);


        await transaction.commit();
        transactionOpen = false;



        try {
            await createNotification(
                listing.DonorUserId,
                "New donation request",
                "An NGO has requested one of your food donations.",
                "donation_request"
            );
        } catch (notificationError) {
            console.error(
                "Failed to create donor notification:",
                notificationError.message
            );
        }



        return res.status(201).json({
            message: "Donation request submitted successfully.",
            request: result.recordset[0],
        });
    } catch (error) {
        if (transactionOpen) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Request transaction rollback failed:",
                    rollbackError.message
                );
            }
        }



        const errorNumber =
            error?.number ?? error?.originalError?.info?.number;




        if (errorNumber === 2601 || errorNumber === 2627) {
            return res.status(409).json({
                message: "You have already requested this donation.",
            });
        }



        console.error("Create donation request failed:", error.message);



        return res.status(500).json({
            message: "Unable to submit donation request. Please try again later.",
        });
    }
}



async function getDonorRequests(req, res) {
    try {
        const donorUserId = req.user.userId;
        const pool = await getPool();



        const result = await pool.request()
            .input("DonorUserId", sql.Int, donorUserId)
            .query(`
                SELECT
                    dr.RequestId,
                    dr.ListingId,
                    dr.NgoUserId,
                    dr.Message,
                    dr.DeliveryAddress,
                    dr.Status,
                    dr.CreatedAt,
                    dr.UpdatedAt,
                    fl.Title,
                    fl.Quantity,
                    fl.FoodType,
                    fl.City,
                    u.FullName AS NgoName
                FROM dbo.DonationRequests dr
                INNER JOIN dbo.FoodListings fl
                    ON fl.ListingId = dr.ListingId
                INNER JOIN dbo.Users u
                    ON u.UserId = dr.NgoUserId
                WHERE fl.DonorUserId = @DonorUserId
                ORDER BY dr.CreatedAt DESC;
            `);



        return res.json({
            requests: result.recordset,
        });
    } catch (error) {
        console.error("Get donor requests failed:", error.message);



        return res.status(500).json({
            message: "Unable to load donation requests.",
        });
    }
}



async function updateRequestStatus(req, res) {
    const requestId = Number(req.params.requestId);
    const { status } = req.body || {};



    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
            message: "Invalid request ID.",
        });
    }



    if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({
            message: "Status must be either accepted or declined.",
        });
    }



    const donorUserId = req.user.userId;
    let transaction;
    let transactionOpen = false;



    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);



        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionOpen = true;



        const ownershipResult = await new sql.Request(transaction)
            .input("RequestId", sql.Int, requestId)
            .input("DonorUserId", sql.Int, donorUserId)
            .query(`
                SELECT
                    dr.RequestId,
                    dr.NgoUserId,
                    dr.Status,
                    fl.ListingId,
                    fl.Status AS ListingStatus
                FROM dbo.DonationRequests dr
                INNER JOIN dbo.FoodListings fl
                    ON fl.ListingId = dr.ListingId
                WHERE dr.RequestId = @RequestId
                  AND fl.DonorUserId = @DonorUserId;
            `);



        const request = ownershipResult.recordset[0];



        if (!request) {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(404).json({
                message: "Donation request not found for this donor.",
            });
        }



        if (request.Status !== "pending") {
            await transaction.rollback();
            transactionOpen = false;



            return res.status(409).json({
                message: "This request has already been responded to.",
            });
        }



        await new sql.Request(transaction)
            .input("RequestId", sql.Int, requestId)
            .input("Status", sql.VarChar(20), status)
            .query(`
                UPDATE dbo.DonationRequests
                SET Status = @Status,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE RequestId = @RequestId;
            `);



        if (status === "accepted") {
            await new sql.Request(transaction)
                .input("ListingId", sql.Int, request.ListingId)
                .query(`
                    UPDATE dbo.FoodListings
                    SET Status = 'reserved',
                        UpdatedAt = SYSUTCDATETIME()
                    WHERE ListingId = @ListingId;
                `);
        }



        await transaction.commit();
        transactionOpen = false;



        try {
            await createNotification(
                request.NgoUserId,
                `Donation request ${status}`,
                `The donor has ${status} your donation request.`,
                "request_status"
            );
        } catch (notificationError) {
            console.error(
                "Failed to create NGO notification:",
                notificationError.message
            );
        }



        return res.json({
            message: `Donation request ${status}.`,
        });
    } catch (error) {
        if (transactionOpen) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Request status rollback failed:",
                    rollbackError.message
                );
            }
        }



        console.error("Update request status failed:", error.message);



        return res.status(500).json({
            message: "Unable to update donation request.",
        });
    }
}



async function getNgoRequests(req, res) {
    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("NgoUserId", sql.Int, req.user.userId)
            .query(`
        SELECT
          dr.RequestId,
          dr.ListingId,
          dr.Message,
          dr.DeliveryAddress,
          dr.Status,
          dr.CreatedAt,
          dr.UpdatedAt,
          fl.Title,
          fl.Quantity,
          fl.Unit,
          fl.FoodType,
          fl.City,
          fl.Status AS ListingStatus,
          donor.FullName AS DonorName,
          pa.AssignmentId,
          pa.Status AS AssignmentStatus,
          pa.DeliveredAt,
          volunteer.FullName AS VolunteerName,
          vr.RatingId,
          vr.Rating,
          vr.Comment AS RatingComment
        FROM dbo.DonationRequests dr
        INNER JOIN dbo.FoodListings fl
          ON fl.ListingId = dr.ListingId
        INNER JOIN dbo.Users donor
          ON donor.UserId = fl.DonorUserId
        LEFT JOIN dbo.PickupAssignments pa
          ON pa.RequestId = dr.RequestId
          AND pa.ListingId = dr.ListingId
        LEFT JOIN dbo.Users volunteer
          ON volunteer.UserId = pa.VolunteerUserId
        LEFT JOIN dbo.VolunteerRatings vr
          ON vr.AssignmentId = pa.AssignmentId
          AND vr.NgoUserId = dr.NgoUserId
        WHERE dr.NgoUserId = @NgoUserId
        ORDER BY dr.CreatedAt DESC, dr.RequestId DESC;
      `);

        return res.status(200).json({
            requests: result.recordset,
        });
    } catch (error) {
        console.error(
            "Get NGO requests failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to load your donation requests.",
        });
    }
}



module.exports = {
    createRequest,
    getDonorRequests,
    updateRequestStatus,
    getNgoRequests,
};