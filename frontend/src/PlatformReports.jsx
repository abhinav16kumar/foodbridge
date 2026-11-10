import { useEffect, useState } from "react";

const API_BASE_URL =
  "http://localhost:5000/api/reports";

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString()
    : "0";
}

export default function PlatformReports({
  accessToken,
}) {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const fetchReports = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/summary`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load platform reports."
        );
      }

      setReports(data.reports);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <section
        className="dashboard-panel fb-section"
        id="platform-reports"
        aria-labelledby="platform-reports-title"
      >
        <div className="listings-heading">
          <div>
            <span className="fb-panel-eyebrow">
              PLATFORM OVERVIEW
            </span>

            <h2 id="platform-reports-title">
              Platform reports
            </h2>

            <p className="fb-panel-description">
              A summary of donations, requests, and
              community verification activity.
            </p>
          </div>
        </div>

        <p className="loading-state" role="status">
          Loading platform reports...
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        className="dashboard-panel fb-section"
        id="platform-reports"
        aria-labelledby="platform-reports-title"
      >
        <div className="listings-heading">
          <div>
            <span className="fb-panel-eyebrow">
              PLATFORM OVERVIEW
            </span>

            <h2 id="platform-reports-title">
              Platform reports
            </h2>

            <p className="fb-panel-description">
              A summary of donations, requests, and
              community verification activity.
            </p>
          </div>

          <button
            className="secondary-action"
            type="button"
            onClick={fetchReports}
          >
            Retry
          </button>
        </div>

        <p className="message" role="alert">
          {errorMessage}
        </p>
      </section>
    );
  }

  const reportGroups = [
    {
      title: "Food listings",
      description:
        "Current distribution of food listings across the platform.",
      items: [
        {
          label: "Total food listings",
          value: reports.totalListings,
        },
        {
          label: "Available listings",
          value: reports.availableListings,
        },
        {
          label: "Reserved listings",
          value: reports.reservedListings,
        },
        {
          label: "Completed listings",
          value: reports.completedListings,
        },
      ],
    },
    {
      title: "Community activity",
      description:
        "Donation requests and accounts awaiting verification.",
      items: [
        {
          label: "Total donation requests",
          value: reports.totalRequests,
        },
        {
          label: "NGOs awaiting verification",
          value: reports.pendingNgos,
        },
      ],
    },
  ];

  return (
    <section
      className="dashboard-panel fb-section"
      id="platform-reports"
      aria-labelledby="platform-reports-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            PLATFORM OVERVIEW
          </span>

          <h2 id="platform-reports-title">
            Platform reports
          </h2>

          <p className="fb-panel-description">
            A summary of donations, requests, and
            community verification activity.
          </p>
        </div>

        <button
          className="secondary-action"
          type="button"
          onClick={fetchReports}
        >
          Refresh reports
        </button>
      </div>

      <div className="fb-report-groups">
        {reportGroups.map((group) => (
          <div
            className="fb-report-group"
            key={group.title}
          >
            <div className="fb-group-header">
              <h3>{group.title}</h3>
            </div>

            <p className="fb-panel-description">
              {group.description}
            </p>

            <div
              className={`fb-report-grid ${
                group.items.length === 2
                  ? "fb-report-grid--two"
                  : ""
              }`}
            >
              {group.items.map((item) => (
                <div
                  className="fb-report-card"
                  key={item.label}
                >
                  <span className="fb-fact-label">
                    {item.label}
                  </span>

                  <span className="fb-report-value">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}