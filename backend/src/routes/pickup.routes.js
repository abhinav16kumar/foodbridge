const express = require("express");

const {
    getAvailablePickups,
    claimPickup,
    getMyAssignments,
    markPickupCollected,
    markPickupDelivered,
} = require("../controllers/pickup.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const {
    requireApprovedVolunteer,
} = require("../middleware/volunteerApproval");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("volunteer"));

// Volunteers can view the existing read-only panels.
router.get("/available", getAvailablePickups);
router.get("/my-assignments", getMyAssignments);

// Every pickup-changing action below requires approval.
router.use(requireApprovedVolunteer);

router.post("/:requestId/claim", claimPickup);

router.patch(
    "/:assignmentId/picked-up",
    markPickupCollected
);

router.patch(
    "/:assignmentId/delivered",
    markPickupDelivered
);

module.exports = router;