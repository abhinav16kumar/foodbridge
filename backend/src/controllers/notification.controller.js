const { sql, getPool } = require("../config/db");


async function createNotification(userId, title, message, type) {
    const pool = await getPool();


    await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("Title", sql.NVarChar(150), title)
        .input("Message", sql.NVarChar(500), message)
        .input("Type", sql.NVarChar(50), type)
        .query(`
      INSERT INTO dbo.Notifications
        (UserId, Title, Message, Type)
      VALUES
        (@UserId, @Title, @Message, @Type);
    `);
}


async function getMyNotifications(req, res) {
    try {
        const userId = req.user.userId;
        const pool = await getPool();


        const result = await pool
            .request()
            .input("UserId", sql.Int, userId)
            .query(`
        SELECT
          NotificationId,
          Title,
          Message,
          Type,
          IsRead,
          CreatedAt
        FROM dbo.Notifications
        WHERE UserId = @UserId
        ORDER BY CreatedAt DESC;
      `);


        const notifications = result.recordset;
        const unreadCount = notifications.filter((n) => n.IsRead === 0).length;


        return res.status(200).json({
            message: "Notifications retrieved successfully.",
            unreadCount,
            notifications,
        });
    } catch (error) {
        console.error("Get notifications failed:", error.message);


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
        const pool = await getPool();


        const result = await pool
            .request()
            .input("NotificationId", sql.Int, notificationId)
            .input("UserId", sql.Int, req.user.userId)
            .query(`
        UPDATE dbo.Notifications
        SET IsRead = 1
        OUTPUT INSERTED.NotificationId
        WHERE NotificationId = @NotificationId
          AND UserId = @UserId;
      `);


        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: "Notification not found.",
            });
        }


        return res.status(200).json({
            message: "Notification marked as read.",
        });
    } catch (error) {
        console.error("Mark notification read failed:", error.message);


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