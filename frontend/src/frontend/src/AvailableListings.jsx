import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AvailableListings({ accessToken }) {
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
        const response = await fetch(`${API_URL}/api/listings`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        const contentType =
          response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `The server returned a non-JSON response (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load available donations."
          );
        }

        if (!Array.isArray(data.listings)) {
          throw new Error("The server returned an unexpected listings format.");
        }

        if (!ignore) {
          setListings(data.listings);
        }
      } catch (err) {
        if (!ignore && err.name !== "AbortError") {
          setError(
            err.message || "Unable to connect to the server."
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

  return (
    <section className="dashboard-panel">
      <div className="listings-heading">
        <h2>Available food donations</h2>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            setRefreshKey((previous) => previous + 1)
          }
        >
          {loading ? "Loading..." : "Refresh donations"}
        </button>
      </div>

      {loading ? (
        <p role="status">Loading available donations...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : listings.length === 0 ? (
        <p>No available donations were found. Check again later.</p>
      ) : (
        <>
          <p>Showing {listings.length} available donation(s).</p>

          <div className="dashboard-grid">
            {listings.map((listing) => (
              <article
                className="feature-card"
                key={listing.ListingId}
              >
                <h3>{listing.Title}</h3>

                <p>
                  Quantity: {listing.Quantity} {listing.Unit}
                </p>

                <p>Food type: {listing.FoodType}</p>
                <p>City: {listing.City}</p>
                <p>Status: {listing.Status}</p>

                <p>
                  Expires:{" "}
                  {new Date(listing.ExpiresAt).toLocaleString()}
                </p>

                {listing.PreparedAt && (
                  <p>
                    Prepared:{" "}
                    {new Date(listing.PreparedAt).toLocaleString()}
                  </p>
                )}

                <p>
                  Storage conditions: {listing.StorageConditions}
                </p>

                <p>
                  Allergen information:{" "}
                  {listing.AllergenInfo || "Not provided"}
                </p>

                {listing.Description && (
                  <p>{listing.Description}</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}