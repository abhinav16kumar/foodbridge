import {
  useCallback,
  useEffect,
  useState,
} from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function Notifications({
  accessToken,
}) {
  const [notifications, setNotifications] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] =
    useState(null);

  const loadNotifications = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/notifications`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal,
          }
        );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            `The server returned a non-JSON response (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        if (
          !Array.isArray(
            data.notifications
          )
        ) {
          throw new Error(
            "The server returned an unexpected notifications format."
          );
        }

        if (!signal?.aborted) {
          setNotifications(
            data.notifications
          );
        }
      } catch (err) {
        if (!signal?.aborted) {
          setError(
            err.message ||
              "Unable to connect to the server."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    const controller =
      new AbortController();

    loadNotifications(
      controller.signal
    );

    return () => controller.abort();
  }, [loadNotifications]);

  async function markAsRead(
    notificationId
  ) {
    setUpdatingId(notificationId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          `The server returned a non-JSON response (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to mark notification as read."
        );
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.NotificationId ===
          notificationId
            ? {
                ...notification,
                IsRead: true,
              }
            : notification
        )
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to update notification."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const unreadCount = notifications.filter(
    (notification) =>
      notification.IsRead === false ||
      notification.IsRead === 0
  ).length;

  return (
    <section
      className="dashboard-panel fb-section"
      id="notifications"
      aria-labelledby="notifications-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            STAY IN THE LOOP
          </span>

          <h2 id="notifications-title">
            Notifications
          </h2>

          <p className="fb-panel-description">
            {unreadCount === 0
              ? "You are all caught up."
              : `You have ${unreadCount} unread notification${
                  unreadCount === 1
                    ? ""
                    : "s"
                }.`}
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          disabled={
            loading || updatingId !== null
          }
          onClick={() =>
            loadNotifications()
          }
        >
          {loading
            ? "Loading..."
            : "Refresh notifications"}
        </button>
      </div>

      {error && (
        <p className="message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="loading-state" role="status">
          Loading notifications...
        </p>
      ) : notifications.length === 0 ? (
        !error && (
          <div className="empty-state">
            <span aria-hidden="true">🔔</span>
            <p>No notifications yet.</p>
            <small>
              Updates about your donations,
              requests, and deliveries will
              appear here.
            </small>
          </div>
        )
      ) : (
        <div className="dashboard-grid">
          {notifications.map(
            (notification) => {
              const isRead =
                notification.IsRead ===
                  true ||
                notification.IsRead === 1;
              const isUpdating =
                updatingId ===
                notification.NotificationId;

              return (
                <article
                  className={`feature-card fb-notification-card ${
                    isRead
                      ? "fb-notification-card--read"
                      : "fb-notification-card--unread"
                  }`}
                  key={
                    notification.NotificationId
                  }
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>
                        {
                          notification.Title
                        }
                      </h3>

                      <p className="fb-listing-meta">
                        {new Date(
                          notification.CreatedAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`fb-status ${
                        isRead
                          ? "fb-status--completed"
                          : "fb-status--pending"
                      }`}
                    >
                      {isRead
                        ? "Read"
                        : "Unread"}
                    </span>
                  </div>

                  <p className="fb-notification-message">
                    {
                      notification.Message
                    }
                  </p>

                  {!isRead && (
                    <div className="fb-request-actions">
                      <button
                        type="button"
                        disabled={
                          updatingId !== null
                        }
                        onClick={() =>
                          markAsRead(
                            notification.NotificationId
                          )
                        }
                      >
                        {isUpdating
                          ? "Marking..."
                          : "Mark as read"}
                      </button>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

