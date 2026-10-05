# PrintHub Studio — Cloud AI Omni Router Architecture & Implementation Blueprint

## 1. System Overview & Existing Architecture Audit

### 1.1 Existing Architecture
- **Desktop Runtime**: Electron 34 (`electron/main.cjs` + `electron/preload.cjs`).
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4.
- **Current AI Usage**:
  - `src/passport-studio/services/image-processing.service.ts` calls `AiOmniRouter.removeBackground(src)`.
  - Electron main process currently handles `printhub:ai-remove-bg` and `printhub:ai-ocr` via basic IPC.
  - Vite dev server provides `/api/ai/remove-bg` via middleware.
  - Client has 15-stage offline fallback via WASM/MediaPipe `MattingEngine`.

### 1.2 Unified AI Gateway Strategy (No Duplicate Servers)
To strictly adhere to Rule 48 ("Do not create duplicate servers"):
1. The **AI Omni Router Core Engine** is created inside `ai-gateway/` as an isomorphic, modular TypeScript/Node package.
2. It is consumed directly by:
   - **Electron Main IPC Handlers**: Zero-network-latency desktop bridge (`printhub:ai-*`), securely executing in Node.js without exposing any API keys to renderer.
   - **Vite Middleware / Express Gateway Router**: Mounted at `/api/ai/*` for browser dev mode and REST API compliance.
3. This guarantees a single source of truth for providers, quota tracking, temp file security, privacy, and failover logic.

---

## 2. High-Level Omni Router Topology

```text
                                PRINT HUB STUDIO
                       (React 19 + Electron Desktop UI)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       Electron Native IPC                           Browser Dev HTTP
      (window.electronAPI)                         (POST /api/ai/*)
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                       AI GATEWAY CONTROLLER & MIDDLEWARE
                         (Security, Validation, Logging)
                                       │
                                       ▼
                             AI OMNI ROUTER CORE
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
         [Capability Check]     [Free-Only Guard]     [Quota / Health Check]
                │                      │                      │
                └──────────────────────┬──────────────────────┘
                                       │
                            PROVIDER REGISTRY DISPATCH
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
    [BGNinja]                     [withoutBG]                   [OCR.space]
 (Background AI)               (Background AI)                   (OCR AI)
  Tier 1 Free                   Tier 2 Free                     Multi-language
  No Auth Key                   50 Free Credits                  Zero-Retention
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                            [Cloudflare Workers AI]
                           (Open-Source Free Models)
                                       │
                                       ▼
                       TEMP RESULT VALIDATION & CLEANUP
                     (TempAI/ auto-purged, EXIF stripped)
                                       │
                                       ▼
                     RETURN CLEAN RESULT TO DESKTOP CLIENT
                                       │
                                       ▼
                           USER SAVES LOCALLY TO PC
                          (Original file untouched)
```

---

## 3. Privacy & Zero-Retention Architecture

- **No Cloud Image Storage**: PrintHub never uploads to S3, Cloudinary, Firebase, or Supabase.
- **In-Memory & Scoped Temp Only**: Inputs exist only in memory buffers or inside `TempAI/requests/request_<uuid>_input.tmp` with a 5-minute automated lifetime.
- **Immediate Cleanup**: Once the AI provider returns a result and it is transmitted to the client, temporary disk assets are immediately deleted (`fs.unlinkSync`).
- **Periodic Janitor**: An automatic background interval (every 60 seconds) sweeps any orphaned temp files.
- **Sanitized Logging**: Image data, Base64 strings, OCR text content, customer names, and file paths are strictly redacted from logs.
- **EXIF Stripping**: Unnecessary metadata (GPS coordinates, camera serials, timestamps) is stripped before dispatching to any cloud provider.

---

## 4. Phase-by-Phase Roadmap

| Phase | Description | Deliverable | Status |
|---|---|---|---|
| **Phase 1** | AI Gateway Skeleton | `ai-gateway/` core types, configuration, security validators, temp manager, secure logger, provider registry base | **IN PROGRESS** |
| **Phase 2** | BGNinja Provider | Provider adapter for `bgninja.com/api/remove` with zero-key free tier handling | Pending |
| **Phase 3** | withoutBG Provider | Provider adapter for `api.withoutbg.com` with secure backend API key management | Pending |
| **Phase 4** | OCR.space Provider | Multi-language OCR adapter (`api.ocr.space/parse/image`) with Bengali & English support | Pending |
| **Phase 5** | Cloudflare Workers AI | Provider adapter for free verified models (Text-to-Image / Vision) | Pending |
| **Phase 6** | AI Omni Router Engine | Dynamic priority, failover cascading, rate limit backoff, metadata-only quota tracking | Pending |
| **Phase 7** | Privacy & Security Hardening | EXIF stripping, temp folder auto-purge, magic byte verification, strict non-destructive file handling | Pending |
| **Phase 8** | Electron & UI Panel Integration | Professional AI Studio panel with live provider health, consent dialog, progress, "Save As New File" | Pending |
| **Phase 9** | Automated Testing & Documentation | Full unit/integration tests for failover, privacy, security, and provider documentation | Pending |
