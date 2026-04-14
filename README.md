<div align="center">

# 🎓 Eduhub Backend API

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**A powerful, multi-tenant backend API designed to streamline academic resource management, institutional administration, and role-based collaboration for colleges and universities.**

</div>

## 🏗️ Core Architecture

* **🏢 Multi-Tenancy (Data Isolation):** True tenant isolation. Core models (`User`, `Notice`, `Department`, etc.) are securely scoped using `institutionId` constraints, allowing multiple colleges to operate independently on the same platform.
* **🔐 Role-Based Access Control (RBAC):** Gated by JWTs, access is divided into four strict tiers: `SUPER_ADMIN` (Platform Owner), `COLLEGE_ADMIN` (Institution Manager), `TEACHER`, and `STUDENT`.
* **⚡ Atomic Transactions:** Leverages Prisma `$transaction` for complex operations (e.g., creating a user while logging password history) to guarantee data integrity and prevent orphaned records.

## 🛠️ Tech Stack Breakdown

* **Core Backend:** NestJS, TypeScript, Node.js
* **Database & ORM:** PostgreSQL, Prisma ORM
* **Cloud & Storage:** Supabase Storage *(Used for storing library resources and assignment submissions)*
* **Deployment:** Render 
* **Security & Auth:** Passport-JWT, Bcrypt, NestJS Throttler
* **Email & Communications:** Resend *(System invitations and password recovery)*

---

## 🚀 Module Features

## 🔐 Authentication & Onboarding

Eduhub implements a tiered onboarding strategy to maintain institutional data isolation and security across all user levels.

### 🏛️ Role-Based Onboarding

* **Student (Self-Registration):** Students sign up directly by providing a unique institutional **Join-Code**, which automatically links their profile to the correct college entity.
* **Teacher (Invite-Only):** Access is restricted to email invitations sent by a `COLLEGE_ADMIN`. These invitations utilize secure, unique tokens that expire after 7 days.
* **College Admin (Managed):** Accounts are created by a `SUPER_ADMIN` to oversee institutional tenants. Upon their first login, admins must complete a mandatory password reset flow to secure the account.

### 🔑 Security Standards

* **Identity & Access:** Leverages **Passport-JWT** for stateless authentication, extracting and verifying user identity and roles for every API request.
* **Multi-Tenant Scoping:** Enforces strict email uniqueness within a specific institution, allowing for distinct user identities across different college tenants.
* **Brute-Force Protection:** Sensitive endpoints—including Login, Registration, and Password Resets—are protected by **NestJS Throttler** to prevent automated attacks.

### 📚 Library & Discussions
* **Cloud Storage:** Integrated with Supabase Storage for secure handling of academic resources and assignment files.
* **Threaded Discussions:** Features a strict 2-level nested commenting system supporting root comments and direct replies.
* **Engagement:** Students can upvote high-quality library resources to improve content visibility.

### 📝 Assignment Lifecycle
* **End-to-End Workflow:** Full lifecycle support from teacher creation to student submission and final grading.
* **Dynamic Deadlines:** Automatic `isLate` calculation based on the assignment's `dueDate` at the moment of submission.
* **Integrated Grading:** Dedicated workflows for teachers to provide feedback and official grades on student work.

### 📢 Notice Board
* **Categorized Updates:** Supports both General institutional notices and Subject-specific academic alerts.
* **Automated Cleanup:** An integrated Cron job runs nightly at midnight to purge archived notices that have been expired for over 7 days.

## 🛡️ Security & Performance Measures

Eduhub is engineered with enterprise-grade security protocols to safeguard institutional data and ensure high system availability.

### 🚦 Strategic Throttling (Rate Limiting)
To mitigate brute-force and DDoS attacks, the API implements strict request limits using **NestJS Throttler**:
* **Authentication:** Login attempts are restricted to **5 requests per 15 minutes** to prevent account takeover.
* **Onboarding:** Registration is capped at **3 requests per hour** to deter automated bot sign-ups.
* **General Traffic:** Standard API endpoints allow up to **100 requests per minute** to ensure fair resource distribution.

### 🔒 Password Integrity & History
The system enforces a strict "no-reuse" policy to enhance user account security:
* **Historical Tracking:** Every password change is logged in a dedicated `PasswordHistory` table.
* **Reuse Prevention:** Custom logic validates new passwords against the user’s **last 5 used passwords**, preventing the recycling of compromised or older credentials.

### 📑 Data Integrity & Retention
Rather than immediate permanent removal, the platform utilizes a **Soft Delete** pattern for sensitive data like notices:
* **`deletedAt` Implementation:** Deleted records are timestamped rather than removed from the database, allowing for accidental-deletion recovery and audit trails.
* **Cascading Cleanups:** Soft-deleted data is excluded from standard API responses but remains available for background archival processes or automated midnight cleanup jobs.

## 📖 API Documentation

## 9. API Documentation & Testing

**Swagger UI (Recommended)**
This project uses Swagger for auto-generated, interactive API documentation. Once the server is running, you can view all endpoints, expected payloads, and test them directly at:
* 👉 `http://localhost:3000/api`

**Postman Collection**
For convenience, a complete Postman collection with pre-configured requests and environments is included in this repository.
1. Locate the `Eduhub_API_Collection.json` file in the root directory.
2. Open Postman and click **Import**.
3. Drag and drop the file to instantly load all API routes.

## 8. Local Setup & Installation

Follow these steps to get the Eduhub backend up and running on your local machine.

### Prerequisites
Before you begin, ensure you have the following installed and configured:
* **Node.js** (v18 or higher recommended)
* **Docker** & **Docker Compose** (to run the local PostgreSQL database)
* **Supabase Account** (for media and file storage buckets)

### Environment Variables

For security reasons, actual environment variables are not committed to the repository. Instead, a template file is provided. 

To set up your local environment, you need to create a `.env` file based on the provided `.env.example` file:

**1. Copy the example file:**
```bash
cp .env.example .env
```

**2. Configure your variables:**
Open the newly created `.env` file in your code editor and replace the placeholder values with your actual local or production credentials.

The file includes configuration blocks for:

* Server & App Configuration (Ports, CORS origins)
* Database Configuration (PostgreSQL connection string)
* JWT Authentication (Secret keys)
* Supabase S3 Storage (Bucket credentials for file uploads)
* Email Configuration (SMTP/Gmail or Resend keys)

### Installation Steps

**1. Install Dependencies**
```bash
npm install
```

**2. Start Database**
```bash
docker-compose up -d
```

**3. Setup the Database Schema**
```bash
npx prisma db push
```

**4. Seed the Database**
```bash
npm run prisma:seed
```

**5. Start the Application**
```bash
npm run start:dev
```

The server will be available at `http://localhost:3000`.
