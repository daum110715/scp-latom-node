# Design System

The SCP Docs UI uses a custom CSS design system built on CSS custom properties, supplemented by Tailwind CSS v4 for utility classes. The design follows the SCP Foundation aesthetic: dark backgrounds, gold/amber accents, and a monospace terminal feel.

## CSS Architecture

### Files

- `src/styles/variables.css` — All design tokens as CSS custom properties
- `src/styles/base.css` — Global resets, typography, transitions, scrollbar, reduced motion
- `src/styles/tailwind.css` — Tailwind CSS v4 import
- `src/styles/mobile.css` — Mobile-specific CSS overrides

### Theme System

Two themes are controlled by the `data-theme` attribute on `<html>`:

- **Dark theme** (default): `[data-theme='dark']` or `:root`
- **Light theme**: `[data-theme='light']`

Theme toggle logic: `src/composables/useTheme.ts`
Persistence: `localStorage` key `scp-theme`

## Design Tokens

All tokens are defined in `src/styles/variables.css`. Use them via `var(--token-name)` in your styles.

### Color Palette

#### Background Scale

| Token            | Dark     | Light    |
| ---------------- | -------- | -------- |
| `--bg-primary`   | `#0a0a0f` | `#f8f8fc` |
| `--bg-secondary` | `#0f0f17` | `#f0f0f6` |
| `--bg-surface`   | `#12121a` | `#ffffff` |
| `--bg-elevated`  | `#1a1a26` | `#f4f4fa` |
| `--bg-hover`     | `#1e1e2e` | `#eaeaf2` |

#### Border Scale

| Token              | Dark     | Light    |
| ------------------ | -------- | -------- |
| `--border-subtle`  | `#1e1e2e` | `#e4e4ee` |
| `--border-default` | `#2a2a3e` | `#d0d0de` |
| `--border-strong`  | `#3a3a52` | `#b0b0c2` |

#### Text Scale

| Token             | Dark     | Light    |
| ----------------- | -------- | -------- |
| `--text-primary`  | `#e8e8ec` | `#1a1a2e` |
| `--text-secondary`| `#8888a0` | `#5a5a72` |
| `--text-tertiary` | `#5a5a72` | `#8888a0` |
| `--text-inverse`  | `#0a0a0f` | `#f8f8fc` |

#### Accent Colors

| Token                  | Dark      | Light     |
| ---------------------- | --------- | --------- |
| `--color-primary`      | `#c9a44a` | `#a8842a` |
| `--color-primary-hover`| `#dbb85c` | `#8a6d22` |
| `--color-primary-muted`| `#c9a44a22` | `#a8842a18` |
| `--color-accent`       | `#4a9eff` | `#2563eb` |
| `--color-accent-hover` | `#6ab4ff` | `#1d4ed8` |
| `--color-accent-muted` | `#4a9eff18` | `#2563eb12` |
| `--color-danger`       | `#e05252` | `#e05252` |
| `--color-danger-muted` | `#e0525218` | `#e0525218` |
| `--color-success`      | `#4ade80` | `#4ade80` |
| `--color-success-muted`| `#4ade8018` | `#4ade8018` |

#### Object Class Colors

These colors are consistent across both themes:

| Token                | Color   | Object Class |
| -------------------- | ------- | ------------ |
| `--class-safe`       | `#4ade80` | Safe (green) |
| `--class-euclid`     | `#facc15` | Euclid (yellow) |
| `--class-keter`      | `#ef4444` | Keter (red) |
| `--class-thaumiel`   | `#a855f7` | Thaumiel (purple) |
| `--class-apollyon`   | `#1a1a2e` | Apollyon (near-black) |
| `--class-neutralized`| `#6b7280` | Neutralized (gray) |

### Spacing Scale

| Token        | Value |
| ------------ | ----- |
| `--space-xs` | 4px   |
| `--space-sm` | 8px   |
| `--space-md` | 16px  |
| `--space-lg` | 24px  |
| `--space-xl` | 32px  |
| `--space-2xl`| 48px  |
| `--space-3xl`| 64px  |

### Typography

**Font families:**

| Token         | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`       |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`                     |

**Size scale:**

| Token          | Value     |
| -------------- | --------- |
| `--text-xs`    | 0.75rem   |
| `--text-sm`    | 0.875rem  |
| `--text-base`  | 1rem      |
| `--text-lg`    | 1.125rem  |
| `--text-xl`    | 1.25rem   |
| `--text-2xl`   | 1.5rem    |
| `--text-3xl`   | 1.875rem  |
| `--text-4xl`   | 2.25rem   |

**Line heights:**

| Token              | Value |
| ------------------ | ----- |
| `--leading-tight`  | 1.25  |
| `--leading-normal` | 1.5   |
| `--leading-relaxed`| 1.7   |

### Borders & Radius

| Token          | Value  |
| -------------- | ------ |
| `--radius-sm`  | 6px    |
| `--radius-md`  | 10px   |
| `--radius-lg`  | 16px   |
| `--radius-full`| 9999px |

### Shadows

| Token           | Value                                       |
| --------------- | ------------------------------------------- |
| `--shadow-sm`   | `0 1px 2px rgba(0, 0, 0, 0.3)` (dark)      |
| `--shadow-md`   | `0 4px 12px rgba(0, 0, 0, 0.4)` (dark)     |
| `--shadow-lg`   | `0 8px 32px rgba(0, 0, 0, 0.5)` (dark)     |
| `--shadow-glow` | `0 0 20px var(--color-primary-muted)`       |

Light theme uses reduced opacity: `0.06`, `0.08`, `0.12` respectively.

### Layout Constants

| Token             | Value                        |
| ----------------- | ---------------------------- |
| `--sidebar-width` | 260px                        |
| `--header-height` | 60px                         |
| `--max-content`   | 900px                        |
| `--nav-height`    | 60px                         |
| `--pad-page`      | `clamp(16px, 4vw, 32px)`    |

### Transitions

| Token                | Value                                    |
| -------------------- | ---------------------------------------- |
| `--transition-fast`  | `150ms cubic-bezier(0.4, 0, 0.2, 1)`   |
| `--transition-normal`| `250ms cubic-bezier(0.4, 0, 0.2, 1)`   |
| `--transition-slow`  | `400ms cubic-bezier(0.4, 0, 0.2, 1)`   |

### Z-index Scale

| Token          | Value |
| -------------- | ----- |
| `--z-sidebar`  | 40    |
| `--z-header`   | 50    |
| `--z-modal`    | 60    |
| `--z-toast`    | 70    |

## Component Conventions

### Common Components (`src/components/common/`)

- **Badge.vue** — Classification/status badges with color-coded variants
- **Card.vue** — Content cards with consistent styling and optional hover effect
- **ClassBar.vue** — Object class colored dot indicator
- **ErrorBoundary.vue** — Vue error boundary with retry functionality
- **BackToTop.vue** — Scroll-to-top button
- **ReportDialog.vue** — Dialog for reporting entry issues

### Using Design Tokens

Always use CSS custom properties rather than hardcoded values:

```css
/* Correct */
.entry-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  color: var(--text-primary);
  transition: box-shadow var(--transition-fast);
}

.entry-card:hover {
  box-shadow: var(--shadow-glow);
}

/* Avoid */
.entry-card {
  background: #12121a;
  border: 1px solid #2a2a3e;
  border-radius: 10px;
  padding: 24px;
  color: #e8e8ec;
}
```

### Adding New Tokens

1. Add the token to `src/styles/variables.css` under the appropriate section
2. Add a light theme override under `[data-theme='light']` if the value differs
3. Document the token in this file
