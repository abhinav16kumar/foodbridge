import DashboardLayout from "../DashboardLayout.jsx";
import AvailableListings from "../AvailableListings.jsx";
import NgoRequests from "../NgoRequests.jsx";

const navigation = [
  { label: "Overview", href: "#workspace-overview" },
  { label: "Browse food", href: "#available-donations" },
  { label: "My requests & ratings", href: "#ngo-requests" },
];

export default function NgoDashboard({
  user,
  accessToken,
  onLogout,
}) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navigation={navigation}
    >
      <div id="available-donations" className="fb-section">
        <AvailableListings accessToken={accessToken} />
      </div>

      <div id="ngo-requests" className="fb-section">
        <NgoRequests accessToken={accessToken} />
      </div>
    </DashboardLayout>
  );
}