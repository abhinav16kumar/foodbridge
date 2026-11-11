import AvailableListings from "../AvailableListings.jsx";

export default function NgoDashboard({
  user,
  accessToken,
  onLogout,
}) {
  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "#166534" }}>
            FoodBridge
          </h1>

          <p style={{ margin: "8px 0 0" }}>
            NGO dashboard
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span>{user.fullName || user.email}</span>

          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main
        style={{
          display: "grid",
          gap: "24px",
        }}
      >
        {!user.isVerified && (
          <section
            style={{
              padding: "16px",
              border: "1px solid #fcd34d",
              borderRadius: "12px",
              background: "#fffbeb",
              color: "#78350f",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>
              Verification pending
            </h2>

            <p style={{ margin: 0 }}>
              Your account verification is pending. Browsing
              donations does not mean your account is approved
              for food redistribution activities.
            </p>
          </section>
        )}

        <AvailableListings accessToken={accessToken} />
      </main>
    </div>
  );
}
