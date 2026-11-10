import { useState } from "react";
import DashboardLayout from "../DashboardLayout.jsx";
import MyListings from "../MyListings.jsx";
import CreateDonation from "../CreateDonation.jsx";
import DonationRequests from "../DonationRequests.jsx";

const navigation = [
  { label: "Overview", href: "#workspace-overview" },
  { label: "Share food", href: "#create-donation" },
  { label: "My listings", href: "#my-listings" },
  { label: "Donation requests", href: "#donation-requests" },
];

export default function DonorDashboard({
  user,
  accessToken,
  onLogout,
}) {
  const [refreshVersion, setRefreshVersion] = useState(0);

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navigation={navigation}
    >
      <div id="create-donation" className="fb-section">
        <CreateDonation
          accessToken={accessToken}
          onCreated={() => {
            setRefreshVersion((previous) => previous + 1);
          }}
        />
      </div>

      <div id="my-listings" className="fb-section">
        <MyListings
          key={refreshVersion}
          accessToken={accessToken}
        />
      </div>

      <div id="donation-requests" className="fb-section">
        <DonationRequests accessToken={accessToken} />
      </div>
    </DashboardLayout>
  );
}