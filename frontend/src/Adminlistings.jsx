import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase()
  );
}

export default function AdminListings({
  accessToken,
}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadListings() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/listings/admin`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          }
        );

        const contentType =
          response.headers.get("content-type") ||
          "";

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
              "Unable to load listings."
          );
        }

        if (!Array.isArray(data.listings)) {
          throw new Error(
            "The server returned an unexpected listings format."
          );
        }

        if (!ignore) {
          setListings(data.listings);
        }
      } catch (err) {
        if (!ignore && err.name !== "AbortError") {
          setError(
            err.message ||
              "Unable to connect to the server."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [accessToken, refreshKey]);

  const expiredAvailableCount = listings.filter(
    (listing) =>
      listing.Status === "available" &&
      (listing.IsExpired === 1 ||
        listing.IsExpired === true)
  ).length;

  return (
    <section
      className="dashboard-panel fb-section"
      id="admin-listings"
      aria-labelledby="admin-listings-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            PLATFORM FOOD ACTIVITY
          </span>

          <h2 id="admin-listings-title">
            Manage listings
          </h2>

          <p className="fb-panel-description">
            Review the latest food listings across
            all statuses. This is a read-only
            oversight view.
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          disabled={loading}
          onClick={() =>
            setRefreshKey(
              (previous) => previous + 1
            )
          }
        >
          {loading
            ? "Refreshing..."
            : "Refresh listings"}
        </button>
      </div>

      {loading ? (
        <p className="loading-state" role="status">
          Loading food listings...
        </p>
      ) : error ? (
        <p className="message" role="alert">
          {error}
        </p>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">📋</span>
          <p>No food listings were found.</p>
          <small>
            Listings will appear here once donors
            begin sharing food.
          </small>
        </div>
      ) : (
        <>
          <div className="fb-summary-row">
            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Listings shown
              </span>

              <span className="fb-summary-value">
                {listings.length}
              </span>

              <small>
                Latest 100 listings
              </small>
            </div>

            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Expired but available
              </span>

              <span className="fb-summary-value">
                {expiredAvailableCount}
              </span>

              <small>
                Excluded from food browsing
              </small>
            </div>

            <div className="fb-summary-card">
              <span className="fb-fact-label">
                Oversight mode
              </span>

              <span className="fb-summary-value">
                Read-only
              </span>

              <small>
                No listing actions available
              </small>
            </div>
          </div>

          <div className="dashboard-grid">
            {listings.map((listing) => {
              const isExpiredAvailable =
                listing.Status === "available" &&
                (listing.IsExpired === 1 ||
                  listing.IsExpired === true);

              return (
                <article
                  className="feature-card fb-listing-card"
                  key={listing.ListingId}
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>
                        {listing.Title}
                      </h3>

                      <p className="fb-listing-meta">
                        {listing.FoodType} ·{" "}
                        {listing.City}
                      </p>
                    </div>

                    <span
                      className={`fb-status fb-status--${String(
                        listing.Status || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {formatStatus(
                        listing.Status
                      )}
                    </span>
                  </div>

                  <div className="fb-listing-facts">
                    <div>
                      <span className="fb-fact-label">
                        Donor
                      </span>

                      <span className="fb-fact-value">
                        {listing.DonorName}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Quantity
                      </span>

                      <span className="fb-fact-value">
                        {listing.Quantity}{" "}
                        {listing.Unit}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Expires
                      </span>

                      <span className="fb-fact-value">
                        {new Date(
                          listing.ExpiresAt
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="fb-admin-details">
                    <div>
                      <span className="fb-fact-label">
                        Listing ID
                      </span>

                      <span className="fb-fact-value">
                        {listing.ListingId}
                      </span>
                    </div>

                    <div>
                      <span className="fb-fact-label">
                        Created
                      </span>

                      <span className="fb-fact-value">
                        {new Date(
                          listing.CreatedAt
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isExpiredAvailable && (
                    <p className="fb-expiry-note">
                      Expiry time has passed. This
                      listing is excluded from
                      available-food browsing.
                    </p>
                  )}

                  {listing.Description && (
                    <p className="fb-listing-description">
                      {listing.Description}
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