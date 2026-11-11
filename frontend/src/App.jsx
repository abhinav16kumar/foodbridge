import { useEffect, useState } from "react";
import "./App.css";
import Register from "./Register";
import DonorDashboard from "./pages/DonorDashboard";
import NgoDashboard from "./pages/NgoDashboard";
import Dashboard from "./Dashboard";
const API_URL =
  import.meta.env.VITE_API_URL || "https://foodbridge1-7x4q.onrender.com";

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  useEffect(() => {
  const savedToken = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (savedToken && savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);

      setAccessToken(savedToken);
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
}, []);
  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const loginResponse = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.message || "Login failed.");
      }

      // Use the token to request the protected profile.
      const profileResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${loginData.token}`,
          },
        }
      );

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profileData.message || "Unable to retrieve profile."
        );
      }
      setAccessToken(loginData.token);
      setUser(profileData.user);
      localStorage.setItem("token", loginData.token);
localStorage.setItem("user", JSON.stringify(profileData.user));
      setPassword("");
      setMessage("Login successful!");
    } catch (error) {
      setMessage(
        error.message || "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAccessToken("");
    setUser(null);
    setEmail("");
    setPassword("");
    setMessage("");
  }
if (showRegister) {
  return (
    <Register
      onBackToLogin={() => {
        setShowRegister(false);
        setMessage("");
      }}
    />
  );
}
if (user) {
  if (user.role === "donor") {
    return (
      <DonorDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
    );
  }

  if (user.role === "ngo") {
    return (
      <NgoDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      accessToken={accessToken}
      onLogout={handleLogout}
    />
  );
}
 return (
  <main className="foodbridge-auth">
    <section
      className="foodbridge-story"
      aria-labelledby="foodbridge-story-title"
    >
      <a
        className="foodbridge-brand"
        href="#login-title"
        aria-label="FoodBridge — go to login"
      >
        <span className="foodbridge-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M9 33C9 24.2 15.7 18 24 18s15 6.2 15 15"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M6 34h36M15 34v5m18-5v5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M24 17C20 11 23 6 32 6c0 7-3 11-8 11Z"
              fill="currentColor"
            />
          </svg>
        </span>

        <span>FoodBridge</span>
      </a>

      <div className="foodbridge-story-content">
        <span className="foodbridge-eyebrow">
          GOOD FOOD. GREATER PURPOSE.
        </span>

        <h1 id="foodbridge-story-title">
          A little surplus.
          <br />
          A lot of <span>possibility.</span>
        </h1>

        <p className="foodbridge-story-description">
          Connect surplus food with the people and
          organizations ready to put it to good use.
          Share a donation, lend a hand, or help your
          community receive more.
        </p>

        <div
          className="foodbridge-journey"
          aria-label="Food journey: share, transport, receive"
        >
          <div className="foodbridge-journey-stop">
            <span className="foodbridge-journey-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="m5 11 11-5 11 5-11 5-11-5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 11v12l11 5 11-5V11M16 16v12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Share food</span>
            <small>Donors</small>
          </div>

          <span className="foodbridge-journey-link" aria-hidden="true">
            →
          </span>

          <div className="foodbridge-journey-stop">
            <span className="foodbridge-journey-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M3 8h16v15H3V8Zm16 6h6l4 5v4H19V14Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle
                  cx="9"
                  cy="24"
                  r="3"
                  fill="currentColor"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="3"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>Bridge the gap</span>
            <small>Volunteers</small>
          </div>

          <span className="foodbridge-journey-link" aria-hidden="true">
            →
          </span>

          <div className="foodbridge-journey-stop">
            <span className="foodbridge-journey-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="m4 14 12-9 12 9M7 12v15h18V12M13 27v-9h6v9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Welcome more</span>
            <small>Community organizations</small>
          </div>
        </div>
      </div>

      <p className="foodbridge-story-footer">
        Less food wasted. More connections made.
      </p>
    </section>

    <section
      className="foodbridge-login-side"
      aria-labelledby="login-title"
    >
      <div className="foodbridge-login-card">
        <span className="foodbridge-form-eyebrow">
          YOUR NEXT GOOD DEED STARTS HERE
        </span>

        <h2 id="login-title">Welcome to the table.</h2>

        <p className="foodbridge-login-description">
          Log in to continue your FoodBridge journey.
        </p>

        <form onSubmit={handleLogin}>
          <div className="foodbridge-field">
            <label htmlFor="email">Email address</label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              disabled={loading}
              required
            />
          </div>

          <div className="foodbridge-field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              disabled={loading}
              required
            />
          </div>

          <button
            className="foodbridge-login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}

        <div className="foodbridge-signup">
          <p>New to the community?</p>

          <button
            className="foodbridge-signup-button"
            type="button"
            disabled={loading}
            onClick={() => {
              setMessage("");
              setShowRegister(true);
            }}
          >
            Create an account
          </button>
        </div>

        <p className="foodbridge-role-note">
          For donors, NGOs, and volunteers.
          <br />
          One community. A shared purpose.
        </p>
      </div>
    </section>
  </main>
);
}
export default App;