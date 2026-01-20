# Agent Guidelines for WealthHub Next.js

This document defines the coding standards, workflows, and conventions for AI agents (and human developers) working on the WealthHub Next.js repository.

## 1. Project Overview & Environment

**Stack**:
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: Ant Design Mobile (`antd-mobile`), Lucide React
- **Language**: TypeScript

**Package Manager**: `pnpm` (Use `pnpm` for all dependency management)

## 2. Development Commands

### Build & Run
- **Install Dependencies**: `pnpm install`
- **Development Server**: `pnpm dev`
  - Runs at `http://localhost:3000`
- **Production Build**: `pnpm build`
  - Creates an optimized production build in `.next/`
- **Start Production**: `pnpm start`

### Quality Checks
- **Linting**: `pnpm lint`
  - Uses `eslint` with `eslint-config-next`.
  - **Note**: Some rules like `react-hooks/exhaustive-deps` are explicitly disabled in `eslint.config.mjs`. Respect this configuration but be mindful of infinite loops in `useEffect`.
- **Type Checking**: Run `pnpm build` (Next.js runs type checking during build) or configure a separate `tsc --noEmit` script if needed.

### Testing (Configuration Status)
*Currently, no test framework is detected in `package.json`.*

**If asked to implement tests:**
1. **Recommended Stack**: Jest + React Testing Library.
2. **File Convention**: Place tests alongside components (e.g., `components/AssetCard.test.tsx`) or in `__tests__`.
3. **Running Tests** (Future):
   - All tests: `pnpm test`
   - Single test: `pnpm test -- -t "Component Name"` or `pnpm test -- path/to/file`

## 3. Code Style & Conventions

### File Organization
- **App Router**: Routes are defined in `app/`. Use `page.tsx` for views, `layout.tsx` for wrappers.
- **Components**: Reusable UI components go in `components/`.
- **Utilities/Types**: Currently in root (`types.ts`, `utils.ts`).
  - *Agent Note*: When adding new shared logic, prefer keeping it in `utils.ts` unless it warrants a new module.

### Imports
- **Absolute Imports**: ALWAYS use the `@/` alias for internal imports.
  ```typescript
  // ✅ Correct
  import Header from '@/components/Header';
  import { Asset } from '@/types';
  
  // ❌ Avoid
  import Header from '../components/Header';
  ```

### TypeScript Usage
- **Strict Mode**: Enabled.
- **Props Interfaces**: Explicitly define interfaces for component props.
  ```tsx
  interface AssetCardProps {
    asset: Asset;
    className?: string; // Optional styling overrides
  }
  ```
- **Avoid `any`**: Use specific types. If a type is unknown, use `unknown` and narrow it.
- **Return Types**: Explicit return types for complex functions are encouraged but not mandatory if inferred correctly.

### Component Patterns
- **Client vs Server**:
  - Default to Server Components (no `'use client'`) where possible.
  - Add `'use client';` at the VERY TOP of files using hooks (`useState`, `useEffect`) or event listeners.
- **Definition Style**:
  - **Pages**: `export default function PageName() { ... }`
  - **Components**: `const ComponentName: React.FC<Props> = ({ prop }) => { ... }` is common in this repo.
- **Mobile First**: This is a mobile-web app.
  - Use `max-w-md` containers to simulate mobile screens on desktop.
  - Ensure touch targets are accessible.

### Styling (Tailwind CSS)
- **Utility Classes**: Use Tailwind classes for all styling. Avoid CSS modules unless for complex animations not possible with Tailwind.
- **Dark Mode**: **CRITICAL**. All components MUST support dark mode.
  - Pattern: `bg-light-color dark:bg-dark-color`
  - Text: `text-slate-900 dark:text-white`
- **Colors**: Use the project's semantic naming if available, or fall back to Slate/Zinc for neutrals.

### Naming Conventions
- **Files**: PascalCase for components (`AssetCard.tsx`), kebab-case or camelCase for utilities (`utils.ts`).
- **Variables**: camelCase (`isLoading`, `assets`).
- **Types/Interfaces**: PascalCase (`Asset`, `AssetOverviewProps`).

## 4. State Management & Data
- **Local State**: `useState` for UI state.
- **Persistence**: `localStorage` is used for user data (`private_client_assets`).
  - *Pattern*: Initialize state, then `useEffect` to load from localStorage to avoid hydration mismatches.
  - *Loading State*: Use an `isLoaded` flag to prevent rendering before client-side data is ready.

## 5. Error Handling
- **Async Operations**: Wrap in `try/catch` blocks.
- **UI Feedback**: Provide visual feedback for loading/error states (skeletons or spinners).

## 6. Implementation Rules for Agents
1. **Analyze First**: Before editing, read the file to understand existing patterns.
2. **Minimal Changes**: Only modify what is requested.
3. **Verify Imports**: Ensure `@/` alias is used.
4. **Dark Mode Check**: If adding UI, ask: "How does this look in dark mode?"
5. **No Regression**: Do not break the mobile layout wrapper (`max-w-md` logic in `page.tsx`).

## 7. Cursor / Copilot Rules
*(No existing .cursorrules or .github/copilot-instructions.md found in repository)*

**General Rules for AI Assistants:**
- **Brevity**: Write concise, working code.
- **Explanation**: Explain *why* a change was made if it involves logic (e.g., "Added isLoaded check to fix hydration error").
- **Safety**: Do not delete `bak` files (like `AddAssetModal.tsx.bak`) unless explicitly asked.

---
*Generated by Opencode Agent on Tue Jan 20 2026*
