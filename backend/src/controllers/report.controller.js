const pool = require("../config/db");

async function getPlatformReports(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM public.listings
                    ) AS total_listings,

                    (
                        SELECT COUNT(*)
                        FROM public.listings
                        WHERE status = 'available'
                    ) AS available_listings,

                    (
                        SELECT COUNT(*)
                        FROM public.listings
                        WHERE status = 'reserved'
                    ) AS reserved_listings,

                    (
                        SELECT COUNT(*)
                        FROM public.listings
                        WHERE status = 'completed'
                    ) AS completed_listings,

                    (
                        SELECT COUNT(*)
                        FROM public.requests
                    ) AS total_requests,

                    (
                        SELECT COUNT(*)
                        FROM public.users
                        WHERE role = 'ngo'
                            AND is_verified = false
                    ) AS pending_ngos;
            `
        );

        const report = result.rows[0];

        return res.status(200).json({
            reports: {
                totalListings: Number(
                    report.total_listings
                ),
                availableListings: Number(
                    report.available_listings
                ),
                reservedListings: Number(
                    report.reserved_listings
                ),
                completedListings: Number(
                    report.completed_listings
                ),
                totalRequests: Number(
                    report.total_requests
                ),
                pendingNgos: Number(
                    report.pending_ngos
                ),
            },
        });
    } catch (error) {
        console.error(
            "Get platform reports failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to load platform reports.",
        });
    }
}

module.exports = {
    getPlatformReports,
};