const { getPool } = require("../config/db");

async function getPlatformReports(req, res) {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM dbo.FoodListings
        ) AS totalListings,

        (
          SELECT COUNT(*)
          FROM dbo.FoodListings
          WHERE Status = 'available'
        ) AS availableListings,

        (
          SELECT COUNT(*)
          FROM dbo.FoodListings
          WHERE Status = 'reserved'
        ) AS reservedListings,

        (
          SELECT COUNT(*)
          FROM dbo.FoodListings
          WHERE Status = 'completed'
        ) AS completedListings,

        (
          SELECT COUNT(*)
          FROM dbo.DonationRequests
        ) AS totalRequests,

        (
          SELECT COUNT(*)
          FROM dbo.Users
          WHERE Role = 'ngo'
            AND IsVerified = 0
        ) AS pendingNgos;
    `);

        return res.status(200).json({
            reports: result.recordset[0],
        });
    } catch (error) {
        console.error("Get platform reports failed:", error.message);

        return res.status(500).json({
            message: "Unable to load platform reports.",
        });
    }
}

module.exports = {
    getPlatformReports,
};