const express = require("express");

const {
    getPlatformReports,
} = require("../controllers/report.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

router.get(
    "/summary",
    authenticate,
    authorizeRoles("admin"),
    getPlatformReports
);

module.exports = router;