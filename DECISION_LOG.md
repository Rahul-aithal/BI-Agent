Here is your updated, submission-ready **`DECISION_LOG.md`**.

It incorporates your Next.js migration, the temporary Gemini 3.6 Flash model swap, the intentional omission of Auth/MongoDB, and a dedicated **"Creativity & Product Decisions"** section to ensure evaluators award maximum points on the rubric.

---

# Decision Log — Skylark BI Agent

## 1. Key Assumptions

1. **Column titles, not IDs, are the integration contract.** monday.com assigns internal column IDs (`text_mkabc123`) that differ per board instance. Rather than hardcoding fragile IDs, the cleaning layer matches on **column title**. Trade-off: renaming a column in monday.com requires updating the mapping, but this remains significantly more maintainable for a founder-facing tool than a static config file.
2. **"Client Code" (`COMPANY###`) and "Customer Name Code" (`WOCOMPANY###`) are not joinable.** The sample data uses different numbering namespaces across boards. I chose NOT to guess a string-manipulation join (e.g., stripping "WO") to prevent silent data corruption. Instead, the agent correlates cross-board questions via sector + time windows and explicitly notes that the relationship is an approximation.
3. **Deal Name / `itemName` is not a unique identifier.** Pseudonymized character names repeat across unrelated deals. The true distinguishing compound key is `(Client Code + Deal Stage + Created Date)`, which is baked into the agent's domain knowledge.
4. **"Tender" is a channel/source, not a industry sector.** It appears in the sector column but represents deal acquisition method. It is retained in raw queries but explicitly excluded from sector-level rollups to prevent misrepresenting industry metrics.
5. **Corrupted header row filtering.** Embedded mid-dataset header rows (e.g., row ~52) with literal values equal to column titles are detected and dropped defensively during data ingest.
6. **Domain shorthand requires proactive mapping.** Terms like "Energy sector" don't exist as exact matches in the taxonomy. The agent is instructed to state its interpretation (e.g., _"treating Energy as Renewables + Powerline"_) and proceed rather than blocking the founder with repetitive clarifying questions.

---

## 2. Technical Stack & Architecture Decisions

- **Framework & Hosting (Next.js + Vercel):** Ported from Express to Next.js (App Router) deployed on Vercel. The core agent architecture (`orchestrator.ts`, `tools.ts`, `dataCleaning.ts`, `boards.ts`) remains framework-agnostic and is wrapped cleanly inside a Next.js Serverless Route Handler (`/api/chat`).
- **LLM Engine & Temporary Model Swap (Gemini 3.6 Flash):** Designed originally for Claude 3.5 Sonnet, the agent was temporarily swapped to Google Gemini (`gemini-3.6-flash`) via `@google/generative-ai` due to API billing constraints during dev/exam period. The orchestrator loop preserves Gemini's native `thought_signature` state metadata across function calls. The tool-definition layer remains completely provider-agnostic for seamless reversion back to Claude Sonnet in production.
- **Omission of User Auth & Database (MongoDB):** Intentionally omitted user authentication and database persistence. Adding auth creates friction for evaluators reviewing a 6-hour project and consumes time better spent on core BI logic, data resilience, and query interpretation. The hosted app is stateless, public, and immediately testable.

---

## 3. Core Trade-offs

- **Full-Dataset Memory vs. Granular API Filters:** `get_deals` and `get_work_orders` return entire cleaned datasets into context rather than exposing granular parameter filters. This gives the LLM maximum flexibility to execute complex, unexpected cross-field aggregations. _Trade-off:_ Does not scale to 50k+ row enterprise boards (context window & latency limits), but is optimal for this dataset's scale.
- **5-Minute In-Memory Cache:** Balances live data querying against API rate limits and execution speed. A production deployment would replace TTL caching with monday.com webhook event listeners.
- **GraphQL API over stdio MCP:** Chose direct HTTP/GraphQL integration over an stdio-based Model Context Protocol server to eliminate deployment risk on serverless platforms (Vercel) within the 6-hour timebox.

---

## 4. Creativity & Product Decisions (Founder-Centric UX)

To elevate the agent beyond a standard database scraper into a true Executive Chief-of-Staff, I incorporated four founder-focused product features:

- **Quick-Action "Starter Chips":** Embedded 1-click preset prompts (_"📊 Executive Pipeline Briefing"_, _"⚡ Energy Sector Performance"_, _"🚨 Data Integrity Audit"_, _"📧 Draft Leadership Update"_) above the chat bar to eliminate cold-start friction.
- **Transparent Data Integrity & Confidence Badges:** The agent explicitly audits and surfaces data health warnings inline (e.g., missing close dates, float masking artifacts, unformatted units) alongside revenue figures so founders don't make strategic decisions on flawed assumptions.
- **Paste-Ready Executive Formatting:** Built custom prompt rules allowing the agent to generate cleanly structured Markdown briefings designed specifically for immediate sharing in Slack or email updates.

---

## 5. Interpretation of "Leadership Updates" (Optional Requirement)

I interpreted "leadership updates" as an **executive synthesis capability integrated directly into the conversational flow**, rather than a disconnected document-export pipeline.

When asked for a leadership update, the agent formats its response into a tight executive summary structure:

1. **Headline KPIs** (Total Active Pipeline Value, Active Work Orders)
2. **Key Victories & Sector Highlights**
3. **Operational Bottlenecks / Risks**
4. **Data Quality Caveats & Assumptions**

This keeps the interface unified and immediate while delivering paste-ready comms for founder updates.

---

## 6. What I'd Do Differently With More Time

1. **Deterministic Cross-Board Join Key:** Work with the data owner to confirm whether `COMPANY###` and `WOCOMPANY###` map 1:1, enabling exact pipeline-to-execution conversion metrics.
2. **Production Model Swap:** Restore the primary LLM provider back to Anthropic Claude 3.5 Sonnet for production deployment.
3. **Webhook-Driven Cache Invalidation:** Replace the 5-minute TTL with real-time monday.com webhook triggers to update cache state instantly upon board edits.
4. **Persistent Operations Dashboard:** Surface the data-cleaning report as a standalone UI tab so operations teams can fix missing fields in monday.com without running manual chat queries.
