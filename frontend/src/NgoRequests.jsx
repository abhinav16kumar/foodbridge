import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function RatingForm({
  assignmentId,
  accessToken,
  onSaved,
}) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    const score = Number(rating);

    if (
      !Number.isInteger(score) ||
      score < 1 ||
      score > 5
    ) {
      setError("Choose a rating from 1 to 5.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/assignments/${assignmentId}/rating`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            rating: score,
            comment: comment.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to submit the rating."
        );
      }

      if (!data.rating?.RatingId) {
        throw new Error(
          "The server did not confirm the saved rating. Refresh before retrying."
        );
      }

      onSaved(data.rating);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to confirm submission. Refresh before retrying."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="fb-rating-form"
      onSubmit={handleSubmit}
      aria-label={`Rate delivery ${assignmentId}`}
    >
      <div className="fb-rating-header">
        <span className="fb-panel-eyebrow">
          DELIVERY COMPLETE
        </span>

        <h4>Rate this delivery</h4>

        <p>
          Share how the volunteer delivery went.
          You can submit one rating for this
          delivery, and it cannot be edited through
          this form.
        </p>
      </div>

      <div className="fb-rating-options">
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            className={`fb-rating-option ${
              rating === String(value)
                ? "fb-rating-option--selected"
                : ""
            }`}
            htmlFor={`rating-${assignmentId}-${value}`}
          >
            <input
              id={`rating-${assignmentId}-${value}`}
              type="radio"
              name={`rating-${assignmentId}`}
              value={value}
              checked={rating === String(value)}
              onChange={(event) =>
                setRating(event.target.value)
              }
              disabled={submitting}
              required
            />

            <span aria-hidden="true">{value}</span>
            <small>
              {value === 1 && "Very poor"}
              {value === 2 && "Poor"}
              {value === 3 && "Okay"}
              {value === 4 && "Good"}
              {value === 5 && "Excellent"}
            </small>
          </label>
        ))}
      </div>

      <div className="form-group">
        <label
          htmlFor={`comment-${assignmentId}`}
        >
          Comment (optional)
        </label>

        <textarea
          id={`comment-${assignmentId}`}
          value={comment}
          onChange={(event) =>
            setComment(event.target.value)
          }
          maxLength={1000}
          rows={3}
          placeholder="Share anything helpful about the delivery experience."
          disabled={submitting}
        />

        <p className="fb-field-help">
          Maximum 1000 characters.
        </p>
      </div>

      <button type="submit" disabled={submitting}>
        {submitting
          ? "Submitting rating..."
          : "Submit rating"}
      </button>

      {error && (
        <p className="message" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function NgoRequests({
  accessToken,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadRequests() {
      setLoading(true);
      setError("");

      try {
        if (!accessToken) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(
          `${API_URL}/api/requests/ngo`,
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
              "Unable to load your requests."
          );
        }

        if (!Array.isArray(data.requests)) {
          throw new Error(
            "The server returned an unexpected requests format."
          );
        }

        if (!ignore) {
          setRequests(data.requests);
        }
      } catch (requestError) {
        if (
          !ignore &&
          requestError.name !== "AbortError"
        ) {
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

  function handleRatingSaved(
    assignmentId,
    savedRating
  ) {
    setRequests((previous) =>
      previous.map((request) =>
        request.AssignmentId === assignmentId
          ? {
              ...request,
              RatingId: savedRating.RatingId,
              Rating: savedRating.Rating,
              RatingComment: savedRating.Comment,
            }
          : request
      )
    );

    setMessage(
      "Volunteer rating submitted successfully."
    );
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

  function getRequestStage(request) {
    if (request.RatingId != null) {
      return "Rated";
    }

    if (
      request.AssignmentId != null &&
      request.AssignmentStatus === "delivered"
    ) {
      return "Ready to rate";
    }

    if (request.AssignmentId != null) {
      return "Delivery in progress";
    }

    if (request.Status === "accepted") {
      return "Accepted";
    }

    if (request.Status === "pending") {
      return "Awaiting donor response";
    }

    return request.Status || "Unknown";
  }

  return (
    <section
      className="dashboard-panel fb-section"
      id="ngo-requests"
      aria-labelledby="ngo-requests-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            YOUR REQUESTS & DELIVERIES
          </span>

          <h2 id="ngo-requests-title">
            My donation requests
          </h2>

          <p className="fb-panel-description">
            Follow each request from donor response
            through delivery, then rate the volunteer
            experience once the food has arrived.
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          disabled={loading}
          onClick={() => {
            setMessage("");
            setRefreshKey(
              (previous) => previous + 1
            );
          }}
        >
          {loading
            ? "Refreshing..."
            : "Refresh requests"}
        </button>
      </div>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <p className="loading-state" role="status">
          Loading your requests...
        </p>
      ) : error ? (
        <p className="message" role="alert">
          {error}
        </p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">🌱</span>
          <p>
            You have not requested any donations
            yet.
          </p>
          <small>
            Browse available food to submit your
            first request.
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
              const stage = getRequestStage(
                request
              );

              return (
                <article
                  className="feature-card fb-request-card"
                  key={request.RequestId}
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>{request.Title}</h3>

                      <p className="fb-listing-meta">
                        {request.DonorName} ·{" "}
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
                      {formatStatus(
                        request.Status
                      )}
                    </span>
                  </div>

                  <div className="fb-listing-facts">
                    <div>
                      <span className="fb-fact-label">
                        Quantity
                      </span>

                      <span className="fb-fact-value">
                        {request.Quantity}{" "}
                        {request.Unit || "items"}
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
                        Listing status
                      </span>

                      <span className="fb-fact-value">
                        {formatStatus(
                          request.ListingStatus
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="fb-request-progress">
                    <span className="fb-fact-label">
                      Current stage
                    </span>

                    <span className="fb-progress-value">
                      {stage}
                    </span>

                    <div
                      className="fb-progress-track"
                      aria-hidden="true"
                    >
                      <span
                        className={`fb-progress-step ${
                          request.Status ===
                          "pending"
                            ? "fb-progress-step--active"
                            : "fb-progress-step--done"
                        }`}
                      />

                      <span
                        className={`fb-progress-step ${
                          request.Status ===
                          "accepted"
                            ? "fb-progress-step--active"
                            : request.Status ===
                                "pending"
                              ? ""
                              : "fb-progress-step--done"
                        }`}
                      />

                      <span
                        className={`fb-progress-step ${
                          request.AssignmentId !=
                          null
                            ? request.AssignmentStatus ===
                              "delivered"
                              ? "fb-progress-step--done"
                              : "fb-progress-step--active"
                            : ""
                        }`}
                      />

                      <span
                        className={`fb-progress-step ${
                          request.RatingId != null
                            ? "fb-progress-step--done"
                            : ""
                        }`}
                      />
                    </div>

                    <div className="fb-progress-labels">
                      <span>Requested</span>
                      <span>Accepted</span>
                      <span>Delivery</span>
                      <span>Rated</span>
                    </div>
                  </div>

                  {request.Message && (
                    <div className="fb-request-message">
                      <span className="fb-fact-label">
                        Your request message
                      </span>

                      <p>{request.Message}</p>
                    </div>
                  )}

                  {request.AssignmentId != null && (
                    <div className="fb-delivery-details">
                      <div>
                        <span className="fb-fact-label">
                          Volunteer
                        </span>

                        <span className="fb-fact-value">
                          {request.VolunteerName ||
                            "Not provided"}
                        </span>
                      </div>

                      <div>
                        <span className="fb-fact-label">
                          Delivery status
                        </span>

                        <span className="fb-fact-value">
                          {formatStatus(
                            request.AssignmentStatus
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="fb-fact-label">
                          Assignment ID
                        </span>

                        <span className="fb-fact-value">
                          {request.AssignmentId}
                        </span>
                      </div>
                    </div>
                  )}

                  {request.RatingId != null ? (
                    <div className="fb-rating-complete">
                      <span className="fb-panel-eyebrow">
                        DELIVERY RATED
                      </span>

                      <h4>
                        Your delivery rating
                      </h4>

                      <p className="fb-rating-value">
                        {request.Rating} / 5
                      </p>

                      {request.RatingComment && (
                        <p>
                          “{request.RatingComment}”
                        </p>
                      )}

                      <small>
                        This delivery has already
                        been rated.
                      </small>
                    </div>
                  ) : request.AssignmentId != null &&
                    request.AssignmentStatus ===
                      "delivered" ? (
                    <RatingForm
                      key={request.AssignmentId}
                      assignmentId={
                        request.AssignmentId
                      }
                      accessToken={accessToken}
                      onSaved={(savedRating) =>
                        handleRatingSaved(
                          request.AssignmentId,
                          savedRating
                        )
                      }
                    />
                  ) : (
                    <p className="fb-action-note">
                      {stage ===
                      "Awaiting donor response"
                        ? "Waiting for the donor to respond to your request."
                        : stage === "Accepted"
                          ? "The donor accepted this request. A volunteer assignment will appear once arranged."
                          : stage ===
                            "Delivery in progress"
                            ? "A volunteer is handling this delivery."
                            : "No further action is required for this request."}
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