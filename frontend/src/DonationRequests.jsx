import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'https://foodbridge1-7x4q.onrender.com';

function DonationRequests({ accessToken, onUpdated }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadRequests() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/requests/donor`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load donation requests."
          );
        }

        if (!ignore) {
          setRequests(data.requests || []);
        }
      } catch (requestError) {
        if (!ignore && requestError.name !== "AbortError") {
          setError(
            requestError.message ||
              "Unable to connect to the server."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [accessToken, refreshKey]);

  async function updateStatus(requestId, status) {
    setUpdatingId(requestId);
    setFeedback((previous) => ({
      ...previous,
      [requestId]: null,
    }));

    try {
      const response = await fetch(
        `${API_URL}/api/requests/${requestId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update the request."
        );
      }

      setRequests((previous) =>
        previous.map((request) =>
          request.RequestId === requestId
            ? { ...request, Status: status }
            : request
        )
      );

      setFeedback((previous) => ({
        ...previous,
        [requestId]: {
          success: true,
          message: data.message,
        },
      }));

      if (onUpdated) {
        onUpdated();
      }
    } catch (updateError) {
      setFeedback((previous) => ({
        ...previous,
        [requestId]: {
          success: false,
          message:
            updateError.message ||
            "Unable to connect to the server.",
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function completeDonation(request) {
    setUpdatingId(request.RequestId);
    setFeedback((previous) => ({
      ...previous,
      [request.RequestId]: null,
    }));

    try {
      const response = await fetch(
        `${API_URL}/api/listings/${request.ListingId}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to mark the donation as completed."
        );
      }

      setRequests((previous) =>
        previous.map((item) =>
          item.RequestId === request.RequestId
            ? { ...item, Status: "completed" }
            : item
        )
      );

      setFeedback((previous) => ({
        ...previous,
        [request.RequestId]: {
          success: true,
          message: data.message,
        },
      }));

      if (onUpdated) {
        onUpdated();
      }
    } catch (completeError) {
      setFeedback((previous) => ({
        ...previous,
        [request.RequestId]: {
          success: false,
          message:
            completeError.message ||
            "Unable to connect to the server.",
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    );
  }

  return (
    <section
      className="dashboard-panel fb-section"
      id="donation-requests"
      aria-labelledby="donation-requests-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            REQUESTS FROM THE COMMUNITY
          </span>

          <h2 id="donation-requests-title">
            Donation requests
          </h2>

          <p className="fb-panel-description">
            Review requests, respond promptly, and
            complete donations once they have been
            handed over.
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          disabled={loading}
          onClick={() =>
            setRefreshKey((previous) => previous + 1)
          }
        >
          {loading ? "Refreshing..." : "Refresh requests"}
        </button>
      </div>

      {loading ? (
        <p className="loading-state" role="status">
          Loading donation requests...
        </p>
      ) : error ? (
        <p className="message" role="alert">
          {error}
        </p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">🤝</span>
          <p>
            You have not received any donation
            requests yet.
          </p>
          <small>
            When an NGO requests one of your listings,
            it will appear here.
          </small>
        </div>
      ) : (
        <>
          <p className="fb-count-note">
            You have {requests.length} request
            {requests.length === 1 ? "" : "s"}.
          </p>

          <div className="dashboard-grid">
            {requests.map((request) => {
              const isUpdating =
                updatingId === request.RequestId;
              const requestFeedback =
                feedback[request.RequestId];

              return (
                <article
                  className="feature-card fb-request-card"
                  key={request.RequestId}
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>{request.Title}</h3>

                      <p className="fb-listing-meta">
                        {request.NgoName} ·{" "}
                        {request.City}
                      </p>
                    </div>

                    <span
                      className={`fb-status fb-status--${String(
                        request.Status || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {formatStatus(request.Status)}
                    </span>
                  </div>

                  <div className="fb-listing-facts">
                    <div>
                      <span className="fb-fact-label">
                        Requested quantity
                      </span>

                      <span className="fb-fact-value">
                        {request.Quantity} items
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Food type
                      </span>

                      <span className="fb-fact-value">
                        {request.FoodType}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        City
                      </span>

                      <span className="fb-fact-value">
                        {request.City}
                      </span>
                    </div>
                  </div>

                  {request.Message && (
                    <div className="fb-request-message">
                      <span className="fb-fact-label">
                        Message from NGO
                      </span>

                      <p>{request.Message}</p>
                    </div>
                  )}

                  <div className="fb-request-actions">
                    {request.Status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={updatingId !== null}
                          onClick={() =>
                            updateStatus(
                              request.RequestId,
                              "accepted"
                            )
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Accept request"}
                        </button>

                        <button
                          className="fb-danger-action"
                          type="button"
                          disabled={updatingId !== null}
                          onClick={() =>
                            updateStatus(
                              request.RequestId,
                              "declined"
                            )
                          }
                        >
                          Decline request
                        </button>
                      </>
                    )}

                    {request.Status === "accepted" && (
                      <button
                        type="button"
                        disabled={updatingId !== null}
                        onClick={() =>
                          completeDonation(request)
                        }
                      >
                        {isUpdating
                          ? "Completing..."
                          : "Mark donation as completed"}
                      </button>
                    )}

                    {request.Status !== "pending" &&
                      request.Status !== "accepted" && (
                        <p className="fb-action-note">
                          No further action is required
                          from you for this request.
                        </p>
                      )}
                  </div>

                  {requestFeedback && (
                    <p
                      className={`message ${
                        requestFeedback.success
                          ? ""
                          : "fb-message-error"
                      }`}
                      role={
                        requestFeedback.success
                          ? "status"
                          : "alert"
                      }
                    >
                      {requestFeedback.message}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default DonationRequests;
