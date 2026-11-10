const express = require("express");

const {
    createListing,
    getAvailableListings,
    getMyListings,
    completeListing,
    getAdminListings,
} = require("../controllers/listing.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

// All listing endpoints require authentication.
router.use(authenticate);

// Admin: view listings across all statuses.
router.get(
    "/admin",
    authorizeRoles("admin"),
    getAdminListings
);

// Donor: view own listings.
router.get(
    "/mine",
    authorizeRoles("donor"),
    getMyListings
);

// Browse available donations.
router.get(
    "/",
    authorizeRoles("donor", "ngo", "admin"),
    getAvailableListings
);

// Donor: create a donation.
router.post(
    "/",
    authorizeRoles("donor"),
    createListing
);

// Donor: complete a reserved donation.
router.patch(
    "/:listingId/complete",
    authorizeRoles("donor"),
    completeListing
);

module.exports = router;