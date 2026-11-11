import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'https://foodbridge1-7x4q.onrender.com';

const initialForm = {
  title: "",
  description: "",
  foodType: "packaged",
  quantity: "",
  unit: "items",
  pickupAddress: "",
  city: "",
  preparedAt: "",
  expiresAt: "",
  storageConditions: "",
  allergenInfo: "",
};

export default function CreateDonation({
  accessToken,
  onCreated,
}) {
  const [form, setForm] = useState({
    ...initialForm,
  });
  const [showForm, setShowForm] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!accessToken) {
      setError(
        "Please log in again before creating a donation."
      );
      return;
    }

    const now = Date.now();
    const expiryDate = new Date(
      form.expiresAt
    );

    if (
      !form.expiresAt ||
      Number.isNaN(expiryDate.getTime())
    ) {
      setError(
        "Choose a valid expiry date and time."
      );
      return;
    }

    if (expiryDate.getTime() <= now) {
      setError(
        "The expiry date and time must be in the future."
      );
      return;
    }

    let preparedAt = null;

    if (form.preparedAt.trim()) {
      const preparationDate = new Date(
        form.preparedAt
      );

      if (
        Number.isNaN(
          preparationDate.getTime()
        )
      ) {
        setError(
          "Choose a valid preparation date and time, or leave it blank."
        );
        return;
      }

      if (
        preparationDate.getTime() > now
      ) {
        setError(
          "Preparation time is in the future. Select when the food was already prepared, or clear this optional field."
        );
        return;
      }

      if (
        preparationDate.getTime() >=
        expiryDate.getTime()
      ) {
        setError(
          "Preparation time must be earlier than the expiry time."
        );
        return;
      }

      preparedAt =
        preparationDate.toISOString();
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/listings`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: form.title.trim(),
            description:
              form.description.trim(),
            foodType: form.foodType,
            quantity: Number(form.quantity),
            unit: form.unit,
            pickupAddress:
              form.pickupAddress.trim(),
            city: form.city.trim(),
            preparedAt,
            expiresAt:
              expiryDate.toISOString(),
            storageConditions:
              form.storageConditions.trim(),
            allergenInfo:
              form.allergenInfo.trim(),
          }),
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          `The server returned a non-JSON response (HTTP ${response.status}). Check the API address and backend route.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to create donation."
        );
      }

      setForm({ ...initialForm });
      setShowForm(false);
      setSuccess(
        data.message ||
          "Food listing created successfully."
      );
      onCreated();
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="dashboard-panel fb-section"
      id="create-donation"
      aria-labelledby="create-donation-title"
    >
      <div className="listings-heading">
        <div>
          <span className="fb-panel-eyebrow">
            SHARE WHAT YOU HAVE
          </span>

          <h2 id="create-donation-title">
            Create donation
          </h2>

          <p className="fb-panel-description">
            List surplus food with clear pickup
            details, storage guidance, and expiry
            information.
          </p>
        </div>

        <button
          className={
            showForm ? "fb-danger-action" : ""
          }
          type="button"
          disabled={saving}
          onClick={() => {
            if (showForm) {
              setForm({ ...initialForm });
            }

            setShowForm(
              (previous) => !previous
            );
            setError("");
            setSuccess("");
          }}
        >
          {showForm
            ? "Cancel"
            : "Add new donation"}
        </button>
      </div>

      {error && (
        <p className="message" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="message" role="status">
          {success}
        </p>
      )}

      {showForm && (
        <form
          className="fb-donation-form"
          onSubmit={handleSubmit}
        >
          <fieldset disabled={saving}>
            <legend>
              Donation details
            </legend>

            <div className="fb-form-grid">
              <div className="form-group fb-span-2">
                <label htmlFor="donation-title">
                  Title
                </label>

                <input
                  id="donation-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="For example: Fresh vegetable soup"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-food-type"
                >
                  Food type
                </label>

                <select
                  id="donation-food-type"
                  name="foodType"
                  value={form.foodType}
                  onChange={handleChange}
                >
                  <option value="packaged">
                    Packaged
                  </option>
                  <option value="cooked">
                    Cooked
                  </option>
                  <option value="produce">
                    Produce
                  </option>
                  <option value="bakery">
                    Bakery
                  </option>
                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-quantity"
                >
                  Quantity
                </label>

                <input
                  id="donation-quantity"
                  name="quantity"
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-unit"
                >
                  Unit
                </label>

                <select
                  id="donation-unit"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                >
                  <option value="items">
                    Items
                  </option>
                  <option value="kg">
                    Kilograms
                  </option>
                  <option value="litres">
                    Litres
                  </option>
                  <option value="portions">
                    Portions
                  </option>
                </select>
              </div>

              <div className="form-group fb-span-2">
                <label
                  htmlFor="donation-address"
                >
                  Pickup address
                </label>

                <textarea
                  id="donation-address"
                  name="pickupAddress"
                  value={
                    form.pickupAddress
                  }
                  onChange={handleChange}
                  maxLength={500}
                  rows={3}
                  placeholder="Building, street, area, city, and postal code"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-city"
                >
                  City
                </label>

                <input
                  id="donation-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="City"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-prepared"
                >
                  Prepared at (optional)
                </label>

                <input
                  id="donation-prepared"
                  name="preparedAt"
                  type="datetime-local"
                  value={
                    form.preparedAt
                  }
                  onChange={handleChange}
                />

                <p className="fb-field-help">
                  Select only if the food has
                  already been prepared.
                </p>
              </div>

              <div className="form-group">
                <label
                  htmlFor="donation-expiry"
                >
                  Expires at
                </label>

                <input
                  id="donation-expiry"
                  name="expiresAt"
                  type="datetime-local"
                  value={
                    form.expiresAt
                  }
                  onChange={handleChange}
                  required
                />

                <p className="fb-field-help">
                  Choose a future date and
                  time.
                </p>
              </div>

              <div className="form-group fb-span-2">
                <label
                  htmlFor="donation-storage"
                >
                  Storage conditions
                </label>

                <textarea
                  id="donation-storage"
                  name="storageConditions"
                  value={
                    form.storageConditions
                  }
                  onChange={handleChange}
                  maxLength={500}
                  rows={2}
                  placeholder="For example: Keep refrigerated below 5°C"
                  required
                />
              </div>

              <div className="form-group fb-span-2">
                <label
                  htmlFor="donation-description"
                >
                  Description (optional)
                </label>

                <textarea
                  id="donation-description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  maxLength={1000}
                  rows={3}
                  placeholder="Add helpful details about the food."
                />
              </div>

              <div className="form-group fb-span-2">
                <label
                  htmlFor="donation-allergens"
                >
                  Allergen information
                  (optional)
                </label>

                <textarea
                  id="donation-allergens"
                  name="allergenInfo"
                  value={
                    form.allergenInfo
                  }
                  onChange={handleChange}
                  maxLength={500}
                  rows={2}
                  placeholder="For example: Contains nuts, dairy, or gluten"
                />
              </div>
            </div>

            <div className="fb-form-actions">
              <button type="submit">
                {saving
                  ? "Creating donation..."
                  : "Create donation"}
              </button>

              <button
                className="fb-secondary-button"
                type="button"
                disabled={saving}
                onClick={() => {
                  setForm({
                    ...initialForm,
                  });
                  setError("");
                  setSuccess("");
                }}
              >
                Clear form
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}


