import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function MyListings({ accessToken }) {
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
          `${API_URL}/api/listings/mine`,
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
            data.message || "Unable to load your listings."
          );
        }

        if (!ignore) {
          setListings(data.listings);
        }
      } catch (error) {
        if (!ignore && error.name !== "AbortError") {
          setError(
            error.message || "Unable to connect to the server."
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

  function getDisplayStatus(listing) {
    if (
      listing.Status === "available" &&
      new Date(listing.ExpiresAt).getTime() <= Date.now()
    ) {
      return "expired";
    }

    return listing.Status;
  }

  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return status
      .charAt(0)
      .toUpperCase() +
      status.slice(1).toLowerCase();
  }

  return (
    <section
      className="dashboard-panel fb-section"
      id="my-listings"
      aria-labelledby="my-listings-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            YOUR SHARED FOOD
          </span>

          <h2 id="my-listings-title">
            My food listings
          </h2>

          <p className="fb-panel-description">
            Track the donations you have offered and
            see which ones are still available.
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
          {loading ? "Refreshing..." : "Refresh listings"}
        </button>
      </div>

      {loading ? (
        <p className="loading-state" role="status">
          Loading your listings...
        </p>
      ) : error ? (
        <p className="message" role="alert">
          {error}
        </p>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">🍽️</span>
          <p>
            You have not created any food listings yet.
          </p>
          <small>
            Use “Share food” above to offer your first
            donation.
          </small>
        </div>
      ) : (
        <>
          <p className="fb-count-note">
            You have {listings.length} listing
            {listings.length === 1 ? "" : "s"}.
          </p>

          <div className="dashboard-grid">
            {listings.map((listing) => {
              const displayStatus = getDisplayStatus(
                listing
              );

              return (
                <article
                  className="feature-card fb-listing-card"
                  key={listing.ListingId}
                >
                  <div className="fb-listing-top">
                    <div className="fb-listing-title">
                      <h3>{listing.Title}</h3>

                      <p className="fb-listing-meta">
                        {listing.FoodType} ·{" "}
                        {listing.City}
                      </p>
                    </div>

                    <span
                      className={`fb-status fb-status--${String(
                        displayStatus || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {formatStatus(displayStatus)}
                    </span>
                  </div>

                  <div className="fb-listing-facts">
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

                    <div>
                      <span className="fb-fact-label">
                        Food type
                      </span>

                      <span className="fb-fact-value">
                        {listing.FoodType}
                      </span>
                    </div>
                  </div>

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

export default MyListings;