import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

async function pickupRequest(
  path,
  accessToken,
  options = {}
) {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is not configured in the frontend."
    );
  }

  if (!accessToken) {
    throw new Error("Please log in again.");
  }

  const response = await fetch(
    `${API_URL}/api/pickups${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `The server returned a non-JSON response (HTTP ${response.status}). Check that the backend route exists.`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleString();
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase().replace(/_/g, " ")
  );
}

export default function AvailablePickups({
  accessToken,
  isApproved = false,
}) {
  const [pickups, setPickups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [claimingId, setClaimingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const busy =
    loading ||
    claimingId !== null ||
    updatingId !== null;

  const actionDisabled = busy || !isApproved;

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [availableData, assignmentData] =
          await Promise.all([
            pickupRequest("/available", accessToken, {
              signal: controller.signal,
            }),
            pickupRequest(
              "/my-assignments",
              accessToken,
              {
                signal: controller.signal,
              }
            ),
          ]);

        if (
          !Array.isArray(availableData.pickups) ||
          !Array.isArray(
            assignmentData.assignments
          )
        ) {
          throw new Error(
            "The server returned an unexpected pickups or assignments format."
          );
        }

        if (!ignore) {
          setPickups(availableData.pickups);
          setAssignments(
            assignmentData.assignments
          );
        }
      } catch (error) {
        if (
          !ignore &&
          error.name !== "AbortError"
        ) {
          setErrorMessage(
            error.message ||
              "Unable to load pickup information."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [accessToken, refreshKey]);

  async function handleClaim(pickup) {
    if (busy || !isApproved) return;

    const confirmed = window.confirm(
      `Claim "${pickup.Title}"? Only confirm if you can complete this pickup.`
    );

    if (!confirmed) return;

    setClaimingId(pickup.RequestId);
    setActionMessage("");

    try {
      const data = await pickupRequest(
        `/${pickup.RequestId}/claim`,
        accessToken,
        { method: "POST" }
      );

      setActionMessage(data.message);
    } catch (error) {
      setActionMessage(
        `${error.message} Check My assignments before retrying.`
      );
    } finally {
      setClaimingId(null);
      setRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  async function handleMarkPickedUp(
    assignment
  ) {
    if (busy || !isApproved) return;

    const confirmed = window.confirm(
      `Confirm you have collected "${assignment.Title}" from the donor?`
    );

    if (!confirmed) return;

    setUpdatingId(assignment.AssignmentId);
    setActionMessage("");

    try {
      const data = await pickupRequest(
        `/${assignment.AssignmentId}/picked-up`,
        accessToken,
        { method: "PATCH" }
      );

      setActionMessage(data.message);
    } catch (error) {
      setActionMessage(
        `${error.message} Check the assignment status before retrying.`
      );
    } finally {
      setUpdatingId(null);
      setRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  async function handleMarkDelivered(
    assignment
  ) {
    if (busy || !isApproved) return;

    const confirmed = window.confirm(
      `Confirm you have delivered "${assignment.Title}" to the receiving NGO? This will complete the donation.`
    );

    if (!confirmed) return;

    setUpdatingId(assignment.AssignmentId);
    setActionMessage("");

    try {
      const data = await pickupRequest(
        `/${assignment.AssignmentId}/delivered`,
        accessToken,
        { method: "PATCH" }
      );

      setActionMessage(data.message);
    } catch (error) {
      setActionMessage(
        `${error.message} Check the assignment status before retrying.`
      );
    } finally {
      setUpdatingId(null);
      setRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  return (
    <>
      {!isApproved && (
        <p className="message" role="status">
          Your volunteer account is awaiting admin
          approval. You can view pickups, but you
          cannot claim, collect, or complete them
          until approved.
        </p>
      )}

      {actionMessage && (
        <p className="message" role="status">
          {actionMessage}
        </p>
      )}

      <section
        className="dashboard-panel fb-section"
        id="volunteer-pickups"
        aria-labelledby="volunteer-pickups-title"
      >
        <div className="listings-heading">
          <div>
            <span className="fb-panel-eyebrow">
              READY FOR A NEW JOURNEY
            </span>

            <h2 id="volunteer-pickups-title">
              Available pickups
            </h2>

            <p className="fb-panel-description">
              Accepted donations are waiting for a
              volunteer to claim and deliver them to
              a receiving organization.
            </p>
          </div>

          <button
            className="secondary-action"
            type="button"
            disabled={busy || !isApproved}
            onClick={() =>
              setRefreshKey(
                (previous) => previous + 1
              )
            }
          >
            {loading
              ? "Refreshing..."
              : "Refresh pickups"}
          </button>
        </div>

        {loading ? (
          <p className="loading-state" role="status">
            Loading pickups and assignments...
          </p>
        ) : errorMessage ? (
          <p className="message" role="alert">
            {errorMessage}
          </p>
        ) : pickups.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">🚚</span>
            <p>
              No eligible pickups are available
              right now.
            </p>
            <small>
              Check again later for new donation
              journeys.
            </small>
          </div>
        ) : (
          <>
            <p className="fb-count-note">
              Showing {pickups.length} available
              pickup
              {pickups.length === 1 ? "" : "s"}.
            </p>

            <div className="dashboard-grid">
              {pickups.map((pickup) => (
                <article
                  className="feature-card fb-listing-card"
                  key={pickup.RequestId}
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>
                        {pickup.Title}
                      </h3>

                      <p className="fb-listing-meta">
                        {pickup.FoodType} ·{" "}
                        {pickup.City}
                      </p>
                    </div>

                    <span className="fb-status fb-status--available">
                      Available
                    </span>
                  </div>

                  <div className="fb-listing-facts">
                    <div>
                      <span className="fb-fact-label">
                        Quantity
                      </span>

                      <span className="fb-fact-value">
                        {pickup.Quantity}{" "}
                        {pickup.Unit}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Expires
                      </span>

                      <span className="fb-fact-value">
                        {formatDate(
                          pickup.ExpiresAt
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Pickup city
                      </span>

                      <span className="fb-fact-value">
                        {pickup.City}
                      </span>
                    </div>
                  </div>

                  <div className="fb-pickup-route">
                    <div>
                      <span className="fb-fact-label">
                        From donor
                      </span>

                      <span className="fb-fact-value">
                        {pickup.DonorName}
                      </span>
                    </div>

                    <span
                      className="fb-route-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>

                    <div>
                      <span className="fb-fact-label">
                        To organization
                      </span>

                      <span className="fb-fact-value">
                        {pickup.NgoName}
                      </span>
                    </div>
                  </div>

                  <div className="fb-listing-details">
                    <p>
                      <strong>
                        Storage:
                      </strong>{" "}
                      {pickup.StorageConditions ||
                        "Not provided"}
                    </p>

                    <p>
                      <strong>
                        Allergens:
                      </strong>{" "}
                      {pickup.AllergenInfo ||
                        "Not provided"}
                    </p>
                  </div>

                  <div className="fb-request-actions">
                    <button
                      type="button"
                      disabled={actionDisabled}
                      onClick={() =>
                        handleClaim(pickup)
                      }
                    >
                      {claimingId ===
                      pickup.RequestId
                        ? "Claiming..."
                        : "Claim this pickup"}
                    </button>

                    {!isApproved && (
                      <p className="fb-action-note">
                        Approval is required before
                        claiming a pickup.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section
        className="dashboard-panel fb-section"
        id="volunteer-assignments"
        aria-labelledby="volunteer-assignments-title"
      >
        <div className="listings-heading">
          <div>
            <span className="fb-panel-eyebrow">
              YOUR ACTIVE JOURNEYS
            </span>

            <h2 id="volunteer-assignments-title">
              My assignments
            </h2>

            <p className="fb-panel-description">
              Track each delivery from collection to
              confirmed handover.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="loading-state" role="status">
            Loading assignments...
          </p>
        ) : errorMessage ? (
          <p className="message" role="alert">
            Assignments could not be refreshed. Use
            Refresh pickups to try again.
          </p>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">📦</span>
            <p>
              You have not claimed any pickups yet.
            </p>
            <small>
              Claim an available pickup to begin a
              delivery journey.
            </small>
          </div>
        ) : (
          <>
            <p className="fb-count-note">
              You have {assignments.length} assignment
              {assignments.length === 1 ? "" : "s"}.
            </p>

            <div className="dashboard-grid">
              {assignments.map(
                (assignment) => {
                  const isUpdating =
                    updatingId ===
                    assignment.AssignmentId;

                  return (
                    <article
                      className="feature-card fb-request-card"
                      key={
                        assignment.AssignmentId
                      }
                    >
                      <div className="fb-listing-top">
                        <div className="fb-listing-title">
                          <h3>
                            {
                              assignment.Title
                            }
                          </h3>

                          <p className="fb-listing-meta">
                            {
                              assignment.FoodType
                            }{" "}
                            ·{" "}
                            {
                              assignment.City
                            }
                          </p>
                        </div>

                        <span
                          className={`fb-status fb-status--${String(
                            assignment.Status ||
                              ""
                          )
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )}`}
                        >
                          {formatStatus(
                            assignment.Status
                          )}
                        </span>
                      </div>

                      <div className="fb-request-progress">
                        <span className="fb-fact-label">
                          Delivery journey
                        </span>

                        <div
                          className="fb-progress-track"
                          aria-hidden="true"
                        >
                          <span
                            className={`fb-progress-step ${
                              assignment.Status ===
                              "assigned"
                                ? "fb-progress-step--active"
                                : "fb-progress-step--done"
                            }`}
                          />

                          <span
                            className={`fb-progress-step ${
                              assignment.Status ===
                              "picked_up"
                                ? "fb-progress-step--active"
                                : assignment.Status ===
                                  "delivered"
                                  ? "fb-progress-step--done"
                                  : ""
                            }`}
                          />

                          <span
                            className={`fb-progress-step ${
                              assignment.Status ===
                              "delivered"
                                ? "fb-progress-step--done"
                                : ""
                            }`}
                          />
                        </div>

                        <div className="fb-progress-labels">
                          <span>
                            Assigned
                          </span>
                          <span>
                            Picked up
                          </span>
                          <span>
                            Delivered
                          </span>
                        </div>
                      </div>

                      <div className="fb-pickup-route">
                        <div>
                          <span className="fb-fact-label">
                            From donor
                          </span>

                          <span className="fb-fact-value">
                            {
                              assignment.DonorName
                            }
                          </span>
                        </div>

                        <span
                          className="fb-route-arrow"
                          aria-hidden="true"
                        >
                          →
                        </span>

                        <div>
                          <span className="fb-fact-label">
                            To organization
                          </span>

                          <span className="fb-fact-value">
                            {
                              assignment.NgoName
                            }
                          </span>
                        </div>
                      </div>

                      <div className="fb-listing-facts">
                        <div>
                          <span className="fb-fact-label">
                            Quantity
                          </span>

                          <span className="fb-fact-value">
                            {
                              assignment.Quantity
                            }{" "}
                            {
                              assignment.Unit
                            }
                          </span>
                        </div>

                        <div>
                          <span className="fb-fact-label">
                            Assigned
                          </span>

                          <span className="fb-fact-value">
                            {formatDate(
                              assignment.AssignedAt
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="fb-fact-label">
                            Expires
                          </span>

                          <span className="fb-fact-value">
                            {formatDate(
                              assignment.ExpiresAt
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="fb-listing-details">
                        <p>
                          <strong>
                            Delivery address:
                          </strong>{" "}
                          {assignment.DeliveryAddress ||
                            "Not provided"}
                        </p>

                        <p>
                          <strong>
                            Storage:
                          </strong>{" "}
                          {assignment.StorageConditions ||
                            "Not provided"}
                        </p>

                        <p>
                          <strong>
                            Allergens:
                          </strong>{" "}
                          {assignment.AllergenInfo ||
                            "Not provided"}
                        </p>

                        {assignment.PickedUpAt && (
                          <p>
                            <strong>
                              Picked up:
                            </strong>{" "}
                            {formatDate(
                              assignment.PickedUpAt
                            )}
                          </p>
                        )}

                        {assignment.DeliveredAt && (
                          <p>
                            <strong>
                              Delivered:
                            </strong>{" "}
                            {formatDate(
                              assignment.DeliveredAt
                            )}
                          </p>
                        )}
                      </div>

                      <div className="fb-request-actions">
                        {assignment.Status ===
                          "assigned" && (
                          <button
                            type="button"
                            disabled={
                              actionDisabled
                            }
                            onClick={() =>
                              handleMarkPickedUp(
                                assignment
                              )
                            }
                          >
                            {isUpdating
                              ? "Updating..."
                              : "Mark as picked up"}
                          </button>
                        )}

                        {assignment.Status ===
                          "picked_up" && (
                          <>
                            <p className="fb-action-note">
                              Food collected.
                              Confirm delivery only
                              after the receiving
                              NGO has received the
                              food.
                            </p>

                            <button
                              type="button"
                              disabled={
                                actionDisabled
                              }
                              onClick={() =>
                                handleMarkDelivered(
                                  assignment
                                )
                              }
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Mark as delivered"}
                            </button>
                          </>
                        )}

                        {assignment.Status ===
                          "delivered" && (
                          <p className="fb-action-note">
                            Delivery completed.
                            Thank you for helping
                            this donation reach its
                            destination.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}