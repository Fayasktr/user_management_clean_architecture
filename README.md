# Dual-Database User & Admin Management System
> **Backend Stack:** Node.js, TypeScript, Express.js  
> **Design Pattern:** **Repository Pattern** with Dependency Inversion (Clean Architecture)  
> **Architecture Principles:** **SOLID Principles** strictly applied  
> **Databases:** Dual DB Architecture (SQL: PostgreSQL/MySQL via Prisma + NoSQL: MongoDB via Mongoose)  
> **Authentication & Authorization:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)

---

## 📑 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Dual Database Strategy: What Goes Where & Why?](#2-dual-database-strategy-what-goes-where--why)
   - [Visual Data Boundary](#21-visual-data-boundary)
   - [What Data Goes into SQL? (The Source of Truth)](#22-what-data-goes-into-sql-the-source-of-truth)
   - [What Data Goes into MongoDB? (The Event & Log Store)](#23-what-data-goes-into-mongodb-the-event--log-store)
   - [Cross-Database Linking Strategy](#24-cross-database-linking-strategy)
3. [Database Design & Schemas](#3-database-design--schemas)
   - [SQL Schema (Prisma)](#31-sql-schema-prisma)
   - [MongoDB Schemas (Mongoose)](#32-mongodb-schemas-mongoose)
4. [SOLID Principles Applied to this Architecture](#4-solid-principles-applied-to-this-architecture)
   - [S — Single Responsibility Principle (SRP)](#41-s--single-responsibility-principle-srp)
   - [O — Open/Closed Principle (OCP)](#42-o--openclosed-principle-ocp)
   - [L — Liskov Substitution Principle (LSP)](#43-l--liskov-substitution-principle-lsp)
   - [I — Interface Segregation Principle (ISP)](#44-i--interface-segregation-principle-isp)
   - [D — Dependency Inversion Principle (DIP)](#45-d--dependency-inversion-principle-dip)
5. [System Architecture & Data Flows](#5-system-architecture--data-flows)
   - [Repository Pattern Architectural Layering](#51-repository-pattern-architectural-layering)
   - [User Registration Flow](#52-user-registration-flow)
   - [User & Admin Login Flow](#53-user--admin-login-flow)
   - [JWT Authentication & RBAC Middleware Flow](#54-jwt-authentication--rbac-middleware-flow)
   - [Admin User Management (CRUD) Flow](#55-admin-user-management-crud-flow)
   - [Dual Database Consistency Strategy](#56-dual-database-consistency-strategy)
6. [Folder Structure](#6-folder-structure)
7. [Step-by-Step Setup Guide](#7-step-by-step-setup-guide)
   - [Prerequisites](#71-prerequisites)
   - [Project Initialization](#72-project-initialization)
   - [Dependency Installation](#73-dependency-installation)
   - [TypeScript Configuration](#74-typescript-configuration)
   - [Environment Variables Setup](#75-environment-variables-setup)
   - [Database Setup & Migrations](#76-database-setup--migrations)
   - [Running the Server](#77-running-the-server)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Core Implementation Code Samples](#9-core-implementation-code-samples)
   - [Repository Interfaces (Contracts)](#91-repository-interfaces-contracts)
   - [SQL Repository (Prisma Implementation)](#92-sql-repository-prisma-implementation)
   - [MongoDB Repository (Mongoose Implementation)](#93-mongodb-repository-mongoose-implementation)
   - [Service Layer with Dependency Injection](#94-service-layer-with-dependency-injection)
   - [Admin CRUD Service Layer](#95-admin-crud-service-layer)
   - [JWT & Role-Based Middleware](#96-jwt--role-based-middleware)
10. [Testing & Verification Guide](#10-testing--verification-guide)

---

## 1. Project Overview

This project is an enterprise-grade **User Management API** designed with a **Repository Pattern**, **Dual-Database architecture** (Polyglot Persistence), and strict adherence to **SOLID design principles**, built using **Node.js**, **TypeScript**, and **Express.js**.

### Core Capabilities:
- **Role-Based Access Control (RBAC):** Supports distinct roles (`USER` and `ADMIN`).
- **User Authentication:** Sign up, log in, secure session token issuance using JWTs, and password hashing with `bcrypt`.
- **Admin User Management (CRUD):** Admins can view all users (with pagination, search, and filtering), create new users, update user profiles/roles, and deactivate or delete users.
- **Dual Database Persistence:** Relational database (SQL) manages transactional user identity and credentials; MongoDB handles activity logs, audit trails, and security event histories.
- **Repository Pattern & SOLID:** Decouples business logic from database ORMs (Prisma & Mongoose). Services depend on repository interfaces, making the codebase clean, maintainable, and 100% testable.

---

## 2. Dual Database Strategy: What Goes Where & Why?

In polyglot persistence, we never duplicate data without purpose. Each database engine is chosen based on its distinct architectural strengths:

### 2.1 Visual Data Boundary

```
┌───────────────────────────────────────────────────────────────────┐
│                       NODE.JS APPLICATION                         │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │   SQL (PostgreSQL/MySQL)  │     │          MongoDB          │
   ├───────────────────────────┤     ├───────────────────────────┤
   │ • Transactional Core      │     │ • High-Write Logs         │
   │ • User Credentials & Auth │     │ • Security Audits         │
   │ • Roles & Permissions     │     │ • Dynamic Preferences     │
   │ • Strict ACID & Unique    │     │ • Append-Only Event Stream│
   └───────────────────────────┘     └───────────────────────────┘
```

---

### 2.2 What Data Goes into SQL? (The "Source of Truth")

SQL is used for **structured, transactional, mission-critical identity data**:

| Field Name | Type | Purpose | Why SQL? |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` (Primary Key) | Globally unique identifier | Fast indexing and standard relational key. |
| `name` | `VARCHAR(100)` | User's full name | Structured string data. |
| `email` | `VARCHAR(255)` (UNIQUE) | Login credential | **Strict Unique Constraint** prevents race-condition duplicate accounts. |
| `passwordHash` | `VARCHAR(255)` | Bcrypt hash | Critical security data; ACID compliance ensures atomic updates. |
| `role` | `ENUM('USER', 'ADMIN')` | Authorization role | Strictly enforced at DB level (prevents invalid role injections). |
| `isActive` | `BOOLEAN` | Account status | Fast filtering for active/suspended users. |
| `createdAt`, `updatedAt` | `TIMESTAMP` | System timestamps | Auditing record lifecycle. |

**Why SQL for this?**
1. **ACID Guarantees:** When a user registers or changes a password, the transaction must either 100% succeed or fail.
2. **Data Integrity:** Strict foreign keys and unique constraints ensure no two users can ever share an email, even under concurrent requests.

---

### 2.3 What Data Goes into MongoDB? (The "Event & Log Store")

MongoDB is used for **append-only, high-frequency, semi-structured event and log data**:

| Collection | What It Stores | Why MongoDB? |
| :--- | :--- | :--- |
| **`activity_logs`** | Login success/failure, IP address, user-agent, device info, timestamps. | • **High write throughput:** Logged on *every* request or login attempt without locking the SQL table.<br>• **TTL Indexes:** Auto-expire old logs after 90 days (`expires: '90d'`). |
| **`user_audits`** | Admin actions: Who edited whom, previous values vs new values (`diff`). | • **Flexible JSON:** Admin changes vary (changing a role looks different from changing a status). MongoDB accommodates polymorphic JSON without schema migrations. |
| **`user_preferences`** *(Optional)* | Custom settings, dark mode, bio, avatars, notification flags. | • Schema-free: Adding new user preference fields does **not** require running SQL database migrations. |

---

### 2.4 Cross-Database Linking Strategy

Databases are never joined across network boundaries. Instead, the **SQL User `id` (UUID)** acts as the foreign reference string stored in MongoDB:

```
[SQL users Table]
id: "a3f5b28c-71d2-4b2e-9d2a-89f4b3e210aa" <───────┐
email: "john@example.com"                           │ (Referenced by ID)
role: "USER"                                        │
                                                    │
[MongoDB activity_logs Collection]                  │
{                                                   │
  "_id": ObjectId("6501abc..."),                    │
  "userId": "a3f5b28c-71d2-4b2e-9d2a-89f4b3e210aa", ─┘
  "action": "LOGIN_SUCCESS",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": ISODate("2026-09-17T10:00:00Z")
}
```

---

## 3. Database Design & Schemas

### 3.1 SQL Schema (Prisma)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

model User {
  id           String   @id @default(uuid())
  name         String   @db.VarChar(100)
  email        String   @unique @db.VarChar(255)
  passwordHash String   @db.VarChar(255)
  role         Role     @default(USER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // High-performance composite and lookup indexes
  @@index([email])
  @@index([role, isActive])
  @@map("users")
}
```

---

### 3.2 MongoDB Schemas (Mongoose)

#### Collection 1: `activity_logs`
```typescript
// src/models/mongo/ActivityLog.ts
import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId?: string;          // Matches SQL User.id (nullable for failed unregistered attempts)
  email?: string;
  action: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, index: true },
    email: { type: String, index: true },
    action: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, expires: '90d' }, // Auto-delete logs after 90 days (TTL index)
  },
  { versionKey: false }
);

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema, 'activity_logs');
```

#### Collection 2: `user_audits`
```typescript
// src/models/mongo/UserAudit.ts
import { Schema, model, Document } from 'mongoose';

export interface IUserAudit extends Document {
  adminId: string;          // SQL User.id of the admin who performed the action
  targetUserId: string;     // SQL User.id of the user being modified
  action: 'ADMIN_CREATE_USER' | 'ADMIN_UPDATE_USER' | 'ADMIN_DELETE_USER';
  changes?: Record<string, any>; // Delta (e.g. { role: { old: 'USER', new: 'ADMIN' } })
  createdAt: Date;
}

const UserAuditSchema = new Schema<IUserAudit>(
  {
    adminId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const UserAudit = model<IUserAudit>('UserAudit', UserAuditSchema, 'user_audits');
```

---

## 4. SOLID Principles Applied to this Architecture

The **SOLID** principles are the cornerstone of this codebase:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SOLID PRINCIPLES                              │
├────────────────────────────────────────────────────────────────────────┤
│ S - Single Responsibility │ Each class has ONE reason to change        │
│ O - Open / Closed         │ Open for extension, closed for mod         │
│ L - Liskov Substitution   │ Any repo implementation can swap in        │
│ I - Interface Segregation │ Granular, focused repository contracts     │
│ D - Dependency Inversion  │ High-level services depend on abstractions │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 S — Single Responsibility Principle (SRP)
> *A class or module should have one, and only one, reason to change.*

- **Controllers (`AuthController`, `AdminController`):** Only handle HTTP parsing, status codes, query strings, and responses. If HTTP specs change, only controllers change.
- **Services (`AuthService`, `AdminService`):** Only contain business rules (e.g., verifying password hashes, preventing admins from deleting themselves, coordinating audit trails).
- **Repositories (`PrismaUserRepository`):** Only handle SQL queries via Prisma. They know nothing about HTTP or business workflows.
- **Logging Repositories (`MongoActivityLogRepository`):** Only handle writing log documents into MongoDB.

---

### 4.2 O — Open/Closed Principle (OCP)
> *Software entities should be open for extension, but closed for modification.*

- We program against the interface `IUserRepository`.
- If you want to add a **Redis Caching Layer** or switch from **Prisma (PostgreSQL)** to **TypeORM (MySQL)**, you simply create a new implementation:
  ```typescript
  export class CachedUserRepository implements IUserRepository {
    constructor(private sqlRepo: IUserRepository, private redisClient: any) {}

    async findById(id: string): Promise<User | null> {
      const cached = await this.redisClient.get(`user:${id}`);
      if (cached) return JSON.parse(cached);

      const user = await this.sqlRepo.findById(id);
      if (user) await this.redisClient.set(`user:${id}`, JSON.stringify(user));
      return user;
    }
    // ... implement remaining methods without changing AuthService!
  }
  ```
- **Benefit:** You extend the system with caching without modifying existing service code!

---

### 4.3 L — Liskov Substitution Principle (LSP)
> *Subtypes must be substitutable for their base types without altering program correctness.*

- `AuthService` and `AdminService` accept any implementation conforming to `IUserRepository`:
  ```typescript
  class AuthService {
    constructor(private userRepo: IUserRepository, private logRepo: IActivityLogRepository) {}
  }
  ```
- In automated unit tests, you can pass an `InMemoryMockUserRepository`:
  ```typescript
  const mockUserRepo = new InMemoryMockUserRepository();
  const mockLogRepo = new InMemoryMockLogRepository();
  const authService = new AuthService(mockUserRepo, mockLogRepo);
  ```
- The service behaves identically, without needing a running database during unit testing.

---

### 4.4 I — Interface Segregation Principle (ISP)
> *Clients should not be forced to depend on methods they do not use.*

- We do **not** create one huge, bloated interface:
  ```typescript
  // ❌ BAD: Violates ISP
  interface IUniversalDatabase {
    createUser(): void;
    logActivity(): void;
    createAudit(): void;
    sendEmail(): void;
  }
  ```
- Instead, we segregate into narrow, cohesive contracts:
  ```typescript
  // ✅ GOOD: Focused, Segregated Interfaces
  interface IUserRepository { ... }         // Only user data operations
  interface IActivityLogRepository { ... }  // Only activity logging operations
  interface IAuditLogRepository { ... }     // Only admin auditing operations
  ```
- A service that only needs to record login attempts only injects `IActivityLogRepository`.

---

### 4.5 D — Dependency Inversion Principle (DIP)
> *High-level modules should not depend on low-level modules. Both should depend on abstractions.*

- **High-level module:** `AdminService` (business rules).
- **Low-level modules:** `PrismaClient` (SQL) and `MongooseModel` (Mongo).
- **Abstractions:** `IUserRepository` and `IAuditLogRepository`.

```
❌ Without DIP (Tight Coupling):
   AdminService ───> depends directly on ───> PrismaClient & MongooseModel

✅ With DIP (Clean Architecture):
   AdminService ───> depends on ───> [IUserRepository Interface]
                                             ▲
                                             │ (implements)
                                     PrismaUserRepository ───> PrismaClient
```

#### DIP in Action (Constructor Injection):
```typescript
export class AdminService {
  // Dependencies are INVERTED and INJECTED via constructor
  constructor(
    private userRepo: IUserRepository,
    private auditRepo: IAuditLogRepository
  ) {}

  async deleteUser(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new Error("CANNOT_DELETE_SELF");
    }

    // Call abstraction (not Prisma directly)
    const deletedUser = await this.userRepo.delete(targetUserId);

    // Call abstraction (not Mongoose directly)
    await this.auditRepo.createAudit({
      adminId,
      targetUserId,
      action: 'ADMIN_DELETE_USER',
    });

    return deletedUser;
  }
}
```

---

## 5. System Architecture & Data Flows

### 5.1 Repository Pattern Architectural Layering

```mermaid
graph TD
    Client[HTTP Client / Frontend] -->|Request| Controller[Express Controller]
    Controller -->|DTO / Validated Input| Service[Business Service]
    
    subgraph "Domain Abstraction (Contracts)"
        Service -->|Depends on| IUserRepo[<< Interface >><br/>IUserRepository]
        Service -->|Depends on| ILogRepo[<< Interface >><br/>IActivityLogRepository]
        Service -->|Depends on| IAuditRepo[<< Interface >><br/>IAuditLogRepository]
    end

    subgraph "Data Access Implementations"
        IUserRepo -.->|Implements| PrismaRepo[PrismaUserRepository]
        ILogRepo -.->|Implements| MongoLogRepo[MongoActivityLogRepository]
        IAuditRepo -.->|Implements| MongoAuditRepo[MongoAuditLogRepository]
    end

    PrismaRepo -->|Prisma Client| SQL[(SQL Database<br/>PostgreSQL / MySQL)]
    MongoLogRepo -->|Mongoose Model| Mongo[(MongoDB)]
    MongoAuditRepo -->|Mongoose Model| Mongo
```

---

### 5.2 User Registration Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Frontend
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant UserRepo as IUserRepository (Prisma)
    participant LogRepo as IActivityLogRepository (Mongo)
    participant SQL as SQL DB
    participant Mongo as MongoDB

    Client->>Ctrl: POST /api/auth/register (name, email, password)
    Ctrl->>Svc: register(dto, clientMetadata)
    Svc->>UserRepo: findByEmail(email)
    UserRepo->>SQL: findUnique({ where: { email } })
    SQL-->>UserRepo: null
    UserRepo-->>Svc: null (Email available)
    
    Svc->>Svc: Hash password with bcrypt
    Svc->>UserRepo: create({ name, email, passwordHash, role: "USER" })
    UserRepo->>SQL: prisma.user.create(...)
    SQL-->>UserRepo: createdUser (id, email, name, role)
    UserRepo-->>Svc: createdUser

    Svc->>LogRepo: logActivity({ userId, action: "REGISTER", ip, userAgent })
    LogRepo->>Mongo: ActivityLog.create(...)
    Mongo-->>LogRepo: savedLog
    LogRepo-->>Svc: success

    Svc->>Svc: Generate JWT Token (userId, role)
    Svc-->>Ctrl: { user, token }
    Ctrl-->>Client: 201 Created { user, token }
```

---

### 5.3 User & Admin Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Admin
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant UserRepo as IUserRepository (Prisma)
    participant LogRepo as IActivityLogRepository (Mongo)

    Client->>Ctrl: POST /api/auth/login (email, password)
    Ctrl->>Svc: login(email, password, clientMetadata)
    Svc->>UserRepo: findByEmail(email)
    alt User Not Found
        UserRepo-->>Svc: null
        Svc->>LogRepo: logActivity({ email, action: "LOGIN_FAILED", reason: "User not found" })
        Svc-->>Ctrl: Throw 401 Unauthorized
        Ctrl-->>Client: 401 Invalid Credentials
    else User Exists
        UserRepo-->>Svc: user record (with passwordHash)
        Svc->>Svc: bcrypt.compare(password, user.passwordHash)
        alt Password Mismatch
            Svc->>LogRepo: logActivity({ userId: user.id, action: "LOGIN_FAILED", reason: "Bad password" })
            Svc-->>Ctrl: Throw 401 Unauthorized
            Ctrl-->>Client: 401 Invalid Credentials
        else Password Valid
            Svc->>LogRepo: logActivity({ userId: user.id, action: "LOGIN_SUCCESS", ip, userAgent })
            Svc->>Svc: Generate JWT { userId: user.id, email: user.email, role: user.role }
            Svc-->>Ctrl: { token, user }
            Ctrl-->>Client: 200 OK { token, user }
        end
    end
```

---

### 5.4 JWT Authentication & RBAC Middleware Flow

```mermaid
flowchart TD
    Req([Incoming HTTP Request]) --> AuthHeader{Has 'Authorization: Bearer' Header?}
    AuthHeader -- No --> Err401[401 Unauthorized: Missing Token]
    AuthHeader -- Yes --> VerifyJWT{Verify JWT Signature & Expiration}
    VerifyJWT -- Invalid / Expired --> Err403[403 Forbidden: Invalid Token]
    VerifyJWT -- Valid --> AttachPayload[Attach payload to req.user]
    AttachPayload --> CheckRole{Does route require ADMIN role?}
    CheckRole -- No (User Route) --> Next[Pass to Controller]
    CheckRole -- Yes (Admin Route) --> VerifyAdmin{Is req.user.role == 'ADMIN'?}
    VerifyAdmin -- No --> ErrForbidden[403 Forbidden: Admin privileges required]
    VerifyAdmin -- Yes --> Next
```

---

### 5.5 Admin User Management (CRUD) Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Client
    participant Middleware as Auth & RBAC Middleware
    participant Ctrl as AdminController
    participant Svc as AdminService
    participant UserRepo as IUserRepository (SQL)
    participant AuditRepo as IAuditLogRepository (Mongo)

    Note over Admin, AuditRepo: Admin READ Users (Paginated & Filtered)
    Admin->>Middleware: GET /api/admin/users?page=1&limit=10&search=doe
    Middleware->>Ctrl: Authorized (Role: ADMIN)
    Ctrl->>Svc: getAllUsers({ page: 1, limit: 10, search: "doe" })
    Svc->>UserRepo: findManyWithPagination(params)
    UserRepo-->>Svc: { total, users }
    Svc-->>Ctrl: { total, page, users }
    Ctrl-->>Admin: 200 OK { total, page, users }

    Note over Admin, AuditRepo: Admin UPDATE User (Change Role/Status)
    Admin->>Middleware: PUT /api/admin/users/:id { role: "ADMIN", isActive: true }
    Middleware->>Ctrl: Authorized (Role: ADMIN)
    Ctrl->>Svc: updateUser(adminId, targetId, updateDto)
    Svc->>UserRepo: update(targetId, updateDto)
    UserRepo-->>Svc: updatedUser
    Svc->>AuditRepo: logAdminAction({ adminId, targetUserId: targetId, action: "ADMIN_UPDATE_USER", changes: updateDto })
    AuditRepo-->>Svc: auditLogged
    Svc-->>Ctrl: updatedUser
    Ctrl-->>Admin: 200 OK { message: "User updated successfully", user: updatedUser }

    Note over Admin, AuditRepo: Admin DELETE User
    Admin->>Middleware: DELETE /api/admin/users/:id
    Middleware->>Ctrl: Authorized (Role: ADMIN)
    Ctrl->>Svc: deleteUser(adminId, targetId)
    Svc->>UserRepo: delete(targetId)
    UserRepo-->>Svc: deletedUser
    Svc->>AuditRepo: logAdminAction({ adminId, targetUserId: targetId, action: "ADMIN_DELETE_USER" })
    AuditRepo-->>Svc: auditLogged
    Svc-->>Ctrl: success
    Ctrl-->>Admin: 200 OK { message: "User deleted successfully" }
```

---

### 5.6 Dual Database Consistency Strategy

When writing across both SQL and MongoDB:
1. **Primary Write to SQL:** Always perform the SQL transaction first because relational uniqueness and foreign-key constraints are strictest.
2. **Secondary Write to MongoDB:** Once the SQL transaction commits, append the log or audit record to MongoDB.
3. **Resilience Strategy:** MongoDB log writes are wrapped in non-blocking try/catch blocks within the service so that logging hiccups never block critical user transactions, while warnings are logged for reconciliation.

---

## 6. Folder Structure

```
full-domine-project/
├── prisma/
│   └── schema.prisma                  # SQL database schema (PostgreSQL / MySQL)
├── src/
│   ├── config/
│   │   ├── env.ts                     # Environment configuration & validation
│   │   ├── mongo.ts                   # MongoDB Mongoose connection
│   │   └── sql.ts                     # Prisma Client singleton
│   ├── controllers/
│   │   ├── auth.controller.ts         # User auth endpoints (Register, Login)
│   │   ├── user.controller.ts         # User profile endpoints
│   │   └── admin.controller.ts        # Admin CRUD endpoints
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # JWT verification middleware
│   │   ├── role.middleware.ts         # RBAC role restriction middleware
│   │   ├── error.middleware.ts        # Global Express error handler
│   │   └── validate.middleware.ts     # Input validation middleware
│   ├── models/
│   │   └── mongo/
│   │       ├── ActivityLog.ts         # Mongoose schema for User Activity
│   │       └── UserAudit.ts           # Mongoose schema for Admin Audits
│   ├── repositories/
│   │   ├── interfaces/                # REPOSITORY CONTRACTS (Interfaces)
│   │   │   ├── IUserRepository.ts        # User CRUD contract (SQL)
│   │   │   ├── IActivityLogRepository.ts # User activity log contract (Mongo)
│   │   │   └── IAuditLogRepository.ts    # Admin audit contract (Mongo)
│   │   └── implementations/           # CONCRETE REPOSITORIES
│   │       ├── PrismaUserRepository.ts       # Implements IUserRepository via Prisma
│   │       ├── MongoActivityLogRepository.ts # Implements IActivityLogRepository via Mongoose
│   │       └── MongoAuditLogRepository.ts    # Implements IAuditLogRepository via Mongoose
│   ├── routes/
│   │   ├── auth.routes.ts             # Auth router
│   │   ├── user.routes.ts             # User self-service router
│   │   ├── admin.routes.ts            # Admin CRUD router
│   │   └── index.ts                   # Main route registry
│   ├── services/                      # BUSINESS LOGIC LAYER (Injects Repositories)
│   │   ├── auth.service.ts            # Injected with IUserRepository & IActivityLogRepo
│   │   ├── user.service.ts            # Injected with IUserRepository
│   │   └── admin.service.ts           # Injected with IUserRepository & IAuditLogRepo
│   ├── types/
│   │   └── express.d.ts               # Augmented Express Request with user context
│   ├── utils/
│   │   ├── jwt.ts                     # JWT signing and decoding helpers
│   │   └── password.ts                # Bcrypt hash and compare helpers
│   ├── app.ts                         # Express application setup
│   └── server.ts                      # Server bootstrap & DB connection initializers
├── .env.example                       # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. Step-by-Step Setup Guide

### 7.1 Prerequisites
- **Node.js**: v18.x or v20.x
- **npm** / **yarn** / **pnpm**
- **MongoDB**: Local MongoDB on port `27017` or a MongoDB Atlas connection URI.
- **SQL Database**: PostgreSQL (port `5432`) or MySQL (port `3306`) running locally or via Docker.

---

### 7.2 Project Initialization

```bash
mkdir "full domine project"
cd "full domine project"
npm init -y
```

---

### 7.3 Dependency Installation

```bash
# Production dependencies
npm install express dotenv cors helmet jsonwebtoken bcrypt mongoose @prisma/client

# TypeScript & Development dependencies
npm install -D typescript ts-node nodemon rimraf prisma @types/node @types/express @types/cors @types/jsonwebtoken @types/bcrypt
```

---

### 7.4 TypeScript Configuration

Generate `tsconfig.json`:
```bash
npx tsc --init
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Add scripts in `package.json`:
```json
"scripts": {
  "build": "rimraf dist && tsc",
  "start": "node dist/server.js",
  "dev": "nodemon --watch src --exec ts-node src/server.ts",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev"
}
```

---

### 7.5 Environment Variables Setup

Create `.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# JWT Secret & Expiration
JWT_SECRET=super_secret_enterprise_jwt_key_9876543210
JWT_EXPIRES_IN=24h

# Database 1: SQL (PostgreSQL or MySQL via Prisma)
# PostgreSQL Example:
DATABASE_URL="postgresql://postgres:password@localhost:5432/user_management_db?schema=public"
# Or MySQL Example:
# DATABASE_URL="mysql://root:password@localhost:3306/user_management_db"

# Database 2: MongoDB (via Mongoose)
MONGO_URI="mongodb://localhost:27017/user_management_logs"
```

---

### 7.6 Database Setup & Migrations

1. **Initialize Prisma (SQL):**
   ```bash
   npx prisma init
   ```
2. **Apply the SQL schema migrations:**
   ```bash
   npx prisma migrate dev --name init_users
   npx prisma generate
   ```

---

### 7.7 Running the Server

Start in development mode with live-reloading:
```bash
npm run dev
```

Output:
```
[SQL] Connected to Relational DB via Prisma successfully.
[Mongo] Connected to MongoDB via Mongoose successfully.
[Server] Running on http://localhost:5000
```

---

## 8. API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user/admin & issue JWT |

### 👤 User Self-Service (`/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Authenticated (`USER`, `ADMIN`) | Get current user's profile |
| `PUT` | `/api/users/profile` | Authenticated (`USER`, `ADMIN`) | Update current user's profile |

### 🛠️ Admin User Management (CRUD) (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | **Admin Only** | List users with pagination (`?page=1&limit=10&search=...`) |
| `GET` | `/api/admin/users/:id` | **Admin Only** | Get specific user by ID |
| `POST` | `/api/admin/users` | **Admin Only** | Admin creates a user (role: `USER` or `ADMIN`) |
| `PUT` | `/api/admin/users/:id` | **Admin Only** | Admin updates user role or active status |
| `DELETE`| `/api/admin/users/:id` | **Admin Only** | Admin deletes/deactivates user |
| `GET` | `/api/admin/logs` | **Admin Only** | View MongoDB audit trails and activity logs |

---

## 9. Core Implementation Code Samples

### 9.1 Repository Interfaces (Contracts)

#### `src/repositories/interfaces/IUserRepository.ts`
```typescript
import { User, Role } from '@prisma/client';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface FindUsersFilter {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export interface PaginatedUsersResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  users: Omit<User, 'passwordHash'>[];
}

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(filter: FindUsersFilter): Promise<PaginatedUsersResult>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<User>;
}
```

#### `src/repositories/interfaces/IActivityLogRepository.ts`
```typescript
export interface CreateActivityLogData {
  userId?: string;
  email?: string;
  action: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface IActivityLogRepository {
  createLog(data: CreateActivityLogData): Promise<void>;
  findByUserId(userId: string, limit?: number): Promise<any[]>;
}
```

#### `src/repositories/interfaces/IAuditLogRepository.ts`
```typescript
export interface CreateAuditLogData {
  adminId: string;
  targetUserId: string;
  action: 'ADMIN_CREATE_USER' | 'ADMIN_UPDATE_USER' | 'ADMIN_DELETE_USER';
  changes?: Record<string, any>;
}

export interface IAuditLogRepository {
  createAudit(data: CreateAuditLogData): Promise<void>;
  findAll(limit?: number): Promise<any[]>;
  findByTargetUser(targetUserId: string): Promise<any[]>;
}
```

---

### 9.2 SQL Repository (Prisma Implementation)

#### `src/repositories/implementations/PrismaUserRepository.ts`
```typescript
import { PrismaClient, User, Prisma } from '@prisma/client';
import { 
  IUserRepository, 
  CreateUserData, 
  UpdateUserData, 
  FindUsersFilter, 
  PaginatedUsersResult 
} from '../interfaces/IUserRepository';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? 'USER',
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(filter: FindUsersFilter): Promise<PaginatedUsersResult> {
    const { page, limit, search, role, isActive } = filter;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, rawUsers] = await Promise.all([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: rawUsers,
    };
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

---

### 9.3 MongoDB Repository (Mongoose Implementation)

#### `src/repositories/implementations/MongoActivityLogRepository.ts`
```typescript
import { ActivityLog } from '../../models/mongo/ActivityLog';
import { IActivityLogRepository, CreateActivityLogData } from '../interfaces/IActivityLogRepository';

export class MongoActivityLogRepository implements IActivityLogRepository {
  async createLog(data: CreateActivityLogData): Promise<void> {
    try {
      await ActivityLog.create(data);
    } catch (err) {
      console.error('[MongoActivityLogRepository] Failed to write activity log:', err);
    }
  }

  async findByUserId(userId: string, limit = 20): Promise<any[]> {
    return ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}
```

#### `src/repositories/implementations/MongoAuditLogRepository.ts`
```typescript
import { UserAudit } from '../../models/mongo/UserAudit';
import { IAuditLogRepository, CreateAuditLogData } from '../interfaces/IAuditLogRepository';

export class MongoAuditLogRepository implements IAuditLogRepository {
  async createAudit(data: CreateAuditLogData): Promise<void> {
    try {
      await UserAudit.create(data);
    } catch (err) {
      console.error('[MongoAuditLogRepository] Failed to write audit log:', err);
    }
  }

  async findAll(limit = 50): Promise<any[]> {
    return UserAudit.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async findByTargetUser(targetUserId: string): Promise<any[]> {
    return UserAudit.find({ targetUserId }).sort({ createdAt: -1 }).lean();
  }
}
```

---

### 9.4 Service Layer with Dependency Injection

Notice how the `AuthService` **only depends on interfaces**, completely decoupled from any database libraries:

#### `src/services/auth.service.ts`
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IActivityLogRepository } from '../repositories/interfaces/IActivityLogRepository';

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private logRepo: IActivityLogRepository
  ) {}

  async register(name: string, email: string, passwordPlain: string, clientIp?: string, userAgent?: string) {
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = await this.userRepo.create({
      name,
      email,
      passwordHash,
      role: 'USER',
    });

    // Write to secondary MongoDB repository
    await this.logRepo.createLog({
      userId: user.id,
      email: user.email,
      action: 'REGISTER',
      ipAddress: clientIp,
      userAgent,
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(email: string, passwordPlain: string, clientIp?: string, userAgent?: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      await this.logRepo.createLog({
        email,
        action: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'User does not exist' },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      await this.logRepo.createLog({
        userId: user.id,
        email,
        action: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'Invalid password' },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    await this.logRepo.createLog({
      userId: user.id,
      email,
      action: 'LOGIN_SUCCESS',
      ipAddress: clientIp,
      userAgent,
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
  }
}
```

---

### 9.5 Admin CRUD Service Layer

#### `src/services/admin.service.ts`
```typescript
import bcrypt from 'bcrypt';
import { IUserRepository, FindUsersFilter, UpdateUserData } from '../repositories/interfaces/IUserRepository';
import { IAuditLogRepository } from '../repositories/interfaces/IAuditLogRepository';

export class AdminService {
  constructor(
    private userRepo: IUserRepository,
    private auditRepo: IAuditLogRepository
  ) {}

  async listUsers(filter: FindUsersFilter) {
    return this.userRepo.findAll(filter);
  }

  async getUserDetails(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('USER_NOT_FOUND');

    const auditHistory = await this.auditRepo.findByTargetUser(id);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      auditHistory,
    };
  }

  async createUserByAdmin(adminId: string, name: string, email: string, passwordPlain: string, role: 'USER' | 'ADMIN') {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const createdUser = await this.userRepo.create({
      name,
      email,
      passwordHash,
      role,
    });

    await this.auditRepo.createAudit({
      adminId,
      targetUserId: createdUser.id,
      action: 'ADMIN_CREATE_USER',
      changes: { role, email, name },
    });

    const { passwordHash: _, ...safeUser } = createdUser;
    return safeUser;
  }

  async updateUserByAdmin(adminId: string, targetUserId: string, updates: UpdateUserData) {
    const existing = await this.userRepo.findById(targetUserId);
    if (!existing) throw new Error('USER_NOT_FOUND');

    const updated = await this.userRepo.update(targetUserId, updates);

    await this.auditRepo.createAudit({
      adminId,
      targetUserId,
      action: 'ADMIN_UPDATE_USER',
      changes: updates,
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async deleteUserByAdmin(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new Error('CANNOT_DELETE_SELF');
    }

    const existing = await this.userRepo.findById(targetUserId);
    if (!existing) throw new Error('USER_NOT_FOUND');

    await this.userRepo.delete(targetUserId);

    await this.auditRepo.createAudit({
      adminId,
      targetUserId,
      action: 'ADMIN_DELETE_USER',
    });

    return { message: 'User deleted successfully' };
  }
}
```

---

### 9.6 JWT & Role-Based Middleware

#### `src/middlewares/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};
```

#### `src/middlewares/role.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRole: 'ADMIN' | 'USER') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== allowedRole) {
      res.status(403).json({ 
        message: `Forbidden: Requires ${allowedRole} permissions` 
      });
      return;
    }

    next();
  };
};
```

---

## 10. Testing & Verification Guide

### 1. Register a Standard User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Developer", "email": "alice@example.com", "password": "Password123!"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password123!"}'
```
*Receive JWT token in response.*

### 3. Access Protected User Profile
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Admin CRUD Endpoints (Requires `role: 'ADMIN'`)
```bash
# 4a. Get all users (Paginated & Filtered via PrismaUserRepository)
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=10&search=alice" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 4b. Admin Update User (Role / Status) -> Updates SQL & Logs in Mongo
curl -X PUT http://localhost:5000/api/admin/users/<TARGET_USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN", "isActive": true}'

# 4c. Admin Delete User -> Deletes from SQL & Logs in Mongo
curl -X DELETE http://localhost:5000/api/admin/users/<TARGET_USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 4d. View Mongo Audit Trails
curl -X GET http://localhost:5000/api/admin/logs \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
