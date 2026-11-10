const express = require("express");

const {
    getPendingVolunteers,
    getVolunteers,
    setVolunteerApproval,
} = require("../controllers/volunteerApproval.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getVolunteers);
router.get("/pending", getPendingVolunteers);

router.patch("/:userId/approval", setVolunteerApproval);

module.exports = router;