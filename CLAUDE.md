# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WealthHub is a mobile-first web application for private client asset management built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Ant Design Mobile.

**Key Technologies:**
- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- Ant Design Mobile (`antd-mobile`)
- Lucide React (icons)
- Package Manager: `pnpm`

## Development Commands

**Setup & Running:**
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server at http://localhost:3000
pnpm build                # Production build (includes type checking)
pnpm start                # Start production server
```

**Quality Checks:**
```bash
pnpm lint                 # Run ESLint
```

**Note:** No test framework is currently configured.

## Architecture & Code Patterns

### File Structure
- **`app/`** - Next.js App Router pages and layouts
- **`components/`** - Reusable UI components (AssetCard, Header, BottomNav, etc.)
- **`types.ts`** - TypeScript type definitions (Asset, ChartConfig, DistributionItem)
- **`utils.ts`** - Shared utility functions (formatNumber, createAssetObject, generateId)

### Client-Side State Management
- **Local UI State:** `useState` for component state
- **Data Persistence:** `localStorage` key `'private_client_assets'`
- **Critical Pattern:** Use `isLoaded` flag to prevent hydration mismatches when loading from localStorage

**Example from `app/page.tsx`:**
```tsx
const [assets, setAssets] = useState<Asset[]>([]);
const [isLoaded, setIsLoaded] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem('private_client_assets');
  setAssets(saved ? JSON.parse(saved) : defaultAssets);
  setIsLoaded(true);
}, []);

useEffect(() => {
  if (isLoaded) {
    localStorage.setItem('private_client_assets', JSON.stringify(assets));
  }
}, [assets, isLoaded]);
```

### Component Conventions
- **Server Components by default** - Only add `'use client'` directive when using hooks or event handlers
- **Component Definition:** Use `const ComponentName: React.FC<Props> = ({ prop }) => { ... }` pattern
- **Pages:** Use `export default function PageName() { ... }`

### Import Conventions
**ALWAYS use `@/` alias for internal imports:**
```tsx
// ✅ Correct
import Header from '@/components/Header';
import { Asset } from '@/types';

// ❌ Avoid
import Header from '../components/Header';
```

### Mobile-First Design
- Application is designed for mobile web with desktop preview
- Main container: `max-w-md` to simulate mobile screen
- Layout wrapper in `app/page.tsx` includes shadow and border for desktop viewing
- Touch targets must be accessible

### Dark Mode (CRITICAL)
All UI components MUST support dark mode using Tailwind's dark mode classes:
```tsx
// Pattern
className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
```

The app defaults to dark mode (see `app/layout.tsx`: `<html className="dark">`).

### TypeScript Standards
- **Strict mode enabled**
- Explicitly define interfaces for component props
- Avoid `any` - use specific types or `unknown` with narrowing
- Return types encouraged for complex functions

**Example:**
```tsx
interface AssetCardProps {
  asset: Asset;
  className?: string;
}
```

### Styling with Tailwind
- Use Tailwind utility classes exclusively
- Avoid CSS modules unless necessary for complex animations
- Use semantic color naming or Slate/Zinc for neutrals

### ESLint Configuration
The following rules are intentionally disabled in `eslint.config.mjs`:
- `react-hooks/set-state-in-effect`
- `react-hooks/refs`
- `react-hooks/exhaustive-deps`
- `@typescript-eslint/no-empty-object-type`
- `@next/next/google-font-display`
- `@next/next/no-page-custom-font`

Be mindful of potential infinite loops in `useEffect` despite disabled exhaustive-deps rule.

## Asset Data Model

The core data type is `Asset` (defined in `types.ts`):
```tsx
interface Asset {
  id: string;
  type: 'rmb' | 'usd' | 'gold' | 'debt';
  title: string;
  subtitle: string;
  amount: number;
  displayAmount: string;
  subAmount: string;
  subAmountColor?: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  chart: ChartConfig;
  date?: string;
}
```

**Creating Assets:** Use `createAssetObject()` from `utils.ts` to ensure consistent asset structure with proper formatting, icons, and chart configurations.

## Important Implementation Notes

1. **Hydration Safety:** When adding features that use localStorage, always use the `isLoaded` pattern to prevent hydration mismatches
2. **ID Generation:** Assets have duplicate detection logic in `app/page.tsx` - new assets should use `generateId()` from utils
3. **Number Formatting:** Use `formatNumber()` utility for consistent number display with commas and appropriate decimals
4. **Mobile Layout:** Maintain the `max-w-md` container pattern to preserve mobile simulation on desktop
5. **Asset Types:** The app supports four asset types (rmb, usd, gold, debt) - each has specific icon, color, and subtitle patterns defined in `createAssetObject()`

## Reference Documentation

For existing AGENTS.md patterns and conventions, see `AGENTS.md` in the repository root.
