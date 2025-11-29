# Technical Specification: Distributed Product Promotion Workflow (Student Project)

## 1. Project Context & Constraints
- Group of students, each running one (or more) department services on their personal laptop.
- Laptops may be on completely different networks (home WiFi, mobile hotspot, university, etc.) — no VPN, no same LAN required.
- Services are NOT hosted on any cloud/server — they run locally only.
- No real business logic → all services return hardcoded JSON responses.
- Mandatory: include an API Gateway layer + exactly **two ESBs** in the architecture.
- Professor-recommended stack: Talend / Talend ESB, Camunda, Anypoint (MuleSoft) → we will be used.
- Must work reliably even if students are in different cities.

## 2. Chosen Architecture (Best possible with free tools & zero network headaches)

```
[Client / Postman]
      ↓ (HTTPS)
API Gateway (Anypoint Platform – free developer account)
      ↓ (HTTPS – proxy + auth)
Camunda Platform 8 SaaS (free dev cluster) ← central orchestrator (Zeebe)
      ↑↓ (gRPC – outbound only, works behind any NAT/firewall)
Job Workers running on student laptops:
   ├─ Data & Analysis worker        → plain Node.js/Python or Talend ESB route
   ├─ Commercial & Purchasing worker → Talend ESB (Camel route acting as worker)
   ├─ Finance & Accounting worker    → Anypoint Mule flow acting as worker
   ├─ Marketing worker               → plain Node.js or Talend ESB route
   └─ IT worker                      → Anypoint Mule flow acting as worker
```

This architecture requires **zero inbound ports open** on any laptop → perfect for student environments.

## 3. Core Components & Technologies

| Layer              | Technology                          | Why this one                                                                 | Free for students? |
|-------------------|-------------------------------------|-----------------------------------------------------------------------------|-------------------|
| BPMN Orchestrator | Camunda Platform 8 SaaS (Zeebe)     | Cloud-hosted, free dev cluster, perfect BPMN 2.0 execution, external task pattern works from anywhere | Yes (free cluster, enough for whole semester) |
| API Gateway       | Anypoint API Manager (MuleSoft)     | Free developer account, creates managed API, adds auth/logging/rate limiting, proxies to Camunda REST | Yes |
| ESB #1            | Talend ESB (or open-source Karaf + Camel + CXF) | Used for Commercial & Purchasing + Marketing workers (Camel routes that poll Zeebe) | Yes (Talend Open Studio + Runtime free) |
| ESB #2            | MuleSoft Anypoint Mule Runtime      | Used for Finance & IT workers (Mule flows that poll Zeebe and return hardcoded data) | Yes (free Anypoint Studio + local Mule runtime or CloudHub free tier) |
| Job Workers       | Zeebe clients (Node.js / Java / Python / Go) or embedded in ESB routes | Simple, lightweight, outbound-only connection | Yes |

→ We therefore satisfy the “two ESBs” requirement: **Talend ESB** and **MuleSoft (Anypoint)** are both used in production flow.

## 4. How the Process Will Run (Step by Step)

1. Someone calls the API Gateway → `POST /start-promotion` (can include test payload).
2. API Gateway (Anypoint) → calls Camunda 8 REST API → starts process instance.
3. Camunda executes the BPMN (exactly the XML I gave you earlier, only service tasks changed to **External Tasks** with job types).
4. When a task reaches a department:
   - Camunda creates a job (e.g., type = `propose-promotion`).
   - The corresponding student’s worker (running locally) polls Camunda, fetches the job, returns **hardcoded** variables in < 1 second, completes the job.
   - Camunda continues the process.
5. Parallel gateway (Commercial tasks) works automatically — both jobs are activated at the same time, both workers can complete independently.
6. Decision gateway works with the hardcoded approval value returned by Finance worker.

## 5. Job Types & Hardcoded Responses (example)

| Job Type                     | Department                | Hardcoded Response Example                                                                 |
|------------------------------|--------------------------|---------------------------------------------------------------------------------------------|
| identify-products            | Data & Analysis          | `{ "targetProducts": ["P123", "P456", "P789"] }`                                            |
| propose-promotion            | Commercial & Purchasing  | `{ "discountPercentage": 30, "promotionText": "30% OFF THIS WEEK ONLY!" }`                  |
| prepare-instore-update       | Commercial & Purchasing  | `{ "preparationStatus": "ready" }`                                                          |
| evaluate-profitability       | Finance & Accounting     | `{ "approved": true, "marginAfterPromo": 18.5 }`   ← change to false to test rejection path |
| prepare-promotion-material | Marketing                | `{ "communicationStatus": "published" }`                                                    |
| update-system-prices         | IT                       | `{ "systemUpdateStatus": "success" }`                                                       |
| update-physical-prices       | Commercial & Purchasing  | `{ "physicalUpdateStatus": "labels updated" }`                                              |

## 6. Implementation Plan per Student

| Student / Department         | What you run locally on your laptop                                                                 | Approx. lines of code |
|------------------------------|------------------------------------------------------------------------------------------------------|----------------------|
| Data & Analysis              | Simple Node.js/Python Zeebe worker or Talend ESB route                                               | ~30–60 lines        |
| Commercial & Purchasing      | **Talend ESB** route (Camel + Zeebe Java client) that handles 3 jobs                                 | ~80 lines (mostly drag & drop in Talend Studio) |
| Finance & Accounting         | **MuleSoft Anypoint** flow (Anypoint Studio) that handles profitability job                         | ~50 lines (drag & drop + one Java component) |
| Marketing                    | Simple Node.js worker or Talend ESB route                                                             | ~40 lines           |
| IT                           | **MuleSoft Anypoint** flow                                                                           | ~40 lines           |
| Gateway + Monitoring         | One student deploys API Gateway in Anypoint Platform (no code, just configuration) + optional dashboard | 0–20 lines          |

Everyone just runs `node worker.js` or `mvn exec:java` or starts the Talend/Mule runtime → connects automatically to the shared Camunda cluster.

## 7. Setup Steps (everyone does this in < 2 hours)

1. All students → sign up at https://camunda.com → create free cluster → share Cluster ID + Client credentials.
2. Import the BPMN XML (I already gave you, only change service tasks → external tasks with job types).
3. Deploy process to the cluster (one click in Camunda Modeler or via API).
4. One student creates Anypoint Platform account → creates API in API Manager that proxies `POST /promotions` → Camunda start-process endpoint.
5. Each student downloads:
   - Talend Open Studio (free) or Anypoint Studio (free)
   - Zeebe client library for chosen language
   - Implements their 1–3 jobs with hardcoded JSON
6. Run locally → worker connects → ready.

## 8. Advantages of this Solution

- Works 100% even if students are in different countries.
- No ngrok, no port forwarding, no changing URLs.
- Fully satisfies professor requirements (Camunda + Talend ESB + Anypoint + API Gateway).
- Extremely easy to demonstrate (open Tasklist/Operate in browser → see process moving in real time).
- Zero cost.
- Can switch any worker to return `approved: false` → see rejection path instantly.

This is the cleanest, most professional, and most reliable architecture you can present for a student project while using exactly the tools your professor mentioned.

If you want me to generate the ready-to-run code for each worker (Node.js version, Talend job, Mule project zip, Anypoint API spec, updated BPMN XML with external tasks), just say the word — I can deliver all of it in the next message.