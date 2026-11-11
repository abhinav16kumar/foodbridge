import { useEffect, useState } from "react";
import Notifications from "./Notifications.jsx";

const API_URL = import.meta.env.VITE_API_URL || 'https://foodbridge1-7x4q.onrender.com';

export default function AvailableListings({ accessToken }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [requestingId, setRequestingId] = useState(null);
  const [requestFeedback, setRequestFeedback] = useState({});
  const [submittedIds, setSubmittedIds] = useState([]);

  const [deliveryAddresses, setDeliveryAddresses] = useState({});
  const [requestMessages, setRequestMessages] = useState({});

  function updateDeliveryAddress(listingId, value) {
    setDeliveryAddresses((previous) => ({
      ...previous,
      [listingId]: value,
    }));
  }

  function updateRequestMessage(listingId, value) {
    setRequestMessages((previous) => ({
      ...previous,
      [listingId]: value,
    }));
  }

  async function handleRequest(listingId) {
    const deliveryAddress =
      (deliveryAddresses[listingId] || "").trim();

    const message =
      (requestMessages[listingId] || "").trim();

    setRequestFeedback((previous) => ({
      ...previous,
      [listingId]: null,
    }));

    if (!deliveryAddress || deliveryAddress.length > 500) {
      setRequestFeedback((previous) => ({
        ...previous,
        [listingId]: {
          success: false,
          message:
            "Enter a delivery address of no more than 500 characters.",
        },
      }));
      return;
    }

    if (message.length > 1000) {
      setRequestFeedback((previous) => ({
        ...previous,
        [listingId]: {
          success: false,
          message:
            "The message must not exceed 1000 characters.",
        },
      }));
      return;
    }

    setRequestingId(listingId);

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          listingId,
          deliveryAddress,
          message: message || null,
        }),
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
          data.message || "Unable to submit donation request."
        );
      }

      setSubmittedIds((previous) => [
        ...new Set([...previous, listingId]),
      ]);

      setRequestFeedback((previous) => ({
        ...previous,
        [listingId]: {
          success: true,
          message:
            data.message ||
            "Donation request submitted successfully.",
        },
      }));
    } catch (err) {
      setRequestFeedback((previous) => ({
        ...previous,
        [listingId]: {
          success: false,
          message:
            err.message || "Unable to connect to the server.",
        },
      }));
    } finally {
      setRequestingId(null);
    }
  }

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
    <>
      <Notifications accessToken={accessToken} />

      <section className="dashboard-panel">
        <div className="listings-heading">
          <h2>Available food donations</h2>

          <button
            type="button"
            disabled={loading || requestingId !== null}
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
          <p>
            No available donations were found. Check again later.
          </p>
        ) : (
          <>
            <p>
              Showing {listings.length} available donation(s).
            </p>

            <div className="dashboard-grid">
              {listings.map((listing) => {
                const listingId = listing.ListingId;
                const submitted = submittedIds.includes(listingId);
                const submitting = requestingId === listingId;
                const feedback = requestFeedback[listingId];

                return (
                  <article
  className="feature-card fb-listing-card"
  key={listingId}
>
  <div className="fb-listing-top">
    <div className="fb-listing-title">
      <h3>{listing.Title}</h3>

      <p className="fb-listing-meta">
        {listing.FoodType} · {listing.City}
      </p>
    </div>

    <span
      className={`fb-status fb-status--${String(
        listing.Status || ""
      )
        .toLowerCase()
        .replace(/\s+/g, "-")}`}
    >
      {listing.Status || "Unknown"}
    </span>
  </div>

  <div className="fb-listing-facts">
    <div>
      <span className="fb-fact-label">
        Quantity
      </span>
      <span className="fb-fact-value">
        {listing.Quantity} {listing.Unit}
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
        Storage
      </span>
      <span className="fb-fact-value">
        {listing.StorageConditions}
      </span>
    </div>
  </div>

  <div className="fb-listing-details">
    <p>
      <strong>Prepared:</strong>{" "}
      {listing.PreparedAt
        ? new Date(
            listing.PreparedAt
          ).toLocaleString()
        : "Not provided"}
    </p>

    <p>
      <strong>Allergens:</strong>{" "}
      {listing.AllergenInfo ||
        "Not provided"}
    </p>

    {listing.Description && (
      <p className="fb-listing-description">
        {listing.Description}
      </p>
    )}
  </div>

                    {listing.PreparedAt && (
                      <p>
                        Prepared:{" "}
                        {new Date(
                          listing.PreparedAt
                        ).toLocaleString()}
                      </p>
                    )}

                    <p>
                      Storage conditions:{" "}
                      {listing.StorageConditions}
                    </p>

                    <p>
                      Allergen information:{" "}
                      {listing.AllergenInfo || "Not provided"}
                    </p>

                    {listing.Description && (
                      <p>{listing.Description}</p>
                    )}

                    <form
  className="fb-request-form"
  onSubmit={(event) => {
    event.preventDefault();
    handleRequest(listingId);
  }}
>
                      <div className="form-group">
                        <label
                          htmlFor={`delivery-address-${listingId}`}
                        >
                          Delivery address
                        </label>

                        <textarea
                          id={`delivery-address-${listingId}`}
                          name="deliveryAddress"
                          rows={3}
                          maxLength={500}
                          required
                          placeholder="Building, street, area, city, and postal code"
                          value={
                            deliveryAddresses[listingId] || ""
                          }
                          onChange={(event) =>
                            updateDeliveryAddress(
                              listingId,
                              event.target.value
                            )
                          }
                          disabled={
                            submitted || requestingId !== null
                          }
                          aria-describedby={`delivery-help-${listingId}`}
                        />

                       <p
  id={`delivery-help-${listingId}`}
  className="fb-field-help"
>
  Where should the volunteer deliver this
  donation? Maximum 500 characters.
</p>
                      </div>

                      <div className="form-group">
                        <label
                          htmlFor={`request-message-${listingId}`}
                        >
                          Message to donor (optional)
                        </label>

                        <textarea
                          id={`request-message-${listingId}`}
                          name="message"
                          rows={2}
                          maxLength={1000}
                          placeholder="Add any details relevant to your request."
                          value={
                            requestMessages[listingId] || ""
                          }
                          onChange={(event) =>
                            updateRequestMessage(
                              listingId,
                              event.target.value
                            )
                          }
                          disabled={
                            submitted || requestingId !== null
                          }
                        />
                      </div>

                      <button
  className="fb-request-button"
  type="submit"
  disabled={
    requestingId !== null || submitted
  }
>
  {submitted
    ? "Request submitted"
    : submitting
      ? "Submitting request..."
      : "Request this donation"}
</button>
                    </form>

                    {feedback && (
                      <p
                        role={
                          feedback.success ? "status" : "alert"
                        }
                      >
                        {feedback.message}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
