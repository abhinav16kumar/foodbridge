import "./DashboardTheme.css";

const roleThemes = {
  donor: {
    label: "Donor",
    eyebrow: "A LITTLE SURPLUS. A NEW POSSIBILITY.",
    headline: "Good food deserves another table.",
    description:
      "Share what you have. Connect with organizations ready to put it to good use.",
  },
  ngo: {
    label: "NGO",
    eyebrow: "GOOD FOOD. SHARED PURPOSE.",
    headline: "More possibilities for your community.",
    description:
      "Find suitable donations, coordinate deliveries, and keep every connection moving.",
  },
  volunteer: {
    label: "Volunteer",
    eyebrow: "SMALL JOURNEYS. MEANINGFUL CONNECTIONS.",
    headline: "Be the bridge. Make the connection.",
    description:
      "Help good food reach community organizations, one thoughtful delivery at a time.",
  },
  admin: {
    label: "Administrator",
    eyebrow: "A STRONGER COMMUNITY STARTS WITH CARE.",
    headline: "Keep the community moving with confidence.",
    description:
      "Review accounts, oversee donations, and support the people behind every food journey.",
  },
};

function BridgeMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M9 33c0-8.8 6.7-15 15-15s15 6.2 15 15M6 34h36M15 34v5m18-5v5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M24 17C20 11 23 6 32 6c0 7-3 11-8 11Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function DashboardLayout({
  user,
  onLogout,
  navigation,
  children,
}) {
  const theme = roleThemes[user.role] || roleThemes.ngo;
  const verified =
    user.isVerified === true || user.isVerified === 1;

  const name = user.fullName || user.email || "Community member";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="fb-workspace" data-role={user.role}>
      <aside className="fb-sidebar">
        <a className="fb-brand" href="#workspace-overview">
          <span className="fb-brand-icon">
            <BridgeMark />
          </span>
          <span>FoodBridge</span>
        </a>

        <p className="fb-sidebar-caption">
          YOUR COMMUNITY WORKSPACE
        </p>

        <nav className="fb-navigation" aria-label="Dashboard sections">
          {navigation.map((item, index) => (
            <a key={item.href} href={item.href}>
              <span className="fb-nav-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="fb-sidebar-footer">
          <span className="fb-mini-leaf" aria-hidden="true" />
          <p>
            Less food wasted.
            <br />
            More connections made.
          </p>
        </div>
      </aside>

      <div className="fb-main-area">
        <header className="fb-topbar">
          <div>
            <span className="fb-topbar-label">{theme.label} workspace</span>
            <p>A shared purpose. Your own next step.</p>
          </div>

          <div className="fb-topbar-actions">
            <span className="fb-avatar" aria-hidden="true">
              {initial}
            </span>

            <div className="fb-user-summary">
              <span>{name}</span>
              <small>{theme.label}</small>
            </div>

            <button
              className="fb-logout"
              type="button"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="fb-content">
          <section
            className="fb-welcome"
            id="workspace-overview"
            aria-labelledby="workspace-title"
          >
            <div className="fb-welcome-copy">
              <span className="fb-eyebrow">{theme.eyebrow}</span>
              <p className="fb-greeting">Welcome, {name}</p>
              <h1 id="workspace-title">{theme.headline}</h1>
              <p className="fb-welcome-description">
                {theme.description}
              </p>

              <span className="fb-role-pill">
                {theme.label} account
              </span>
            </div>

            <div className="fb-welcome-art" aria-hidden="true">
              <div className="fb-art-circle">
                <BridgeMark />
              </div>
              <span>Share. Connect. Nourish.</span>
            </div>
          </section>

          <section
            className="fb-account-strip"
            aria-label="Account information"
          >
            <div>
              <span className="fb-detail-label">Signed in as</span>
              <span className="fb-account-email">{user.email}</span>
            </div>

            <span
              className={`fb-verification ${
                verified
                  ? "fb-verification--approved"
                  : "fb-verification--pending"
              }`}
            >
              Verification: {verified ? "Verified" : "Pending"}
            </span>
          </section>

          {!verified && (
            <p className="verification-notice">
              Your account verification is pending. Access to this
              dashboard does not mean your account is approved for
              food redistribution activities.
            </p>
          )}

          <div className="fb-sections">{children}</div>

          <footer className="fb-page-footer">
            FoodBridge · Connecting surplus with purpose.
          </footer>
        </main>
      </div>
    </div>
  );
}
