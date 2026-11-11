import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'https://foodbridge1-7x4q.onrender.com';

function isVolunteerApproved(volunteer) {
  return (
    volunteer.isVerified === true ||
    volunteer.isVerified === 1
  );
}

async function volunteerAdminRequest(
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
    `${API_URL}/api/admin/volunteers${path}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  if (
    !contentType.includes("application/json")
  ) {
    throw new Error(
      `The server returned a non-JSON response (HTTP ${response.status}). Check the volunteer admin routes.`
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

export default function PendingVolunteers({
  accessToken,
}) {
  const [volunteers, setVolunteers] = useState(
    []
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState(null);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [actionMessage, setActionMessage] =
    useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const busy =
    loading || updatingId !== null;

  const pendingVolunteers = volunteers.filter(
    (volunteer) =>
      !isVolunteerApproved(volunteer)
  );

  const approvedVolunteers = volunteers.filter(
    isVolunteerApproved
  );

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadVolunteers() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data =
          await volunteerAdminRequest(
            "",
            accessToken,
            {
              signal: controller.signal,
            }
          );

        if (!Array.isArray(data.volunteers)) {
          throw new Error(
            "The server returned an unexpected volunteers format."
          );
        }

        if (!ignore) {
          setVolunteers(data.volunteers);
        }
      } catch (error) {
        if (
          !ignore &&
          error.name !== "AbortError"
        ) {
          setErrorMessage(
            error.message ||
              "Unable to load volunteers."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadVolunteers();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [accessToken, refreshKey]);

  async function handleApprovalChange(
    volunteer,
    nextIsVerified
  ) {
    if (busy) return;

    const question = nextIsVerified
      ? `Approve ${volunteer.fullName} (${volunteer.email}) to claim and update pickups?`
      : `Revoke approval for ${volunteer.fullName} (${volunteer.email})? This will block subsequent pickup actions, including updates to existing assignments. Tasks will not be reassigned automatically.`;

    if (!window.confirm(question)) return;

    setUpdatingId(volunteer.userId);
    setActionMessage("");

    try {
      const data =
        await volunteerAdminRequest(
          `/${volunteer.userId}/approval`,
          accessToken,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              isVerified: nextIsVerified,
            }),
          }
        );

      setActionMessage(data.message);
    } catch (error) {
      setActionMessage(
        `${error.message} Refresh the list before retrying.`
      );
    } finally {
      setUpdatingId(null);
      setRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  function renderVolunteerCard(volunteer) {
    const approved = isVolunteerApproved(
      volunteer
    );
    const updating =
      updatingId === volunteer.userId;

    return (
      <article
        className="feature-card fb-volunteer-card"
        key={volunteer.userId}
      >
        <div className="fb-listing-top">
          <div className="fb-listing-title">
            <h3>{volunteer.fullName}</h3>

            <p className="fb-listing-meta">
              {volunteer.email}
            </p>
          </div>

          <span
            className={`fb-status ${
              approved
                ? "fb-status--approved"
                : "fb-status--pending"
            }`}
          >
            {approved
              ? "Approved"
              : "Pending"}
          </span>
        </div>

        <div className="fb-volunteer-details">
          <div>
            <span className="fb-fact-label">
              User ID
            </span>

            <span className="fb-fact-value">
              {volunteer.userId}
            </span>
          </div>

          <div>
            <span className="fb-fact-label">
              Phone
            </span>

            <span className="fb-fact-value">
              {volunteer.phone ||
                "Not provided"}
            </span>
          </div>
        </div>

        <div className="fb-request-actions">
          <button
            className={
              approved
                ? "fb-danger-action"
                : ""
            }
            type="button"
            disabled={busy}
            onClick={() =>
              handleApprovalChange(
                volunteer,
                !approved
              )
            }
          >
            {updating
              ? "Updating..."
              : approved
                ? "Revoke approval"
                : "Approve volunteer"}
          </button>

          <p className="fb-action-note">
            {approved
              ? "Revoking approval blocks future pickup actions. Existing tasks are not reassigned automatically."
              : "Approval allows this volunteer to claim and update pickups."}
          </p>
        </div>
      </article>
    );
  }

  return (
    <section
      className="dashboard-panel fb-section"
      id="volunteer-management"
      aria-labelledby="volunteer-management-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            COMMUNITY ACCESS & TRUST
          </span>

          <h2 id="volunteer-management-title">
            Volunteer management
          </h2>

          <p className="fb-panel-description">
            Approve volunteers after completing the
            required checks, or revoke approval when
            necessary.
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          disabled={busy}
          onClick={() =>
            setRefreshKey(
              (previous) => previous + 1
            )
          }
        >
          {loading
            ? "Refreshing..."
            : "Refresh volunteers"}
        </button>
      </div>

      {actionMessage && (
        <p
          className="message"
          role="status"
        >
          {actionMessage}
        </p>
      )}

      {loading ? (
        <p className="loading-state" role="status">
          Loading volunteers...
        </p>
      ) : errorMessage ? (
        <p className="message" role="alert">
          {errorMessage}
        </p>
      ) : (
        <>
          <div className="fb-summary-row">
            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Volunteers shown
              </span>

              <span className="fb-summary-value">
                {volunteers.length}
              </span>

              <small>
                Up to 100 active volunteers
              </small>
            </div>

            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Pending approval
              </span>

              <span className="fb-summary-value">
                {pendingVolunteers.length}
              </span>

              <small>
                Awaiting admin decision
              </small>
            </div>

            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Approved
              </span>

              <span className="fb-summary-value">
                {approvedVolunteers.length}
              </span>

              <small>
                Can claim and update pickups
              </small>
            </div>
          </div>

          <p className="fb-policy-note">
            Revoking approval blocks subsequent
            pickup actions. It does not cancel or
            reassign outstanding tasks.
          </p>

          <div className="fb-admin-group">
            <div className="fb-group-header">
              <h3>
                Pending volunteers
              </h3>

              <span className="fb-group-count">
                {pendingVolunteers.length}
              </span>
            </div>

            {pendingVolunteers.length === 0 ? (
              <div className="empty-state">
                <span aria-hidden="true">
                  ✅
                </span>

                <p>
                  No pending volunteers in this
                  list.
                </p>
              </div>
            ) : (
              <div className="dashboard-grid">
                {pendingVolunteers.map(
                  renderVolunteerCard
                )}
              </div>
            )}
          </div>

          <div className="fb-admin-group">
            <div className="fb-group-header">
              <h3>
                Approved volunteers
              </h3>

              <span className="fb-group-count">
                {approvedVolunteers.length}
              </span>
            </div>

            {approvedVolunteers.length ===
            0 ? (
              <div className="empty-state">
                <span aria-hidden="true">
                  👥
                </span>

                <p>
                  No approved volunteers in this
                  list.
                </p>
              </div>
            ) : (
              <div className="dashboard-grid">
                {approvedVolunteers.map(
                  renderVolunteerCard
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
