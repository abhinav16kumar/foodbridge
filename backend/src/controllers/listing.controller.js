const pool = require("../config/db");


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
        const result = await pool.query(
            `
                INSERT INTO public.listings (
                    donor_id,
                    food_name,
                    description,
                    food_type,
                    quantity,
                    unit,
                    pickup_location,
                    city,
                    prepared_at,
                    available_until,
                    storage_conditions,
                    allergen_info,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9::timestamptz AT TIME ZONE 'UTC',
                    $10::timestamptz AT TIME ZONE 'UTC',
                    $11,
                    $12,
                    'available'
                )
                RETURNING
                    id,
                    donor_id,
                    food_name,
                    quantity,
                    unit,
                    status,
                    available_until;
            `, [
                req.user.userId,
                title.trim(),
                typeof description === "string" ?
                description.trim() || null :
                null,
                foodType,
                String(quantity),
                unit,
                pickupAddress.trim(),
                city.trim(),
                preparationDate ?
                preparationDate.toISOString() :
                null,
                expiryDate.toISOString(),
                storageConditions.trim(),
                typeof allergenInfo === "string" ?
                allergenInfo.trim() || null :
                null,
            ]
        );

        const listing = result.rows[0];

        return res.status(201).json({
            message: "Food listing created successfully.",
            listing: {
                ListingId: listing.id,
                DonorUserId: listing.donor_id,
                Title: listing.food_name,
                Quantity: Number(listing.quantity),
                Unit: listing.unit,
                Status: listing.status,
                ExpiresAt: expiryDate.toISOString(),
            },
        });
    } catch (error) {
        console.error("Create listing failed:", error.message);


        return res.status(500).json({
            message: "Unable to create food listing. Please try again later.",
        });
    }
}

// Browse available, unexpired listings.
// Browse available, unexpired listings.
async function getAvailableListings(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    id,
                    food_name,
                    description,
                    food_type,
                    quantity,
                    unit,
                    city,
                    prepared_at,
                    available_until,
                    storage_conditions,
                    allergen_info,
                    status,
                    created_at
                FROM public.listings
                WHERE status = 'available'
                    AND available_until > NOW()
                ORDER BY available_until ASC, id ASC
                LIMIT 100;
            `
        );

        const listings = result.rows.map((listing) => ({
            ListingId: listing.id,
            Title: listing.food_name,
            Description: listing.description,
            FoodType: listing.food_type,
            Quantity: Number(listing.quantity),
            Unit: listing.unit,
            City: listing.city,
            PreparedAt: listing.prepared_at,
            ExpiresAt: listing.available_until,
            StorageConditions: listing.storage_conditions,
            AllergenInfo: listing.allergen_info,
            Status: listing.status,
            CreatedAt: listing.created_at,
        }));

        return res.status(200).json({
            message: "Available listings retrieved successfully.",
            count: listings.length,
            listings,
        });
    } catch (error) {
        console.error("Get available listings failed:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve available listings.",
        });
    }
}

// Retrieve listings owned by the authenticated donor.
// Retrieve listings owned by the authenticated donor.
async function getMyListings(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    id,
                    donor_id,
                    food_name,
                    description,
                    food_type,
                    quantity,
                    unit,
                    pickup_location,
                    city,
                    prepared_at,
                    available_until,
                    storage_conditions,
                    allergen_info,
                    status,
                    created_at
                FROM public.listings
                WHERE donor_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 100;
            `, [req.user.userId]
        );

        const listings = result.rows.map((listing) => ({
            ListingId: listing.id,
            DonorUserId: listing.donor_id,
            Title: listing.food_name,
            Description: listing.description,
            FoodType: listing.food_type,
            Quantity: Number(listing.quantity),
            Unit: listing.unit,
            PickupAddress: listing.pickup_location,
            City: listing.city,
            PreparedAt: listing.prepared_at,
            ExpiresAt: listing.available_until,
            StorageConditions: listing.storage_conditions,
            AllergenInfo: listing.allergen_info,
            Status: listing.status,
            CreatedAt: listing.created_at,
            UpdatedAt: listing.created_at,
        }));

        return res.status(200).json({
            message: "Your listings retrieved successfully.",
            count: listings.length,
            listings,
        });
    } catch (error) {
        console.error("Get my listings failed:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve your listings.",
        });
    }
}

// Mark a reserved donation and its accepted request as completed.
// Mark a reserved donation and its accepted request as completed.
async function completeListing(req, res) {
    const listingId = Number(req.params.listingId);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID.",
        });
    }

    const donorUserId = req.user.userId;
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const listingResult = await client.query(
            `
                SELECT
                    id,
                    status
                FROM public.listings
                WHERE id = $1
                    AND donor_id = $2
                FOR UPDATE;
            `, [listingId, donorUserId]
        );

        const listing = listingResult.rows[0];

        if (!listing) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Listing not found for this donor.",
            });
        }

        if (listing.status !== "reserved") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "Only reserved donations can be marked as completed.",
            });
        }

        await client.query(
            `
                UPDATE public.listings
                SET status = 'completed'
                WHERE id = $1;
            `, [listingId]
        );

        await client.query(
            `
                UPDATE public.requests
                SET status = 'completed'
                WHERE listing_id = $1
                    AND status = 'accepted';
            `, [listingId]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Donation marked as completed.",
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
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
    } finally {
        if (client) {
            client.release();
        }
    }
}
// Admin: retrieve the latest 100 listings across all statuses.
// Admin: retrieve the latest 100 listings across all statuses.
async function getAdminListings(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    l.id,
                    l.donor_id,
                    l.food_name,
                    l.description,
                    l.food_type,
                    l.quantity,
                    l.unit,
                    l.city,
                    l.available_until,
                    l.status,
                    l.created_at,
                    u.full_name,
                    CASE
                        WHEN l.available_until <= NOW() THEN true
                        ELSE false
                    END AS is_expired
                FROM public.listings l
                INNER JOIN public.users u
                    ON u.user_id = l.donor_id
                ORDER BY l.created_at DESC, l.id DESC
                LIMIT 100;
            `
        );

        const listings = result.rows.map((listing) => ({
            ListingId: listing.id,
            DonorUserId: listing.donor_id,
            Title: listing.food_name,
            Description: listing.description,
            FoodType: listing.food_type,
            Quantity: Number(listing.quantity),
            Unit: listing.unit,
            City: listing.city,
            ExpiresAt: listing.available_until,
            Status: listing.status,
            CreatedAt: listing.created_at,
            UpdatedAt: listing.created_at,
            DonorName: listing.full_name,
            IsExpired: listing.is_expired,
        }));

        return res.status(200).json({
            message: "Admin listings retrieved successfully.",
            count: listings.length,
            listings,
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