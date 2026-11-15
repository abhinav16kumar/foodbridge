const pool = require("../config/db");
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
    let client;

    try {
        client = await pool.connect();

        const ngoResult = await client.query(
            `
                SELECT
                    is_verified
                FROM public.users
                WHERE user_id = $1
                    AND role = 'ngo';
            `, [ngoUserId]
        );

        const ngo = ngoResult.rows[0];

        if (!ngo) {
            return res.status(404).json({
                message: "NGO account not found.",
            });
        }

        if (ngo.is_verified !== true) {
            return res.status(403).json({
                message: "Your NGO account must be verified before submitting donation requests.",
            });
        }

        await client.query("BEGIN");

        const listingResult = await client.query(
            `
                SELECT
                    id,
                    donor_id,
                    status,
                    available_until
                FROM public.listings
                WHERE id = $1
                FOR UPDATE;
            `, [listingId]
        );

        const listing = listingResult.rows[0];

        if (!listing) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Donation listing not found.",
            });
        }

        if (listing.donor_id === ngoUserId) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "You cannot request your own donation.",
            });
        }

        const isUnexpired =
            listing.available_until != null &&
            new Date(listing.available_until).getTime() > Date.now();

        if (listing.status !== "available" || !isUnexpired) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This donation is no longer available.",
            });
        }

        const existingResult = await client.query(
            `
                SELECT
                    id
                FROM public.requests
                WHERE listing_id = $1
                    AND ngo_id = $2;
            `, [listingId, ngoUserId]
        );

        if (existingResult.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "You have already requested this donation.",
            });
        }

        const result = await client.query(
            `
                INSERT INTO public.requests (
                    listing_id,
                    ngo_id,
                    message,
                    delivery_address,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    'pending'
                )
                RETURNING
                    id,
                    listing_id,
                    ngo_id,
                    message,
                    delivery_address,
                    status,
                    created_at;
            `, [
                listingId,
                ngoUserId,
                typeof message === "string" ?
                message.trim() || null :
                null,
                deliveryAddress.trim(),
            ]
        );

        await client.query("COMMIT");

        const request = result.rows[0];

        try {
            await createNotification(
                listing.donor_id,
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
            request: {
                RequestId: request.id,
                ListingId: request.listing_id,
                NgoUserId: request.ngo_id,
                Message: request.message,
                DeliveryAddress: request.delivery_address,
                Status: request.status,
                CreatedAt: request.created_at,
            },
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Request transaction rollback failed:",
                    rollbackError.message
                );
            }
        }

        if (error && error.code === "23505") {
            return res.status(409).json({
                message: "You have already requested this donation.",
            });
        }

        console.error(
            "Create donation request failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to submit donation request. Please try again later.",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function getDonorRequests(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    r.id,
                    r.listing_id,
                    r.ngo_id,
                    r.message,
                    r.delivery_address,
                    r.status,
                    r.created_at,
                    r.updated_at,
                    l.food_name,
                    l.quantity,
                    l.food_type,
                    l.city,
                    u.full_name
                FROM public.requests r
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                INNER JOIN public.users u
                    ON u.user_id = r.ngo_id
                WHERE l.donor_id = $1
                ORDER BY r.created_at DESC;
            `, [req.user.userId]
        );

        const requests = result.rows.map((request) => ({
            RequestId: request.id,
            ListingId: request.listing_id,
            NgoUserId: request.ngo_id,
            Message: request.message,
            DeliveryAddress: request.delivery_address,
            Status: request.status,
            CreatedAt: request.created_at,
            UpdatedAt: request.updated_at,
            Title: request.food_name,
            Quantity: Number(request.quantity),
            FoodType: request.food_type,
            City: request.city,
            NgoName: request.full_name,
        }));

        return res.json({
            requests,
        });
    } catch (error) {
        console.error(
            "Get donor requests failed:",
            error.message
        );

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
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const ownershipResult = await client.query(
            `
                SELECT
                    r.id,
                    r.ngo_id,
                    r.status,
                    l.id AS listing_id,
                    l.status AS listing_status
                FROM public.requests r
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                WHERE r.id = $1
                    AND l.donor_id = $2
                FOR UPDATE OF r, l;
            `, [requestId, donorUserId]
        );

        const request = ownershipResult.rows[0];

        if (!request) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Donation request not found for this donor.",
            });
        }

        if (request.status !== "pending") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This request has already been responded to.",
            });
        }

        await client.query(
            `
                UPDATE public.requests
                SET status = $1,
                    updated_at = NOW()
                WHERE id = $2;
            `, [status, requestId]
        );

        if (status === "accepted") {
            await client.query(
                `
                    UPDATE public.listings
                    SET status = 'reserved'
                    WHERE id = $1;
                `, [request.listing_id]
            );
        }

        await client.query("COMMIT");

        try {
            await createNotification(
                request.ngo_id,
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
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Request status rollback failed:",
                    rollbackError.message
                );
            }
        }

        console.error(
            "Update request status failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to update donation request.",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function getNgoRequests(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    r.id,
                    r.listing_id,
                    r.message,
                    r.delivery_address,
                    r.status,
                    r.created_at,
                    r.updated_at,
                    l.food_name,
                    l.quantity,
                    l.unit,
                    l.food_type,
                    l.city,
                    l.status AS listing_status,
                    donor.full_name,
                    p.id AS pickup_id,
                    p.status AS pickup_status,
                    p.created_at AS pickup_created_at,
                    volunteer.full_name AS volunteer_name
                FROM public.requests r
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                INNER JOIN public.users donor
                    ON donor.user_id = l.donor_id
                LEFT JOIN public.pickups p
                    ON p.request_id = r.id
                LEFT JOIN public.users volunteer
                    ON volunteer.user_id = p.volunteer_id
                WHERE r.ngo_id = $1
                ORDER BY r.created_at DESC, r.id DESC;
            `, [req.user.userId]
        );

        const requests = result.rows.map((request) => ({
            RequestId: request.id,
            ListingId: request.listing_id,
            Message: request.message,
            DeliveryAddress: request.delivery_address,
            Status: request.status,
            CreatedAt: request.created_at,
            UpdatedAt: request.updated_at,
            Title: request.food_name,
            Quantity: Number(request.quantity),
            Unit: request.unit,
            FoodType: request.food_type,
            City: request.city,
            ListingStatus: request.listing_status,
            DonorName: request.full_name,
            AssignmentId: request.pickup_id,
            AssignmentStatus: request.pickup_status,
            DeliveredAt: request.pickup_created_at,
            VolunteerName: request.volunteer_name,
            RatingId: null,
            Rating: null,
            RatingComment: null,
        }));

        return res.status(200).json({
            requests,
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