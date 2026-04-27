# 🚀 Saraha App (Backend API)

A scalable and secure backend for a Saraha-style anonymous messaging application built with **Node.js, Express, and MongoDB**.

---

## 📌 Features

* 🔐 Authentication & Authorization (JWT)
* 🔁 Access & Refresh Tokens
* 🚫 Token Revocation (Logout from all devices)
* 📩 Anonymous Messaging System
* 🖼️ Image Upload Support (Cloudinary)
* 🛡️ Security Middleware (Helmet, Rate Limit, Mongo Sanitize)
* ✅ Request Validation (Joi)
* 📂 Modular Project Structure
* 🧹 TTL Cleanup for Revoked Tokens
* 🧠 Password History & Reuse Prevention

---

## 🏗️ Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB + Mongoose**
* **JWT (jsonwebtoken)**
* **Bcrypt**
* **Cloudinary**
* **Joi**
* **Pino (Logging)**

---

## 📂 Project Structure

```
src/
│
├── modules/
│   ├── authModule/
│   ├── userModule/
│   └── messageModule/
│
├── middleware/
├── DB/
├── utils/
├── config/
└── app.js
```

---

## 🔐 Authentication Flow

* User Signup with email confirmation (OTP)
* Secure password hashing with bcrypt
* Login returns:

  * Access Token (short-lived)
  * Refresh Token (long-lived)
* Token revocation system using `jti`
* Logout from all devices supported

---

## 🔁 Refresh Token Flow

* Verify refresh token
* Check if revoked
* Validate user status
* Generate new access token

---

## 📩 Messaging System

* Send anonymous or identified messages
* Support for:

  * Text messages
  * Image attachments
* Pagination for message retrieval
* Read status tracking

---

## 🛡️ Security

* Rate limiting for auth endpoints
* MongoDB injection protection (`express-mongo-sanitize`)
* Secure headers (`helmet`)
* Password reuse prevention
* Credentials change invalidates old tokens
* CORS whitelist support

---

## 🧠 Best Practices Implemented

* Centralized error handling
* Clean API responses (no sensitive data exposure)
* Token factory pattern
* TTL index for auto-cleanup of revoked tokens
* Consistent naming and structure

---

## ⚙️ Environment Variables

Create a `.env` file:

```
PORT=3000
MONGO_URI=your_mongo_connection
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
SALT_ROUNDS=10
ALLOWED_ORIGINS=http://localhost:3000
```

---

## ▶️ Running the App

```bash
npm install
npm run dev
```

---

## 📬 API Endpoints (Examples)

### Auth

* `POST /auth/signup`
* `POST /auth/signin`
* `POST /auth/refresh-token`

### User

* `GET /user/profile`
* `PATCH /user/update-profile`
* `PATCH /user/update-password`

### Messages

* `POST /message/send`
* `GET /message/inbox`

---

## 📈 Future Improvements

* Redis caching
* Queue system (BullMQ)
* Unit & Integration Testing (Jest)
* Docker support
* API Documentation (Swagger)
* WebSockets for real-time messaging

---

## 👨‍💻 Author

**Ibrahim Azam**

Backend Developer (Node.js)

---

## ⭐ Notes

This project is built as a learning + production-ready backend combining real-world practices in authentication, security, and scalable API design.

---
