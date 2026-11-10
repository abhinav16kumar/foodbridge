const express = require("express");


const {
    getMyNotifications,
    markNotificationRead,
} = require("../controllers/notification.controller");


const { authenticate } = require("../middleware/auth");


const router = express.Router();


router.get("/", authenticate, getMyNotifications);


router.patch(
    "/:notificationId/read",
    authenticate,
    markNotificationRead
);


module.exports = router;