const { sql, getPool } = require("../config/db");


async function createListing(req, res) {
    const body = req.body || {};


    const {
        title,
        description,
        foodType,
        quantity,
        unit,
        pickupAddress,
        city,
        preparedAt,
        expiresAt,
        storageConditions,
        allergenInfo,
    } = body;


    // Validate required text fields.
    const requiredText = {
        title: { value: title, max: 150 },
        pickupAddress: { value: pickupAddress, max: 500 },
        city: { value: city, max: 100 },
        storageConditions: { value: storageConditions, max: 500 },
    };


    for (const [field, rule] of Object.entries(requiredText)) {
        if (
            typeof rule.value !== "string" ||
            !rule.value.trim() ||
            rule.value.trim().length > rule.max
        ) {
            return res.status(400).json({
                message: `${field} is required and must not exceed ${rule.max} characters.`,
            });
        }
    }


    // Validate optional text fields.
    const optionalText = {
        description: { value: description, max: 1000 },
        allergenInfo: { value: allergenInfo, max: 500 },
    };


    for (const [field, rule] of Object.entries(optionalText)) {
        if (
            rule.value != null &&
            (
                typeof rule.value !== "string" ||
                rule.value.trim().length > rule.max
            )
        ) {
            return res.status(400).json({
                message: `${field} must be text of no more than ${rule.max} characters.`,
            });
        }
    }


    const allowedFoodTypes = [
        "cooked",
        "produce",
        "bakery",
        "packaged",
        "other",
    ];


    if (!allowedFoodTypes.includes(foodType)) {
        return res.status(400).json({
            message: "Invalid foodType.",
        });
    }


    if (!["kg", "litres", "portions", "items"].includes(unit)) {
        return res.status(400).json({
            message: "Invalid unit.",
        });
    }


    if (
        typeof quantity !== "number" ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 99999999.99 ||
        Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001
    ) {
        return res.status(400).json({
            message: "Quantity must be a positive number with at most 2 decimal places.",
        });
    }


    // Require timestamps with an explicit timezone.
    function parseTimestamp(value) {
        if (
            typeof value !== "string" ||
            !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
        ) {
            return null;
        }


        const date = new Date(value);


        return Number.isNaN(date.getTime()) ? null : date;
    }


    const expiryDate = parseTimestamp(expiresAt);


    if (!expiryDate || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({
            message: "expiresAt must be a future ISO timestamp with a timezone.",
        });
    }


    let preparationDate = null;


    if (preparedAt != null && preparedAt !== "") {
        preparationDate = parseTimestamp(preparedAt);


        if (!preparationDate ||
            preparationDate.getTime() > Date.now() ||
            preparationDate.getTime() >= expiryDate.getTime()
        ) {
            return res.status(400).json({
                message: "preparedAt must be a valid timestamp, not in the future, and earlier than expiresAt.",
            });
        }
    }


    try {
        const pool = await getPool();


        const result = await pool
            .request()
            .input("DonorUserId", sql.Int, req.user.userId)
            .input("Title", sql.NVarChar(150), title.trim())
            .input(
                "Description",
                sql.NVarChar(1000),
                typeof description === "string" ?
                description.trim() || null :
                null
            )
            .input("FoodType", sql.VarChar(30), foodType)
            .input("Quantity", sql.Decimal(10, 2), quantity)
            .input("Unit", sql.VarChar(20), unit)
            .input(
                "PickupAddress",
                sql.NVarChar(500),
                pickupAddress.trim()
            )
            .input("City", sql.NVarChar(100), city.trim())
            .input("PreparedAt", sql.DateTime2(0), preparationDate)
            .input("ExpiresAt", sql.DateTime2(0), expiryDate)
            .input(
                "StorageConditions",
                sql.NVarChar(500),
                storageConditions.trim()
            )
            .input(
                "AllergenInfo",
                sql.NVarChar(500),
                typeof allergenInfo === "string" ?
                allergenInfo.trim() || null :
                null
            )
            .query(`
                INSERT INTO dbo.FoodListings (
                    DonorUserId,
                    Title,
                    Description,
                    FoodType,
                    Quantity,
                    Unit,
                    PickupAddress,
                    City,
                    PreparedAt,
                    ExpiresAt,
                    StorageConditions,
                    AllergenInfo
                )
                OUTPUT
                    INSERTED.ListingId,
                    INSERTED.DonorUserId,
                    INSERTED.Title,
                    INSERTED.Quantity,
                    INSERTED.Unit,
                    INSERTED.Status,
                    INSERTED.ExpiresAt
                VALUES (
                    @DonorUserId,
                    @Title,
                    @Description,
                    @FoodType,
                    @Quantity,
                    @Unit,
                    @PickupAddress,
                    @City,
                    @PreparedAt,
                    @ExpiresAt,
                    @StorageConditions,
                    @AllergenInfo
                );
            `);


        return res.status(201).json({
            message: "Food listing created successfully.",
            listing: result.recordset[0],
        });
    } catch (error) {
        console.error("Create listing failed:", error.message);


        return res.status(500).json({
            message: "Unable to create food listing. Please try again later.",
        });
    }
}


// Browse available, unexpired listings.
async function getAvailableListings(req, res) {
    try {
        const pool = await getPool();


        const result = await pool.request().query(`
            SELECT TOP (100)
                ListingId,
                Title,
                Description,
                FoodType,
                Quantity,
                Unit,
                City,
                PreparedAt,
                ExpiresAt,
                StorageConditions,
                AllergenInfo,
                Status,
                CreatedAt
            FROM dbo.FoodListings
            WHERE Status = 'available'
                AND ExpiresAt > SYSUTCDATETIME()
            ORDER BY ExpiresAt ASC, ListingId ASC;
        `);


        return res.status(200).json({
            message: "Available listings retrieved successfully.",
            count: result.recordset.length,
            listings: result.recordset,
        });
    } catch (error) {
        console.error("Get available listings failed:", error.message);


        return res.status(500).json({
            message: "Unable to retrieve available listings.",
        });
    }
}


// Retrieve listings owned by the authenticated donor.
async function getMyListings(req, res) {
    try {
        const pool = await getPool();


        const result = await pool
            .request()
            .input("DonorUserId", sql.Int, req.user.userId)
            .query(`
                SELECT TOP (100)
                    ListingId,
                    DonorUserId,
                    Title,
                    Description,
                    FoodType,
                    Quantity,
                    Unit,
                    PickupAddress,
                    City,
                    PreparedAt,
                    ExpiresAt,
                    StorageConditions,
                    AllergenInfo,
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.FoodListings
                WHERE DonorUserId = @DonorUserId
                ORDER BY CreatedAt DESC, ListingId DESC;
            `);


        return res.status(200).json({
            message: "Your listings retrieved successfully.",
            count: result.recordset.length,
            listings: result.recordset,
        });
    } catch (error) {
        console.error("Get my listings failed:", error.message);


        return res.status(500).json({
            message: "Unable to retrieve your listings.",
        });
    }
}


// Mark a reserved donation and its accepted request as completed.
async function completeListing(req, res) {
    const listingId = Number(req.params.listingId);


    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID.",
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


        const listingResult = await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .input("DonorUserId", sql.Int, donorUserId)
            .query(`
                SELECT ListingId, Status
                FROM dbo.FoodListings
                WHERE ListingId = @ListingId
                    AND DonorUserId = @DonorUserId;
            `);


        const listing = listingResult.recordset[0];


        if (!listing) {
            await transaction.rollback();
            transactionOpen = false;


            return res.status(404).json({
                message: "Listing not found for this donor.",
            });
        }


        if (listing.Status !== "reserved") {
            await transaction.rollback();
            transactionOpen = false;


            return res.status(409).json({
                message: "Only reserved donations can be marked as completed.",
            });
        }


        await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .query(`
                UPDATE dbo.FoodListings
                SET Status = 'completed',
                    UpdatedAt = SYSUTCDATETIME()
                WHERE ListingId = @ListingId;
            `);


        await new sql.Request(transaction)
            .input("ListingId", sql.Int, listingId)
            .query(`
                UPDATE dr
                SET dr.Status = 'completed',
                    dr.UpdatedAt = SYSUTCDATETIME()
                FROM dbo.DonationRequests dr
                WHERE dr.ListingId = @ListingId
                    AND dr.Status = 'accepted';
            `);


        await transaction.commit();
        transactionOpen = false;


        return res.json({
            message: "Donation marked as completed.",
        });
    } catch (error) {
        if (transactionOpen) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Complete listing rollback failed:",
                    rollbackError.message
                );
            }
        }


        console.error("Complete listing failed:", error.message);


        return res.status(500).json({
            message: "Unable to mark donation as completed.",
        });
    }
}
// Admin: retrieve the latest 100 listings across all statuses.
async function getAdminListings(req, res) {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT TOP (100)
        fl.ListingId,
        fl.DonorUserId,
        fl.Title,
        fl.Description,
        fl.FoodType,
        fl.Quantity,
        fl.Unit,
        fl.City,
        fl.ExpiresAt,
        fl.Status,
        fl.CreatedAt,
        fl.UpdatedAt,
        u.FullName AS DonorName,
        CASE
          WHEN fl.ExpiresAt <= SYSUTCDATETIME() THEN 1
          ELSE 0
        END AS IsExpired
      FROM dbo.FoodListings fl
      INNER JOIN dbo.Users u
        ON u.UserId = fl.DonorUserId
      ORDER BY fl.CreatedAt DESC, fl.ListingId DESC;
    `);

        return res.status(200).json({
            message: "Admin listings retrieved successfully.",
            count: result.recordset.length,
            listings: result.recordset,
        });
    } catch (error) {
        console.error("Get admin listings failed:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve listings for the administrator.",
        });
    }
}

module.exports = {
    createListing,
    getAvailableListings,
    getMyListings,
    completeListing,
    getAdminListings,
};