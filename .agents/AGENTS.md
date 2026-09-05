# 🤖 PrintHub Studio — Multi-Agent Architecture Guidelines

This project strictly adheres to an 8-Agent Modular Architecture. Every feature, enhancement, and bug fix must be owned and governed by its designated specialized agent.

---

## 🏗️ Master Agent Directory & Responsibilities

### 1. 🎨 UI Agent
- **Scope**: Layouts, Design System, UI Components, Tailwind CSS v4 styling, Dark/Light modes.
- **Paths**: `src/components/ui/`, `src/index.css`.
- **Rules**: Maintain high-contrast dark theme standard (`bg-slate-950`, `bg-slate-900`, `border-slate-800`), responsive grid flexports, and consistent typography.

### 2. ⚡ Frontend Agent
- **Scope**: React 19 state management, Application orchestrator, module routing, global events.
- **Paths**: `src/App.tsx`, `src/types.ts`, `src/components/Dashboard.tsx`.
- **Rules**: Keep modules modularized with React `lazy()` and `Suspense`. Maintain strict TypeScript types.

### 3. 🗄️ Backend Agent
- **Scope**: Laravel 11 REST API, MySQL database migrations, Controllers, Role-Based Access Control (RBAC).
- **Paths**: `laravel_backend/`, `DATABASE.md`, `API_BLUEPRINT.md`.
- **Rules**: Enforce owner/manager/operator permissions, clean JSON API v1 response contracts, and offline local fallback capability.

### 4. 📄 PDF Agent
- **Scope**: Client-side PDF binary engine, PDF merge/split, watermarking, OCR text rendering.
- **Paths**: `src/components/PdfWorkspace.tsx`, `src/engines/PdfEngine.ts`.
- **Rules**: Utilize `pdf-lib` and `pdfjs-dist` efficiently for non-destructive PDF manipulation.

### 5. 📸 Photo Agent
- **Scope**: Fabric.js canvas manipulation, passport photo cropping (35x45mm), layer Z-indexing, background removal.
- **Paths**: `src/components/PhotoWorkspace.tsx`, `src/passport-studio/`, `src/engines/CanvasEngine.ts`, `src/engines/CropEngine.ts`.
- **Rules**: Render high-DPI (300 DPI) canvas layers with smooth 60fps interaction.

### 6. 🖨️ Print Agent
- **Scope**: Live print spooler queue, hardware device status, live paper print preview, print cost calculator.
- **Paths**: `src/components/PrintCenter.tsx`, `src/components/PrintPreviewModal.tsx`, `src/engines/PrintEngine.ts`.
- **Rules**: Calculate volume discounts, maintain live paper sheet preview (A4, 4R, Legal, Stamp), and support direct `window.print()`.

### 7. 🤖 AI Agent
- **Scope**: Background removal, OCR text recognition, image sharpening, auto-passport cropping, AI document drafting.
- **Paths**: `src/components/AiStudio.tsx`, `src/engines/ImageEngine.ts`.
- **Rules**: Optimize local GPU/WASM execution and provide fast 1-click AI operations.

### 8. 🧪 QA Agent
- **Scope**: Build verification, TypeScript type checking, memory leak checks, error boundaries, hotkey management.
- **Paths**: `package.json`, `tsconfig.json`, `vite.config.ts`.
- **Rules**: Ensure zero compilation errors (`npm run build`) and validate multi-browser compatibility.
