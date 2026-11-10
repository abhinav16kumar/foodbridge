const express = require("express");

const {
    createVolunteerRating,
    getVolunteerRatingSummary,
} = require("../controllers/volunteerRating.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

// Authenticate only requests matching this endpoint.
router.get(
    "/volunteers/:volunteerId/rating-summary",
    authenticate,
    getVolunteerRatingSummary
);

// Authenticate and authorize only this rating endpoint.
router.post(
    "/assignments/:assignmentId/rating",
    authenticate,
    authorizeRoles("ngo"),
    createVolunteerRating
);

module.exports = router;