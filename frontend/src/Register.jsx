import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'https://foodbridge1-7x4q.onrender.com';

function Register({ onBackToLogin }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "donor",
    phone: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create account."
        );
      }

      setRegistered(true);
      setForm((previous) => ({
        ...previous,
        password: "",
      }));

      setMessage(
        "Account created successfully! You can now log in."
      );
    } catch (error) {
      setMessage(
        error.message || "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>FoodBridge</h1>
        <h2>Create an account</h2>

        {!registered && (
          <form onSubmit={handleRegister}>
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange}
              minLength={2}
              maxLength={100}
              required
            />

            <label htmlFor="registerEmail">
              Email address
            </label>
            <input
              id="registerEmail"
              name="email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={handleChange}
              maxLength={254}
              required
            />

            <label htmlFor="registerPassword">
              Password
            </label>
            <input
              id="registerPassword"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              minLength={15}
              maxLength={128}
              required
            />
            <small>Use between 15 and 128 characters.</small>

            <label htmlFor="role">Account type</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="donor">Food donor</option>
              <option value="ngo">NGO / Food bank</option>
              <option value="volunteer">Volunteer</option>
            </select>

            <label htmlFor="phone">
              Phone number (optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
              maxLength={20}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>
        )}

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={onBackToLogin}
          disabled={loading}
        >
          Back to login
        </button>
      </section>
    </main>
  );
}

export default Register;
