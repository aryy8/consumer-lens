# Consumer Lens — Technical Architecture & Deployment Documentation

**Ministry of Consumer Affairs, Food & Public Distribution**  
**Department of Consumer Affairs (DoCA) · Legal Metrology Division**  
**Problem Statement ID:** 26034 · *Automated Compliance Verification of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011*

---

## 1. Executive Summary & Objective

**Consumer Lens** is an institutional-grade, AI-powered regulatory enforcement platform engineered for Legal Metrology officers, field inspectors, and supervisory authorities across India. 

The platform automates the inspection of physical packaged commodities and e-commerce product listings to ensure strict adherence to the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011 (LMPC Rules, 2011)**.

### Key Capabilities
- **Multi-Modal Label Evidence Capture**: Live camera ingestion, high-resolution packaging photo uploads, and automated PDP web scraping for major e-commerce portals (Amazon, Flipkart).
- **Vision AI Multimodal Extraction**: Gemini Vision multimodal inference detecting normalized 2D bounding boxes (`box_2d: [ymin, xmin, ymax, xmax]`), font size compliance, and print readability.
- **Rule 10 & 11 Font Size Compliance**: Evaluates numeral height against packaging net capacity tables, aspect ratio limits, and prominence of MRP.
- **Rule 9 & 14 Packaging Readability & Defect Assessment**: Real-time evaluation of contrast adequacy, glare, blur, and text legibility.
- **Misleading & Deceptive Declaration Flags**: Automatic detection of unauthorized price sticker overlays, contradictory claims, and non-standard pack sizes.
- **Statutory Enforcement Dossier & PDF Memorandum**: Generates courtroom-ready digital inspection dossiers compliant with Section 65B of the Indian Evidence Act, complete with SHA-256 evidence hashes, verification QR codes, and institutional seals.
- **Zero-Data-Loss Offline Resilience**: Client-side IndexedDB persistence ensures field inspectors never lose in-progress scans upon browser reloads or network dropouts.

---

## 2. High-Level System Architecture

The following diagram illustrates the end-to-end architecture of Consumer Lens, connecting the field inspector interface with the application server, AI vision inference engine, relational persistence layer, and external verification infrastructure.

```mermaid
flowchart LR
    C1["<b>1. MULTI-MODAL INGESTION</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Live Camera Label Capture<br/>• E-Commerce PDP URL Scraping<br/>• Auto GPS & District Geofix"]
    C2["<b>2. GATEWAY & SECURITY</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• JWT Role-Based Access Control<br/>• Real-Time SSE Event Stream<br/>• Offline IndexedDB Resilience"]
    C3["<b>3. AI & RULE ENGINE</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Gemini Vision 2.5 Inference<br/>• 2D Bounding Boxes [ymin, xmin...]<br/>• LMPC 2011 Table I Audit"]
    C4["<b>4. ENFORCEMENT & DATA</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Neon Serverless PostgreSQL<br/>• Section 65B Evidence Dossier<br/>• Dynamic Verification QR Code"]

    C1 ==> C2 ==> C3 ==> C4

    style C1 fill:#EEF2FF,stroke:#6366F1,stroke-width:2px,color:#1E1B4B
    style C2 fill:#F0FDF4,stroke:#22C55E,stroke-width:2px,color:#14532D
    style C3 fill:#FAF5FF,stroke:#A855F7,stroke-width:2px,color:#581C87
    style C4 fill:#FFF7ED,stroke:#F97316,stroke-width:2px,color:#7C2D12
```

---

## 3. System Design & User Interaction Flow

The following System Design cum User Flow diagram illustrates the exact synchronization between field inspector actions on the client interface and the asynchronous cloud services executing beneath the surface.

```mermaid
flowchart LR
    subgraph S1 ["STAGE 1: EVIDENCE INGESTION"]
        direction TB
        U1["USER INTERACTION<br/><b>Field Officer Launches Inspection</b><br/>• Captures packaging photo or inputs PDP URL<br/>• Auto-detects state & district via GPS<br/>• In-progress drafts saved against reload"]
        T1["UNDERLYING TECHNOLOGY<br/><b>Next.js 16 Client & Local Cache</b><br/>• HTML5 Camera API & Geolocation Service<br/>• IndexedDB Store (ConsumerLensDraftDB)<br/>• Zero-data-loss client persistence"]
        U1 <-->|"Local Sync"| T1
    end

    subgraph S2 ["STAGE 2: STREAMING INFERENCE"]
        direction TB
        U2["USER INTERACTION<br/><b>Live Scan Progress Feedback</b><br/>• Initiates statutory compliance audit<br/>• Real-time progress ticker on UI<br/>• Instant status: Vision, Rules, Penalties"]
        T2["UNDERLYING TECHNOLOGY<br/><b>API Gateway & Multimodal Vision</b><br/>• Route Handler /api/analyze (SSE Stream)<br/>• Google Gemini 2.5 Vision Multimodal LLM<br/>• 2D Normalized Bounding Box Extraction"]
        U2 <-->|"Event Stream"| T2
    end

    subgraph S3 ["STAGE 3: STATUTORY RULE AUDIT"]
        direction TB
        U3["USER INTERACTION<br/><b>Interactive Evidence Inspection</b><br/>• Explores visual bounding box overlays<br/>• Audits 10 mandatory LMPC fields<br/>• Reviews violation tags & 0-100 score"]
        T3["UNDERLYING TECHNOLOGY<br/><b>Codified LMPC Regulatory Engine</b><br/>• Rule 10/11: Table I Numeral Heights<br/>• Rule 9/14: Print Contrast & Legibility<br/>• Rule 15: Deceptive Sticker Detection"]
        U3 <-->|"Visual Review"| T3
    end

    subgraph S4 ["STAGE 4: LEGAL ENFORCEMENT"]
        direction TB
        U4["USER INTERACTION<br/><b>Dossier Generation & Prosecution</b><br/>• Confirms inspection & signs Officer ID<br/>• Views full-page memorandum in viewer<br/>• Scans dynamic QR to verify authenticity"]
        T4["UNDERLYING TECHNOLOGY<br/><b>Persistence & Legal Verification</b><br/>• Neon Serverless PostgreSQL & Drizzle ORM<br/>• Section 65B SHA-256 Evidence Hashing<br/>• jsPDF Vector Engine & Verification Gateway"]
        U4 <-->|"Enforcement Dossier"| T4
    end

    S1 ==>|"Multipart POST"| S2 ==>|"Structured JSON"| S3 ==>|"Audit Verdict"| S4

    style S1 fill:#F8FAFC,stroke:#475569,stroke-width:1.5px
    style S2 fill:#EEF2FF,stroke:#4338CA,stroke-width:1.5px
    style S3 fill:#FAF5FF,stroke:#6D28D9,stroke-width:1.5px
    style S4 fill:#ECFDF5,stroke:#047857,stroke-width:1.5px

    style U1 fill:#FFFFFF,stroke:#475569,stroke-width:1.5px,color:#0F172A
    style T1 fill:#EFF6FF,stroke:#2563EB,stroke-width:1.5px,color:#1E3A8A
    style U2 fill:#FFFFFF,stroke:#475569,stroke-width:1.5px,color:#0F172A
    style T2 fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px,color:#312E81
    style U3 fill:#FFFFFF,stroke:#475569,stroke-width:1.5px,color:#0F172A
    style T3 fill:#FAF5FF,stroke:#7C3AED,stroke-width:1.5px,color:#4C1D95
    style U4 fill:#FFFFFF,stroke:#475569,stroke-width:1.5px,color:#0F172A
    style T4 fill:#ECFDF5,stroke:#059669,stroke-width:1.5px,color:#064E3B
```

### Stage-by-Stage Technical Interaction Matrix

| Stage | Field Inspector Interaction | Technology Components Utilized | Data Processing & Protocol |
| :--- | :--- | :--- | :--- |
| **1. Evidence Ingestion** | Launches PWA on mobile or workstation; triggers live camera stream or inputs e-commerce PDP URL; state/district detected automatically. | HTML5 MediaDevices API, BigDataCloud Geocoding, client-side IndexedDB (`ConsumerLensDraftDB`). | Image serialized into Base64; draft state preserved locally to prevent loss on browser reload. |
| **2. Streaming Inference** | Clicks "Run Compliance Analysis"; views live status ticker advancing through inference milestones. | Next.js Edge / Node Route Handlers (`/api/analyze`), Server-Sent Events (`text/event-stream`), Gemini Vision 2.5 API. | HTTP POST with multipart payload; server dispatches prompt + image to Gemini; streams back real-time step events. |
| **3. Statutory Audit** | Navigates visual label inspector; toggles 2D bounding boxes over packaging; audits missing declarations and penalty scores. | React 19 Canvas/SVG coordinate mapper, LMPC Rule 10/11 Table I height engine, Rule 9/14 contrast scorer. | Maps normalized coordinates `[ymin, xmin, ymax, xmax]` to screen pixels; evaluates declarations against statutory rules; computes 0-100 score. |
| **4. Legal Enforcement** | Confirms findings; saves inspection to state repository; launches full-screen PDF dossier; verifies tamper-proof QR code. | Neon Serverless PostgreSQL, Drizzle ORM, Web Crypto SHA-256 hashing, jsPDF vector engine. | Generates cryptographic hash over inspection parameters; stores record in Postgres; issues Section 65B certified PDF memorandum. |

---

## 4. LMPC Rules, 2011 Regulatory Decision Engine

The regulatory engine evaluates 10 statutory declaration fields against codified legal requirements from the Legal Metrology (Packaged Commodities) Rules, 2011:

```mermaid
graph TD
    Input["<b>Packaged Commodity Evidence</b><br/>Physical Packaging Photo or E-Commerce PDP"]

    subgraph Pillars ["<b>LMPC Rules, 2011 · 4 Core Statutory Audit Pillars</b>"]
        P1["<b>Rule 6: Mandatory Declarations</b><br/>Mfg, MRP, Net Qty, Month/Year, Consumer Care"]
        P2["<b>Rule 10 & 11: Numeral Heights</b><br/>Table I Minimum Font vs. Pack Area"]
        P3["<b>Rule 9 & 14: Readability & Format</b><br/>Print Contrast, Language & Background Glare"]
        P4["<b>Rule 15 & Sec 18: Fair Trade</b><br/>Anti-Sticker Overlays & Deceptive Claims"]
    end

    Verdict{"<b>Statutory Verdict Engine</b><br/>Weighted Penalty Algorithm"}
    Pass["<b>COMPLIANT (Score >= 85)</b><br/>Statutory Digital Green Pass"]
    Fail["<b>VIOLATION DETECTED</b><br/>Legal Memorandum & Directives"]

    Input --> P1 & P2 & P3 & P4
    P1 & P2 & P3 & P4 --> Verdict
    Verdict -->|Pass| Pass
    Verdict -->|Fail| Fail

    style Input fill:#F1F5F9,stroke:#64748B,stroke-width:2px,color:#0F172A
    style Pillars fill:#F8FAFC,stroke:#94A3B8,stroke-width:1.5px,color:#1E293B
    style P1 fill:#EEF2FF,stroke:#6366F1,stroke-width:1.5px,color:#1E1B4B
    style P2 fill:#F0FDF4,stroke:#22C55E,stroke-width:1.5px,color:#14532D
    style P3 fill:#FEF9C3,stroke:#EAB308,stroke-width:1.5px,color:#713F12
    style P4 fill:#FEE2E2,stroke:#EF4444,stroke-width:1.5px,color:#7F1D1D
    style Verdict fill:#EDE9FE,stroke:#8B5CF6,stroke-width:2px,color:#4C1D95
    style Pass fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    style Fail fill:#FFE4E6,stroke:#E11D48,stroke-width:2px,color:#881337
```

### Statutory Severity Matrix

| LMPC Rule Citation | Mandatory Declaration | Defect Condition | Severity Rating | Penalty Deduction |
| :--- | :--- | :--- | :---: | :---: |
| **Rule 6(1)(a)** | Manufacturer / Packer / Importer | Missing name, missing registered address, or no role qualifier | **CRITICAL** | -25 pts |
| **Rule 6(1)(b)** | Generic / Common Name | Brand name only; generic commodity nature omitted | **MAJOR** | -15 pts |
| **Rule 6(1)(c)** | Maximum Retail Price (MRP) | Missing "Inclusive of all taxes", missing currency symbol | **CRITICAL** | -25 pts |
| **Rule 6(1)(d)** | Date of Manufacture / Packing | Missing month and year of packaging | **MAJOR** | -15 pts |
| **Rule 6(1)(e)** | Net Quantity | Non-SI units, missing whitespace around numeral | **CRITICAL** | -25 pts |
| **Rule 6(2)** | Consumer Care Grievance Cell | Missing official phone, email, or physical address | **MAJOR** | -15 pts |
| **Rule 6(11)** | Unit Sale Price (USP) | Missing calculated unit price per gram/ml for packs > 100g/ml | **MINOR** | -10 pts |
| **Rule 9 & 14** | Language & Readability | Low print contrast, glare, blur, or non-English/Hindi declaration | **MINOR** | -10 pts |
| **Rule 10 & 11** | Minimum Font Size (Table I) | Numeral height below statutory minimum for pack area | **MAJOR** | -15 pts |
| **Rule 15 / Sec 18**| Misleading Declarations | Dual pricing stickers, deceptive claims, non-standard pack sizes | **CRITICAL** | -30 pts |

---

## 5. Security & Role-Based Access Control (RBAC) Architecture

Consumer Lens implements institutional role segregation aligned with statutory enforcement hierarchies:

```mermaid
graph LR
    subgraph Roles ["<b>Enforcement Hierarchy</b>"]
        R1["<b>Field Inspector</b><br/>• Mobile Label Scanning<br/>• On-Site GPS Verification<br/>• Issue Spot Inspection PDF"]
        R2["<b>Divisional Supervisor</b><br/>• District Violation Audit<br/>• Inspector Performance Metrics<br/>• Escalated Legal Notices"]
        R3["<b>Central Admin (DoCA)</b><br/>• All-India Heatmap Analytics<br/>• National Policy Directives<br/>• Officer Onboarding & Security"]
    end

    subgraph CorePlatform ["<b>Consumer Lens Platform</b>"]
        Platform["<b>Unified RBAC Gateway</b><br/>JWT Authentication · Role Guards<br/>Section 65B Evidence Ledger"]
    end

    R1 ==>|Local Scope| Platform
    R2 ==>|District Scope| Platform
    R3 ==>|National Scope| Platform

    style Roles fill:#F8FAFC,stroke:#CBD5E1,stroke-width:1.5px
    style R1 fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px,color:#1E3A8A
    style R2 fill:#FAF5FF,stroke:#8B5CF6,stroke-width:2px,color:#4C1D95
    style R3 fill:#FEF3C7,stroke:#F59E0B,stroke-width:2px,color:#78350F
    style CorePlatform fill:#F0FDF4,stroke:#10B981,stroke-width:2px,color:#064E3B
    style Platform fill:#FFFFFF,stroke:#10B981,stroke-width:2px,color:#064E3B
```

---

## 6. Section 65B Indian Evidence Act Compliance Framework

To ensure that generated inspection reports are legally admissible as electronic evidence in Indian courts of law during prosecution of non-compliant manufacturers, the platform incorporates a statutory digital evidence chain:

1. **SHA-256 Cryptographic Evidence Digest**:
   $$\text{Digest} = \text{SHA-256}(\text{InspectionID} \parallel \text{Date} \parallel \text{Manufacturer} \parallel \text{MRP} \parallel \text{ImageBase64})$$
   This cryptographic hash is stamped into the official dossier reference header. Any tampering with the document or evidence image invalidates the hash.
2. **Dynamic Verification QR Codes**:
   Each generated memorandum contains vector QR codes pointing directly to `https://consumer-lens.vercel.app/inspections/[id]`. Enforcement officers, magistrates, and manufacturers can scan the QR code to verify the report's authenticity against the tamper-proof server record.
3. **Official Seals & Digital Signatures**:
   The report renders proportional vector seals:
   - National Emblem of India (State Emblem)
   - 75 Azadi Ka Amrit Mahotsav Logo
   - Food Safety and Standards Authority of India (FSSAI) Seal
   - Legal Metrology Directorate Official Inspection Stamp
   - Cryptographic vector checkmark and officer employee ID stamp.

---

## 7. Production Deployment & Cloud Framework

Consumer Lens is engineered for zero-downtime multi-cloud deployment with containerized support for Google Cloud Run, AWS ECS, or Vercel Edge.

```mermaid
flowchart LR
    E["<b>1. EDGE & CLIENT TIER</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Inspector Mobile PWAs & Web<br/>• Cloudflare CDN, DNS & DDoS<br/>• TLS 1.3 End-to-End Encryption"]
    A["<b>2. APPLICATION RUNTIME</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Cloud Run Docker Containers<br/>• Next.js 16 Standalone (Node 20)<br/>• 0-to-N Auto-Scaling SSE Pipeline"]
    D["<b>3. MANAGED DATA & AI TIER</b><br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Google Gemini Vision API<br/>• Neon Serverless Postgres (PgBouncer)<br/>• Reverse Geocoding District Service"]

    E ==>|"HTTPS / TLS 1.3"| A ==>|"Encrypted VPC / SSL"| D

    style E fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px,color:#1E3A8A
    style A fill:#FAF5FF,stroke:#8B5CF6,stroke-width:2px,color:#4C1D95
    style D fill:#F0FDF4,stroke:#10B981,stroke-width:2px,color:#064E3B
```

### Multi-Stage Dockerfile Architecture

The application includes a production-hardened multi-stage Docker build optimized for minimal image footprint and Google Cloud Run execution:

```dockerfile
# Stage 1: Base Image with Node 20 Alpine & Corepack PNPM
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: Dependencies Installation with Cache Mounting
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile

# Stage 3: Builder with Next.js Standalone Optimization
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# Stage 4: Minimal Runner (Distroless-style Non-Root Execution)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
```

---

## 8. Relational Schema & Entity-Relationship Model

```mermaid
flowchart LR
    U["<b>USERS TABLE</b><br/>━━━━━━━━━━━━━━━<br/>PK: <b>id</b> (UUID)<br/>UK: <b>employee_id</b> (String)<br/>Role: inspector | supervisor | admin<br/>District / State: Jurisdiction"]
    I["<b>INSPECTIONS TABLE</b><br/>━━━━━━━━━━━━━━━<br/>PK: <b>id</b> (UUID / INSP-XXXX)<br/>Metadata: product_name / mfg<br/>Evidence: JSONB (10 Rules + BBoxes)<br/>Hash: sha256_hash (Sec 65B Digest)"]
    R["<b>REPORTS TABLE</b><br/>━━━━━━━━━━━━━━━<br/>PK: <b>id</b> (UUID / REP-XXXX)<br/>Rating: score (0 - 100 Integer)<br/>Status: verdict (Compliant / Violation)<br/>Public URL: pdf_url / verification_qr"]

    U ==>|"1 : N conducts"| I ==>|"1 : N generates"| R

    style U fill:#EEF2FF,stroke:#6366F1,stroke-width:2px,color:#1E1B4B
    style I fill:#F0FDF4,stroke:#22C55E,stroke-width:2px,color:#14532D
    style R fill:#FFF7ED,stroke:#F97316,stroke-width:2px,color:#7C2D12
```

---

## 9. Presentation Cheat-Sheet (Summary for Evaluation & Slides)

| Metric / Dimension | Implementation Detail |
| :--- | :--- |
| **Statutory Law** | Legal Metrology Act, 2009 & Legal Metrology (Packaged Commodities) Rules, 2011 |
| **Target Authority** | Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Govt. of India |
| **Front-End Stack** | Next.js 16.3 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **AI Inference** | Gemini Vision 2.5 Multimodal LLM returning normalized 2D bounding boxes (`box_2d`) |
| **Font Size Rules** | Rule 10 & 11 (Table I minimum numeral height verification against packaging area) |
| **Readability Rules** | Rule 9 & 14 (Automated contrast ratio, blur/glare detection, and print quality scoring) |
| **Deceptive Claims** | Rule 15 & Section 18 (Price sticker overlay detection & contradictory claim flagging) |
| **Offline Resilience** | Native browser IndexedDB (`ConsumerLensDraftDB`) caching images & scan state |
| **Legal Admissibility**| Section 65B Indian Evidence Act SHA-256 evidence digest & dynamic verification QR |
| **Database** | PostgreSQL with Drizzle ORM, connection pooling via Neon serverless |
| **Security** | JWT HTTP-only cookies, bcrypt hashing, role-based route middleware (Inspector/Supervisor/Admin) |
| **Containerization** | Multi-stage Dockerfile running as non-root `nextjs` user on Alpine Node 20 (Port 8080) |

---

*Consumer Lens Technical Architecture Documentation · Department of Consumer Affairs (DoCA) · Legal Metrology Division*
