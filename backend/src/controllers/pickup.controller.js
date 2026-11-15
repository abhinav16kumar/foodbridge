const pool = require("../config/db");

async function getAvailablePickups(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    r.id,
                    l.id AS listing_id,
                    l.food_name,
                    l.food_type,
                    l.quantity,
                    l.unit,
                    l.city,
                    l.available_until,
                    l.storage_conditions,
                    l.allergen_info,
                    donor.full_name AS donor_name,
                    ngo.full_name AS ngo_name
                FROM public.requests r
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                INNER JOIN public.users donor
                    ON donor.user_id = l.donor_id
                INNER JOIN public.users ngo
                    ON ngo.user_id = r.ngo_id
                WHERE r.status = 'accepted'
                    AND l.status = 'reserved'
                    AND l.available_until > NOW()
                    AND NULLIF(BTRIM(r.delivery_address), '') IS NOT NULL
                    AND donor.is_active = true
                    AND ngo.is_active = true
                    AND ngo.is_verified = true
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.pickups p
                        WHERE p.request_id = r.id
                    )
                ORDER BY
                    l.available_until ASC,
                    r.id ASC
                LIMIT 100;
            `
        );

        const pickups = result.rows.map((pickup) => ({
            RequestId: pickup.id,
            ListingId: pickup.listing_id,
            Title: pickup.food_name,
            FoodType: pickup.food_type,
            Quantity: Number(pickup.quantity),
            Unit: pickup.unit,
            City: pickup.city,
            ExpiresAt: pickup.available_until,
            StorageConditions: pickup.storage_conditions,
            AllergenInfo: pickup.allergen_info,
            DonorName: pickup.donor_name,
            NgoName: pickup.ngo_name,
        }));

        return res.status(200).json({
            message: "Available pickups retrieved successfully.",
            count: pickups.length,
            pickups,
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

    if (!Number.isSafeInteger(requestId) ||
        requestId > 2147483647
    ) {
        return res.status(400).json({
            message: "Invalid request ID.",
        });
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const requestResult = await client.query(
            `
                SELECT
                    r.id,
                    r.ngo_id,
                    l.id AS listing_id,
                    l.donor_id,
                    l.status AS listing_status,
                    l.available_until,
                    r.delivery_address,
                    donor.is_active AS donor_is_active,
                    ngo.is_active AS ngo_is_active,
                    ngo.is_verified AS ngo_is_verified
                FROM public.requests r
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                INNER JOIN public.users donor
                    ON donor.user_id = l.donor_id
                INNER JOIN public.users ngo
                    ON ngo.user_id = r.ngo_id
                WHERE r.id = $1
                FOR UPDATE OF r, l;
            `, [requestId]
        );

        const request = requestResult.rows[0];

        const isEligible =
            request &&
            request.status === "accepted" &&
            request.listing_status === "reserved" &&
            request.available_until != null &&
            new Date(
                request.available_until
            ).getTime() > Date.now() &&
            request.delivery_address != null &&
            request.delivery_address.trim() !== "" &&
            request.donor_is_active === true &&
            request.ngo_is_active === true &&
            request.ngo_is_verified === true;

        if (!isEligible) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This donation is no longer eligible for pickup. Refresh the list.",
            });
        }

        const existingResult = await client.query(
            `
                SELECT
                    id
                FROM public.pickups
                WHERE request_id = $1;
            `, [requestId]
        );

        if (existingResult.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This pickup has already been claimed. Refresh the list.",
            });
        }

        const insertResult = await client.query(
            `
                INSERT INTO public.pickups (
                    request_id,
                    volunteer_id,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    'assigned'
                )
                RETURNING
                    id,
                    request_id,
                    volunteer_id,
                    status,
                    created_at;
            `, [requestId, req.user.userId]
        );

        await client.query("COMMIT");

        const pickup = insertResult.rows[0];

        return res.status(201).json({
            message: "Pickup claimed successfully.",
            assignment: {
                AssignmentId: pickup.id,
                RequestId: pickup.request_id,
                ListingId: request.listing_id,
                VolunteerUserId: pickup.volunteer_id,
                Status: pickup.status,
                AssignedAt: pickup.created_at,
            },
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Claim pickup rollback failed:",
                    rollbackError.message
                );
            }
        }

        if (error && error.code === "23505") {
            return res.status(409).json({
                message: "This pickup has already been claimed.",
            });
        }

        console.error(
            "Claim pickup failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to confirm the claim. Refresh My assignments before trying again.",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function getMyAssignments(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    p.id,
                    p.request_id,
                    r.listing_id,
                    p.status,
                    p.created_at,
                    p.picked_up_at,
                    l.food_name,
                    l.food_type,
                    l.quantity,
                    l.unit,
                    l.city,
                    l.available_until,
                    l.storage_conditions,
                    l.allergen_info,
                    r.delivery_address,
                    donor.full_name AS donor_name,
                    ngo.full_name AS ngo_name
                FROM public.pickups p
                INNER JOIN public.requests r
                    ON r.id = p.request_id
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                INNER JOIN public.users donor
                    ON donor.user_id = l.donor_id
                INNER JOIN public.users ngo
                    ON ngo.user_id = r.ngo_id
                WHERE p.volunteer_id = $1
                ORDER BY p.created_at DESC, p.id DESC
                LIMIT 100;
            `, [req.user.userId]
        );

        const assignments = result.rows.map((assignment) => ({
            AssignmentId: assignment.id,
            RequestId: assignment.request_id,
            ListingId: assignment.listing_id,
            Status: assignment.status,
            AssignedAt: assignment.created_at,
            PickedUpAt: assignment.picked_up_at,
            DeliveredAt: null,
            Title: assignment.food_name,
            FoodType: assignment.food_type,
            Quantity: Number(assignment.quantity),
            Unit: assignment.unit,
            City: assignment.city,
            ExpiresAt: assignment.available_until,
            StorageConditions: assignment.storage_conditions,
            AllergenInfo: assignment.allergen_info,
            DeliveryAddress: assignment.delivery_address,
            DonorName: assignment.donor_name,
            NgoName: assignment.ngo_name,
        }));

        return res.status(200).json({
            message: "Your assignments retrieved successfully.",
            count: assignments.length,
            assignments,
        });
    } catch (error) {
        console.error(
            "Get my assignments failed:",
            error.message
        );

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
        const result = await pool.query(
            `
                UPDATE public.pickups
                SET
                    status = 'picked_up',
                    picked_up_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                    AND volunteer_id = $2
                    AND status = 'assigned'
                RETURNING
                    id,
                    request_id,
                    volunteer_id,
                    status,
                    created_at,
                    picked_up_at;
            `, [assignmentId, req.user.userId]
        );

        const pickup = result.rows[0];

        if (!pickup) {
            return res.status(409).json({
                message: "This assignment cannot be marked as picked up. It may not belong to you, may no longer exist, or may already have progressed. Refresh your assignments.",
            });
        }

        return res.status(200).json({
            message: "Food marked as picked up successfully.",
            assignment: {
                AssignmentId: pickup.id,
                RequestId: pickup.request_id,
                VolunteerUserId: pickup.volunteer_id,
                Status: pickup.status,
                AssignedAt: pickup.created_at,
                PickedUpAt: pickup.picked_up_at,
                DeliveredAt: null,
                UpdatedAt: pickup.picked_up_at,
            },
        });
    } catch (error) {
        console.error(
            "Mark pickup collected failed:",
            error.message
        );

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

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const assignmentResult = await client.query(
            `
                SELECT
                    p.id,
                    p.request_id,
                    p.status AS pickup_status,
                    r.status AS request_status,
                    l.id AS listing_id,
                    l.status AS listing_status
                FROM public.pickups p
                INNER JOIN public.requests r
                    ON r.id = p.request_id
                INNER JOIN public.listings l
                    ON l.id = r.listing_id
                WHERE p.id = $1
                    AND p.volunteer_id = $2
                FOR UPDATE OF p, r, l;
            `, [assignmentId, req.user.userId]
        );

        const assignment = assignmentResult.rows[0];

        if (!assignment) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Assignment not found for this volunteer.",
            });
        }

        const isValidState =
            assignment.pickup_status === "picked_up" &&
            assignment.request_status === "accepted" &&
            assignment.listing_status === "reserved";

        if (!isValidState) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This assignment cannot be completed in its current state. Refresh your assignments. It must be picked up, with an accepted request and reserved listing.",
            });
        }

        const deliveredAt = new Date();

        await client.query(
            `
                UPDATE public.pickups
                SET
                    status = 'delivered',
                    updated_at = $1
                WHERE id = $2;
            `, [deliveredAt, assignmentId]
        );

        await client.query(
            `
                UPDATE public.requests
                SET
                    status = 'completed',
                    updated_at = $1
                WHERE id = $2;
            `, [deliveredAt, assignment.request_id]
        );

        await client.query(
            `
                UPDATE public.listings
                SET
                    status = 'completed'
                WHERE id = $1;
            `, [assignment.listing_id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Delivery confirmed successfully.",
            assignment: {
                AssignmentId: assignment.id,
                RequestId: assignment.request_id,
                ListingId: assignment.listing_id,
                Status: "delivered",
                DeliveredAt: deliveredAt.toISOString(),
            },
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Mark pickup delivered rollback failed:",
                    rollbackError.message
                );
            }
        }

        console.error(
            "Mark pickup delivered failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to confirm delivery. Refresh your assignments before trying again.",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}

module.exports = {
    getAvailablePickups,
    claimPickup,
    getMyAssignments,
    markPickupCollected,
    markPickupDelivered,
};