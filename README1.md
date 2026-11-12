# 🍲 FoodBridge

**FoodBridge** is a full-stack food-sharing platform that connects food donors, NGOs/food banks, volunteers, and administrators. It helps reduce food waste by making surplus food visible, coordinating donation requests, and managing volunteer pickups.

Live frontend: https://abhinav16kumar.github.io/foodbridge/  
Backend API: https://foodbridge1-7x4q.onrender.com

---

## 🌱 About FoodBridge

FoodBridge aims to bridge the gap between surplus food and communities that need it.

Donors can list surplus food, NGOs and food banks can request available donations, volunteers can help with pickups, and administrators can monitor and manage platform activity.

The platform follows the journey:

**Share food → Bridge the gap → Welcome more**

- **Donors** share surplus food.
- **Volunteers** help collect and deliver food.
- **Community organizations** receive and distribute food.
- **Admins** manage users, listings, and platform operations.

---

## ✨ Features

### Authentication
- User registration
- Email and password login
- JWT-based authentication
- Role-based access control
- Protected API routes

### Donor features
- Create food donation listings
- View personal listings
- Receive and manage donation requests
- Mark listings as completed

### NGO / Food bank features
- Browse available food listings
- Request available donations
- Track donation request status
- Rate volunteers after completion

### Volunteer features
- View available food listings
- Accept pickup requests
- View assigned pickups
- Update pickup or delivery status

### Admin features
- View and manage listings
- Review pending volunteers
- Manage platform users and activity
- Monitor listings and requests

### Notifications
- Receive platform notifications
- View notification history
- Mark notifications as read

---

## 🧑‍🤝‍🧑 User roles

| Role | Purpose |
|---|---|
| **Donor** | Lists surplus food and responds to NGO requests |
| **NGO / Food bank** | Requests available food and coordinates distribution |
| **Volunteer** | Picks up and delivers food donations |
| **Admin** | Manages listings, users, volunteers, and platform operations |

---

## 🛠️ Tech stack

### Frontend
- React
- Vite
- JavaScript
- CSS
- GitHub Pages

### Backend
- Node.js
- Express.js
- JSON Web Tokens (JWT)
- REST API

### Database
- Azure SQL Database

### Deployment
- GitHub Pages for frontend
- Render for backend
- Azure SQL Database for data storage

---

## 🗂️ Project structure

```text
foodbridge/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AvailableListings.jsx
│   │   ├── CreateDonation.jsx
│   │   ├── DonationRequests.jsx
│   │   ├── MyListings.jsx
│   │   ├── NgoRequests.jsx
│   │   ├── AvailablePickups.jsx
│   │   ├── Notifications.jsx
│   │   ├── Adminlistings.jsx
│   │   └── PendingVolunteers.jsx
│   ├── .env.production
│   └── vite.config.js
├── backend/
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
```

---

## ⚙️ Environment variables

### Frontend

Create `frontend/.env.production`:

```env
VITE_API_URL=[https://foodbridge1-7x4q.onrender.com](https://foodbridge1-7x4q.onrender.com)
```

### Backend

Configure the following variables in Render:

```env
AZURE_SQL_SERVER=your-azure-sql-server
AZURE_SQL_DATABASE=your-database-name
AZURE_SQL_USER=your-database-user
AZURE_SQL_PASSWORD=your-database-password
AZURE_SQL_PORT=1433
JWT_SECRET=your-strong-secret-key
PORT=5000
```

Never commit real passwords, JWT secrets, or database credentials to GitHub.

---

## 🚀 Run locally

### 1. Clone the repository

```bash
git clone [https://github.com/abhinav16kumar/foodbridge.git](https://github.com/abhinav16kumar/foodbridge.git)
cd foodbridge
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the frontend

```bash
npm run dev
```

### 4. Install backend dependencies

Open a new terminal:

```bash
cd backend
npm install
```

### 5. Start the backend

```bash
npm start
```

---

## 🌐 Deployment

### Frontend

The frontend is automatically deployed to GitHub Pages using GitHub Actions.

Deployment workflow:

```text
.github/workflows/deploy.yml
```

The workflow:

1. Checks out the repository.
2. Installs frontend dependencies.
3. Builds the React application.
4. Uploads the production build.
5. Deploys it to GitHub Pages.

Live frontend:

```text
[https://abhinav16kumar.github.io/foodbridge/](https://abhinav16kumar.github.io/foodbridge/)
```

### Backend

The backend is deployed on Render.

Live backend:

```text
[https://foodbridge1-7x4q.onrender.com](https://foodbridge1-7x4q.onrender.com)
```

---

## 🔌 API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate a user |
| `GET` | `/api/auth/me` | Get the logged-in user |
| `GET` | `/api/listings` | Get available listings |
| `POST` | `/api/listings` | Create a food listing |
| `GET` | `/api/listings/mine` | Get listings created by the donor |
| `POST` | `/api/requests` | Create a donation request |
| `GET` | `/api/requests/donor` | Get requests for a donor |
| `GET` | `/api/requests/ngo` | Get requests for an NGO |
| `GET` | `/api/pickups` | Get available pickups |
| `GET` | `/api/notifications` | Get user notifications |
| `GET` | `/api/listings/admin` | Get listings for admin |

Protected routes require a JWT token in the request header:

```text
Authorization: Bearer <token>
```

---

## 🗄️ Database design

FoodBridge uses **Azure SQL Database**, a managed relational database service built on SQL Server.

It stores:

- Users and roles
- Food listings
- Donation requests
- Volunteer assignments
- Pickup records
- Notifications
- Ratings and feedback

The relational structure connects donors, NGOs, volunteers, listings, requests, and pickups.

---

## 🎨 UI/UX design

FoodBridge uses a warm, community-focused visual theme:

- Cream background
- Leafy green accents
- Harvest-orange highlights
- Clear role-based navigation
- Simple, accessible forms
- Mobile-responsive layout

The design reflects the journey from surplus food to shared community meals.

---

## 🔐 Security notes

- Passwords should be hashed before storage.
- JWT tokens are used for authenticated API requests.
- Database credentials are stored as environment variables.
- API routes are protected using Bearer-token authentication.
- Do not expose database passwords or JWT secrets in the frontend or GitHub repository.

---

## 📈 Future improvements

- Add real-time notifications
- Add food expiry reminders
- Add image uploads for food listings
- Add map-based pickup locations
- Add donation impact statistics
- Add email verification
- Add admin analytics dashboard
- Add mobile application support

---

## 👤 Author

**Abhinav Kumar**  
GitHub: https://github.com/abhinav16kumar

---

## 📄 License

This project is for educational and demonstration purposes.
