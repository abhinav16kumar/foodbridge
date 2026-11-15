const pool = require("../config/db");

async function createNotification(userId, title, message, type) {
    await pool.query(
        `
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type
            )
            VALUES (
                $1,
                $2,
                $3,
                $4
            );
        `, [userId, title, message, type]
    );
}

async function getMyNotifications(req, res) {
    try {
        const result = await pool.query(
            `
                SELECT
                    id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                FROM public.notifications
                WHERE user_id = $1
                ORDER BY created_at DESC;
            `, [req.user.userId]
        );

        const notifications = result.rows.map((notification) => ({
            NotificationId: notification.id,
            Title: notification.title,
            Message: notification.message,
            Type: notification.type,
            IsRead: notification.is_read,
            CreatedAt: notification.created_at,
        }));

        const unreadCount = notifications.filter(
            (notification) => notification.IsRead === false
        ).length;

        return res.status(200).json({
            message: "Notifications retrieved successfully.",
            unreadCount,
            notifications,
        });
    } catch (error) {
        console.error(
            "Get notifications failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to load notifications.",
        });
    }
}

async function markNotificationRead(req, res) {
    const notificationId = Number(req.params.notificationId);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
            message: "Invalid notification ID.",
        });
    }

    try {
        const result = await pool.query(
            `
                UPDATE public.notifications
                SET is_read = true
                WHERE id = $1
                    AND user_id = $2
                RETURNING id;
            `, [notificationId, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Notification not found.",
            });
        }

        return res.status(200).json({
            message: "Notification marked as read.",
        });
    } catch (error) {
        console.error(
            "Mark notification read failed:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to update notification.",
        });
    }
}

module.exports = {
    createNotification,
    getMyNotifications,
    markNotificationRead,
};