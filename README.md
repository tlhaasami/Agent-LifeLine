# LifeLine Agent Tracking Dashboard — Project Reference

Welcome to the **LifeLine Agent Tracking Dashboard**, a premium, high-performance operations analytics and assistant portal designed specifically for tracking GoHighLevel (GHL) sales agent efficiency and conversion metrics.

---

## 🎯 Project Niche
The dashboard serves as a central intelligence hub for sales operations. It automates the parsing, analysis, and auditing of multi-source CRM files (opportunities, outbound calls, booking records, contact exports, and GHL audit logs) to provide managers with a real-time, consolidated overview of agent performance. 

Rather than jumping between disconnected GHL views, LifeLine offers a unified workspace to track:
*   **Agent Efficiency:** Talk time, call connection rates, and notes logged.
*   **Revenue Generation:** Financial margins added today, closed deals, and bookings.
*   **Auditing and Quality:** Outbound messaging counts and exact conversation log retrieval.

---

## 📦 What It Contains
The platform is organized into distinct, modular workspaces:

### 1. Overview Workspace
*   **Real-time KPI Tiles:** Outbound/inbound call counts, talk time, margin generated, and note updates.
*   **Interactive Metrics Charts:** Pie charts and progress charts visualizing agent contributions.
*   **Active Status Tracker:** Real-time indicator of how many agents have active logins or logs.

### 2. Activity & Metrics
*   **Detailed Analytics Table:** Fully sortable grid displaying connected/missed call counts, average call duration, conversions, and note logs per agent.
*   **Search & Filters:** Real-time search across agent names.

### 3. Agent Progress & Sprints
*   **Pipeline Visualizers:** Sprint progression trackers monitoring lead lifecycle states (Interested, Booked, Appointment Scheduled, Won/Closed).

### 4. GHL Conversations Workspace
*   **Outbound Message Log:** Displays real-time, synchronized text messaging histories between agents and leads.
*   **Full Searchable Contacts:** Interactive search bar to filter conversation threads instantly.

### 5. Onboarding Portal
*   **Multi-Format File Uploader:** Supports bulk CSV upload, single file uploads, and direct **Pre-compiled JSON Report** file ingestion.
*   **Automated Backups:** Saves compiled daily metrics directly to your GitHub repository (`quickholidays/Agent-LifeLine`) or locally.
*   **保留 / Overwrite Prompting:** Prompts user to choose whether to overwrite previous GHL chat history logs or retain and merge them when uploading database updates for an existing date.

### 6. AI Operations Assistant
*   **Context-Bound LLM:** Interactive query assistant equipped with today's live stats to answer questions ("Who had the highest connection rate?", "Which agent generated the most margin?").
*   **System Lockout Safeguard:** Prevents misuse by locking out queries for the day if a user posts three or more out-of-context requests.
*   **Unresolved Data Log:** Logs questions that cannot be answered due to missing database fields, commits them, and pushes them to GitHub.
*   **Unresolved Queries Resolver:** Provides administrators with a single-click **"Resolve"** button to clean up logs and sync updates to GitHub.

---

## 🎨 Theming & Visual Aesthetics
The application features a modern, ultra-premium design system modeled after glassmorphic and glowing dark-mode aesthetics:

### 🌑 Dark Mode (Default Theme)
*   **Background:** Deep Pure Black (`#000000`) and charcoal-dark card modules (`#0a0a0a`).
*   **Accent Color:** Vibrant Coral/Paprika Orange (`#d15c2e`) with soft glowing highlights (`rgba(209, 92, 46, 0.25)`).
*   **Typography:** Google Font **Outfit** for clean, modern readability.
*   **Borders:** Subtle translucent dividers (`rgba(255, 255, 255, 0.08)`).

### ☀️ Light Mode (Spicy Paprika & Cream)
*   **Background:** Smooth Warm Cream (`#faefea`) and Pure White cards (`#ffffff`).
*   **Text & Accents:** Dark Spicy Paprika (`#2a1209` / `#7d371c`).
*   **Shadows:** Low-opacity soft ambient drop-shadows.

### ⚙️ General Aesthetics
*   **Micro-interactions:** Smooth CSS hover transitions on buttons, cards, and list elements.
*   **Scrollable Tables:** Markdown tables and layout elements are optimized to scroll horizontally on small mobile screens to keep the workspace 100% responsive without breaking screen boundaries.

---

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
