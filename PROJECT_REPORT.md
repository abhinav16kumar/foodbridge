# FoodBridge Project Report

## 1. Project Title

**FoodBridge — A Food Sharing and Donation Platform**

## 2. Introduction

FoodBridge is a web-based platform designed to reduce food waste and support community food distribution. It connects individuals and organizations with surplus food to NGOs, food banks, and volunteers who can help distribute it to people in need.

The platform provides separate workflows for donors, NGOs, volunteers, and administrators. Donors can list surplus food, NGOs can request donations, volunteers can manage pickups, and administrators can monitor platform activity.

## 3. Problem Statement

A large amount of edible food is wasted while many individuals and communities face food insecurity. One major challenge is the lack of a simple system to connect surplus food with organizations that can distribute it efficiently.

FoodBridge addresses this problem by providing a centralized platform where donors, NGOs, volunteers, and administrators can coordinate food donations and pickups.

## 4. Objectives

- Reduce food waste by connecting surplus food with community organizations.
- Provide a simple platform for donors to list surplus food.
- Enable NGOs and food banks to request available donations.
- Allow volunteers to manage food pickups and deliveries.
- Provide administrators with tools to manage users, listings, and platform activity.
- Implement secure authentication and role-based access control.

## 5. Proposed System

FoodBridge is a full-stack web application consisting of:

- A React frontend
- A Node.js and Express backend
- An Azure SQL Database
- JWT-based authentication
- GitHub Pages deployment for the frontend
- Render deployment for the backend

The system supports four user roles:

1. Donor
2. NGO / Food bank
3. Volunteer
4. Admin

## 6. Modules

### Authentication Module
Handles user registration, login, JWT token generation, and role-based access.

### Donor Module
Allows donors to create food listings, view their listings, receive requests, and complete donations.

### NGO Module
Allows NGOs to browse listings, request donations, track requests, and rate volunteers.

### Volunteer Module
Allows volunteers to view available listings, accept pickup requests, and manage pickups.

### Admin Module
Allows administrators to manage listings, review volunteers, and monitor platform activity.

### Notification Module
Sends and manages notifications related to requests, pickups, and platform activity.

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Authentication | JWT |
| Database | Azure SQL Database |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |
| Version control | Git and GitHub |

## 8. Database Design

FoodBridge uses Azure SQL Database to store structured application data.

Main data categories include:

- Users
- Food listings
- Donation requests
- Volunteer assignments
- Pickups
- Notifications
- Ratings

The database maintains relationships between donors, NGOs, volunteers, listings, requests, and pickups.

## 9. System Architecture

```text
React Frontend
      ↓
GitHub Pages
      ↓
Node.js / Express Backend
      ↓
Render
      ↓
Azure SQL Database
```

The frontend sends HTTPS requests to the backend API. The backend validates authentication, processes business logic, interacts with Azure SQL Database, and returns JSON responses.

## 10. Deployment

The frontend is deployed using GitHub Pages through GitHub Actions.

The backend is deployed on Render.

The database is hosted on Azure SQL Database.

Live frontend:

https://abhinav16kumar.github.io/foodbridge/

Live backend:

https://foodbridge1-7x4q.onrender.com

## 11. Security

- Passwords are stored using secure hashing.
- JWT tokens protect authenticated routes.
- Database credentials are stored in environment variables.
- API routes require Bearer-token authentication.
- Sensitive credentials are not exposed in frontend code.

## 12. Future Scope

- Add real-time notifications.
- Add food expiry tracking.
- Add image upload support.
- Add map-based pickup locations.
- Add analytics for food saved and donations completed.
- Add email and SMS notifications.
- Develop a mobile application.

## 13. Conclusion

FoodBridge demonstrates how technology can help reduce food waste and improve community food distribution. By connecting donors, NGOs, volunteers, and administrators in one platform, it creates a structured workflow for sharing surplus food responsibly.
