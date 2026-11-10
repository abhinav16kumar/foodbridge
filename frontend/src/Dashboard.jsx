import { useEffect, useState } from "react";
import MyListings from "./MyListings.jsx";
import AdminListings from "./Adminlistings.jsx";
import PlatformReports from "./PlatformReports.jsx";
import AvailablePickups from "./AvailablePickups.jsx";
import PendingVolunteers from "./PendingVolunteers.jsx";
import DashboardLayout from "./DashboardLayout.jsx";
const API_BASE_URL = "http://localhost:5000/api/auth";

const dashboardConfig = {
  donor: {
    title: "Donor Dashboard",
    description: "Manage surplus food and donation requests.",
    features: [
      {
        title: "Create a donation",
        description:
          "List surplus food with quantity, pickup details, and expiry time.",
      },
      {
        title: "My food listings",
        description:
          "View and manage the food donations you have listed.",
      },
      {
        title: "Donation requests",
        description:
          "Review requests submitted by NGOs and food banks.",
      },
    ],
  },

  ngo: {
    title: "NGO Dashboard",
    description: "Find suitable donations and coordinate receipt.",
    features: [
      {
        title: "Browse available food",
        description:
          "Find suitable surplus food offered by donors.",
      },
      {
        title: "My requests",
        description:
          "Track the donation requests your organization submits.",
      },
      {
        title: "Confirm receipt",
        description:
          "Confirm food deliveries received by your organization.",
      },
    ],
  },

 volunteer: {
  title: "Volunteer Dashboard",
  description: "Help transport food to community organizations.",
  features: [],
},

  admin: {
    title: "Administrator Dashboard",
    description: "Oversee users and platform activity.",
    features: [],
  },
};

function Dashboard({ user, accessToken, onLogout }) {
  const config = dashboardConfig[user.role];

  const [pendingNgos, setPendingNgos] = useState([]);
  const [loadingNgos, setLoadingNgos] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  const fetchPendingNgos = async () => {
    setLoadingNgos(true);
    setVerificationMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/ngos/pending`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load pending NGO accounts."
        );
      }

      setPendingNgos(data.users || []);
    } catch (error) {
      setVerificationMessage(error.message);
    } finally {
      setLoadingNgos(false);
    }
  };

  const updateVerification = async (userId, isVerified) => {
    setVerificationMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}/verification`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ isVerified }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update NGO verification."
        );
      }

      setVerificationMessage(data.message);
      fetchPendingNgos();
    } catch (error) {
      setVerificationMessage(error.message);
    }
  };

  useEffect(() => {
    if (user.role === "admin") {
      fetchPendingNgos();
    }
  }, [user.role]);

  if (!config) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-panel">
          <h1>Dashboard unavailable</h1>
          <p>This account does not have a supported role.</p>

          <button type="button" onClick={onLogout}>
            Sign out of this screen
          </button>
        </section>
      </main>
    );
  }

  return (
  <DashboardLayout
    user={user}
    onLogout={onLogout}
    navigation={
      user.role === "admin"
        ? [
            {
              label: "Overview",
              href: "#workspace-overview",
            },
            {
              label: "NGO verification",
              href: "#ngo-verification",
            },
            {
              label: "Volunteer management",
              href: "#volunteer-management",
            },
            {
              label: "Food listings",
              href: "#admin-listings",
            },
            {
              label: "Platform reports",
              href: "#platform-reports",
            },
          ]
        : user.role === "volunteer"
          ? [
              {
                label: "Overview",
                href: "#workspace-overview",
              },
              {
                label: "Pickups & assignments",
                href: "#volunteer-pickups",
              },
            ]
          : [
              {
                label: "Overview",
                href: "#workspace-overview",
              },
              {
                label: "My listings",
                href: "#fallback-listings",
              },
            ]
    }
  >
    {user.role === "admin" && (
      <>
        <section
          id="ngo-verification"
          className="dashboard-panel fb-section"
        >
          <div className="listings-heading">
            <h2>NGO verification</h2>

            <button
              type="button"
              disabled={loadingNgos}
              onClick={fetchPendingNgos}
            >
              {loadingNgos ? "Loading..." : "Refresh accounts"}
            </button>
          </div>

          <p>
            Review NGO accounts awaiting approval.
          </p>

          {loadingNgos ? (
            <p role="status">
              Loading pending NGO accounts...
            </p>
          ) : pendingNgos.length === 0 ? (
            <p>No pending NGO verification requests.</p>
          ) : (
            <ul className="pending-ngo-list">
              {pendingNgos.map((ngo) => (
                <li key={ngo.UserId}>
                  <h3>{ngo.FullName}</h3>
                  <p>{ngo.Email}</p>

                  <button
                    type="button"
                    onClick={() =>
                      updateVerification(ngo.UserId, true)
                    }
                  >
                    Approve NGO
                  </button>
                </li>
              ))}
            </ul>
          )}

          {verificationMessage && (
            <p
              className="verification-message"
              role="status"
            >
              {verificationMessage}
            </p>
          )}
        </section>

        <div
          id="volunteer-management"
          className="fb-section"
        >
          <PendingVolunteers accessToken={accessToken} />
        </div>

        <div id="admin-listings" className="fb-section">
          <AdminListings accessToken={accessToken} />
        </div>

        <div id="platform-reports" className="fb-section">
          <PlatformReports accessToken={accessToken} />
        </div>
      </>
    )}

    {user.role === "volunteer" && (
      <div id="volunteer-pickups" className="fb-section">
        <AvailablePickups
          accessToken={accessToken}
          isApproved={
            user.isVerified === true ||
            user.isVerified === 1
          }
        />
      </div>
    )}

    {user.role === "donor" && (
      <div id="fallback-listings" className="fb-section">
        <MyListings accessToken={accessToken} />
      </div>
    )}
  </DashboardLayout>
);
}
export default Dashboard;