require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");
const requestRoutes = require("./routes/request.routes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/report.routes");
const pickupRoutes = require("./routes/pickup.routes");
const app = express();
const volunteerRatingRoutes = require("./routes/volunteerRating.routes");
const volunteerApprovalRoutes = require(
    "./routes/volunteerApproval.routes"
);
// Apply middleware before registering routes.
app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(
    "/api/admin/volunteers",
    volunteerApprovalRoutes
);
app.use(
    "/api",
    volunteerRatingRoutes
);
app.get("/", (req, res) => {
    res.json({
        message: "FoodBridge backend is running",
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "FoodBridge API",
    });
});

// Register each route once.
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/pickups", pickupRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `FoodBridge backend running on http://localhost:${PORT}`
    );
});