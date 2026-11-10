const express = require("express");

const {
    register,
    login,
} = require("../controllers/auth.controller");


const {
    setUserVerification,
    getPendingNgos,
} = require("../controllers/user.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Available to any authenticated, active account
router.get("/me", authenticate, (req, res) => {
    res.status(200).json({
        message: "Profile retrieved successfully.",
        user: req.user,
    });
});

// Temporary routes for testing role permissions
router.get(
    "/donor-test",
    authenticate,
    authorizeRoles("donor"),
    (req, res) => {
        res.status(200).json({
            message: "Donor access granted.",
            user: req.user,
        });
    }
);

router.get(
    "/ngo-test",
    authenticate,
    authorizeRoles("ngo"),
    (req, res) => {
        res.status(200).json({
            message: "NGO access granted.",
            user: req.user,
        });
    }
);

router.get(
    "/volunteer-test",
    authenticate,
    authorizeRoles("volunteer"),
    (req, res) => {
        res.status(200).json({
            message: "Volunteer access granted.",
            user: req.user,
        });
    }
);

router.get(
    "/admin-test",
    authenticate,
    authorizeRoles("admin"),
    (req, res) => {
        res.status(200).json({
            message: "Administrator access granted.",
            user: req.user,
        });
    }
);
// Admin: view NGOs awaiting verification
router.get(
    "/users/ngos/pending",
    authenticate,
    authorizeRoles("admin"),
    getPendingNgos
);


// Admin: approve or revoke NGO verification
router.patch(
    "/users/:userId/verification",
    authenticate,
    authorizeRoles("admin"),
    setUserVerification
);
module.exports = router;