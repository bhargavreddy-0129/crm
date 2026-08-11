# Mini ERP + CRM Operations Portal

A modern, full-stack Mini ERP and CRM Operations Portal designed for wholesale and distribution companies. This system manages customer leads, inventory levels, low-stock alerts, stock movement logs, and automated sales challan dispatches with atomic stock reduction and PDF invoice generation.

---

## 🚀 Live Deployment

The application is deployed and live in production:

### Frontend
[https://superb-banoffee-22d6bf.netlify.app](https://superb-banoffee-22d6bf.netlify.app)

### Backend API
[https://crm-production-6571.up.railway.app](https://crm-production-6571.up.railway.app)

- **Frontend**: Deployed on **Netlify** (React 18 + Vite + TypeScript).
- **Backend**: REST API deployed on **Railway** (Node.js + Express + TypeScript + Prisma ORM).
- **Database**: Cloud-hosted PostgreSQL on **Neon**.
- **Communication**: The Netlify frontend communicates directly with the Railway backend REST API with CORS security.

---

## 🏗️ Deployment Architecture

```
Frontend (Netlify)
        ↓
Backend REST API (Railway)
        ↓
PostgreSQL Database (Neon)
```

---

## ⚡ How to Run Both Frontend & Backend at the Same Time

### Method 1: Single Command from Root (Recommended)
We have configured `concurrently` in the root folder so you can start both servers simultaneously with a single command:

```bash
# Open terminal in the project root directory
npm install
npm run dev
```
- **Backend API**: Listening at `http://localhost:5000`
- **Frontend App**: Listening at `http://localhost:3000`

---

### Method 2: Two Separate Terminal Windows

**Terminal 1 (Backend API)**:
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend App)**:
```bash
cd frontend
npm run dev
```

---

### Method 3: Using Docker Compose
Run the entire containerized stack including PostgreSQL DB, Express API, and React frontend:

```bash
docker-compose up --build
```

---

## 🔑 Test Login Credentials

| Role | Email | Password | Allowed Actions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `Password123` | Full system access across all modules |
| **Sales** | `sales@company.com` | `Password123` | Manage Customers, Follow-ups, Create Sales Challans |
| **Warehouse** | `warehouse@company.com` | `Password123` | Manage Products, Adjust Stock (IN/OUT), View Audit Logs |
| **Accounts** | `accounts@company.com` | `Password123` | View Dashboard, Sales Challans, Export PDF Invoices |

*Note: All 4 roles are pre-seeded in the database and can be selected via 1-click buttons on the login screen.*

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL (Neon), PDFKit, JWT, Zod validation.
- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Custom Premium Glassmorphic CSS Design System.
- **DevOps**: Docker, Docker Compose, GitHub Actions, Netlify, Railway.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="super-secret-jwt-key-mini-erp-crm-2026"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

---

## 🌐 Deployment Instructions

### Option 1: Frontend on Netlify & Backend on Railway (Current Production Setup)
1. **Database (Neon)**: Create a PostgreSQL database on [Neon](https://neon.tech).
2. **Backend (Railway)**:
   - Connect your GitHub repository to Railway.
   - Set Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.
   - Dockerfile automatically builds and runs the containerized Express server.
3. **Frontend (Netlify)**:
   - Connect your GitHub repository to Netlify.
   - Set Build Command: `cd frontend && npm install && npm run build`.
   - Set Environment Variable: `VITE_API_URL=https://crm-production-6571.up.railway.app`.

### Option 2: Full-Stack Container on AWS / Local Docker
Deploy using `docker-compose up --build`.

---

## 📁 Repository Structure

```
├── backend/                  # Express + TypeScript + Prisma API
├── frontend/                 # React + Vite + TypeScript UI
├── .github/workflows/ci.yml   # GitHub Actions CI workflow
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Container orchestration
├── crm-api.postman_collection.json # Exported Postman API collection
├── package.json               # Root scripts & concurrently setup
└── README.md
```
