# RoyCash — Premium Affiliate & Performance Marketing Network

> **"Earn Through Actions. Grow Through Referrals."**

RoyCash is a clean, modern, enterprise-grade affiliate marketing, performance marketing, and cashback network web platform. Engineered as a high-performance, frontend-only static website with zero backend dependencies, zero telemetry clutter, and pure standard CSS fintech aesthetics.

---

## 💎 Brand & Design System

- **Primary Canvas (Dark Navy):** `#070B14`
- **Surface Elevation:** `#0D1424` / `#131E35`
- **Primary Accent (Emerald):** `#10B981` (hover `#34D399`, dark `#059669`)
- **Secondary Accent (Fintech Gold):** `#F59E0B`
- **Typography:** *Plus Jakarta Sans* paired with *JetBrains Mono* for tabular metrics and technical postback endpoints.
- **Glassmorphism:** Subdued hairline borders (`rgba(255, 255, 255, 0.08)`), multi-layer radial gradient backdrops, and blur surfaces.

---

## 🌐 Full Page Architecture

The platform features 10 fully developed, accessible pages with client-side hash routing:

1. **Home (`/#home`):**
   - High-impact value proposition hero
   - Core ecosystem pillars & advantages
   - Dual publisher and advertiser value cards
   - 10 Campaign model highlights
   - Interactive Server-to-Server (S2S) Postback Simulator
   - Comprehensive FAQ accordion
   - Conversion CTA banner and professional footer

2. **For Publishers (`/#publishers`):**
   - Granular Sub-ID tracking (`subid1` to `subid5`)
   - Real-time postback forwarding (Voluum, Keitaro, RedTrack)
   - Traffic quality and anti-bot compliance framework
   - Payout schedules (Net-15 / Net-30 via Wire, ACH, PayPal, USDT)
   - Interactive Publisher Application modal

3. **For Advertisers (`/#advertisers`):**
   - Pure performance acquisition (pay only on validated actions)
   - S2S HTTP postback and REST API integration specifications
   - Cryptographic transaction deduplication (idempotency ledger)
   - Mobile Measurement Partner (MMP) support (AppsFlyer, Adjust, Branch)
   - Interactive Advertiser Onboarding modal

4. **Campaign Models (`/#campaign-models`):**
   - Complete technical and business breakdown of all **10 models**:
     - **CPA** (Cost Per Action)
     - **CPL** (Cost Per Lead)
     - **CPC** (Cost Per Click)
     - **CPI** (Cost Per Install)
     - **CPD** (Cost Per Download)
     - **CPS** (Cost Per Sale)
     - **CPO** (Cost Per Order)
     - **CPR** (Cost Per Registration)
     - **Revenue Share** (Recurring percentage)
     - **Hybrid Model** (Upfront CPA + recurring RevShare)
   - Real-world practical examples for each model
   - Interactive category filter and full comparison matrix table

5. **How Tracking Works (`/#tracking`):**
   - Step-by-step conversion lifecycle (Click IDs &rarr; Session &rarr; S2S Postback &rarr; Deduplication &rarr; Settlement)
   - Duplicate conversion prevention via transaction hash indexing
   - Transparent cashback hold and reconciliation windows (Pending &rarr; Reconciled &rarr; Approved)
   - **Critical Honesty Disclaimer:** RoyCash explicitly does *not* claim to independently inspect third-party mobile applications without advertiser integration
   - Embedded interactive Postback Sandbox

6. **About Us (`/#about`):**
   - Founding philosophy: The antidote to affiliate network opacity
   - Operational tenets and strict compliance governance
   - Dedicated affiliate and technical account support

7. **Contact Us (`/#contact`):**
   - Validated multi-department contact form with instant ticket reference generation
   - Department routing (`publishers@roycash.net`, `advertisers@roycash.net`, `tracking@roycash.net`, `compliance@roycash.net`)
   - Operating hours and 24-hour response SLA

8. **Privacy Policy (`/#privacy`):**
   - Cookieless tracking disclosures
   - GDPR, CCPA, and data subject rights
   - 90-day transaction log retention schedule

9. **Terms & Conditions (`/#terms`):**
   - Master Service Agreement for publishers and advertisers
   - Traffic quality rules, zero-tolerance bot policy, and payment terms

10. **Disclaimer (`/#disclaimer`):**
    - Transparent earnings disclosure: No guaranteed income
    - Contingency notice: All payouts depend on live advertiser campaigns and verified merchant postbacks
    - Independent intermediary notice and trademark disclaimers

11. **Custom 404 (`/#notfound`):**
    - Clean branded error page with fast recovery links

---

## 🛠 Tech Stack

- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Standard CSS (`src/styles/main.css`) — Zero Tailwind, zero bloated utility frameworks
- **Icons:** Lucide React
- **Architecture:** 100% Client-Side Static Single Page Application (SPA)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or 10.x

### Installation

```bash
# Clone the repository
git clone https://github.com/royverse0/roycash.git
cd roycash

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Runs the application locally at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

Generates an optimized static distribution in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Previews the production build locally.

---

## 🔍 Mitgo Website Verification Placeholder

To verify website ownership for Mitgo / Admitad:

1. Open `index.html`.
2. Locate the documented verification block in the `<head>` section:
   ```html
   <!-- =================================================================== -->
   <!-- MITGO WEBSITE VERIFICATION PLACEHOLDER                              -->
   <!-- Replace this placeholder with your exact Mitgo verification code:   -->
   <!-- e.g. <meta name="mitgo-verification" content="YOUR_VERIFICATION_CODE_HERE" /> -->
   <!-- =================================================================== -->
   ```
3. Insert your exact verification `<meta>` tag.

---

## 📦 Project Structure

```
roycash/
├── index.html                  # HTML5 entry with SEO tags & Mitgo placeholder
├── package.json                # Pinned dependencies & build scripts
├── vite.config.js              # Clean Vite ESM configuration
├── public/
│   ├── favicon.svg             # Branded vector favicon
│   └── robots.txt              # Search engine crawler directives
├── src/
│   ├── main.jsx                # React DOM entry point
│   ├── App.jsx                 # Client router, SEO title manager, modals
│   ├── components/
│   │   ├── Navbar.jsx          # 3-Zone Top Bar navigation with mobile drawer
│   │   ├── Footer.jsx          # Branded footer with legal links & notices
│   │   ├── ApplicationModal.jsx# Publisher & Advertiser onboarding forms
│   │   └── PostbackSimulator.jsx# Interactive S2S postback sandbox
│   ├── pages/
│   │   ├── Home.jsx            # Network homepage
│   │   ├── Publishers.jsx      # For Publishers guide & rules
│   │   ├── Advertisers.jsx     # For Advertisers & S2S specs
│   │   ├── CampaignModels.jsx  # 10 performance models breakdown
│   │   ├── TrackingWorks.jsx   # How tracking works & deduplication
│   │   ├── About.jsx           # About RoyCash & values
│   │   ├── Contact.jsx         # Contact form & department emails
│   │   ├── PrivacyPolicy.jsx   # Legal privacy disclosure
│   │   ├── TermsConditions.jsx # Master service terms & conditions
│   │   ├── Disclaimer.jsx      # Earnings & contingency disclaimer
│   │   └── NotFound.jsx        # Custom 404 page
│   └── styles/
│       └── main.css            # Complete standard CSS design system
└── README.md                   # Setup, deployment & architecture docs
```

---

## 📄 License

&copy; RoyCash Performance Network. All rights reserved.
