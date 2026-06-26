# SCP Docs — Frontend Design Specification

## Design Philosophy

**Minimal. Terminal-inspired. Dark-first.**

The interface evokes a classified terminal system — clean lines, monospaced data, restrained color. Every element serves a function. Decorative noise is eliminated.

### Principles
- **Clarity over decoration** — content is the interface
- **Consistent rhythm** — 4px spacing grid, systematic type scale
- **Dark-first** — light theme is a derived override, not a separate design
- **Mobile-native** — mobile UI is a first-class citizen, not a responsive afterthought

---

## Color System

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#c9a44a` | Gold — primary actions, active states, brand identity |
| `accent` | `#4a9eff` | Blue — links, informational emphasis |
| `danger` | `#e05252` | Red — errors, destructive actions, Keter class |
| `success` | `#4ade80` | Green — confirmations, Safe class |

### Surfaces (Dark Theme)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#0f0f17` | Code blocks, pre-formatted |
| `bg-surface` | `#12121a` | Cards, panels, modals |
| `bg-elevated` | `#1a1a26` | Input fields, elevated cards |
| `bg-hover` | `#1e1e2e` | Hover states |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#e8e8ec` | Headings, primary content |
| `text-secondary` | `#8888a0` | Body text, descriptions |
| `text-tertiary` | `#5a5a72` | Labels, metadata, placeholders |
| `text-inverse` | `#0a0a0f` | Text on primary-colored backgrounds |

### SCP Object Classes
| Class | Color | Hex |
|-------|-------|-----|
| Safe | Green | `#4ade80` |
| Euclid | Yellow | `#facc15` |
| Keter | Red | `#ef4444` |
| Thaumiel | Purple | `#a855f7` |
| Apollyon | Dark | `#1a1a2e` |
| Neutralized | Gray | `#6b7280` |

---

## Typography

### Font Stack
- **UI / Body**: Inter, system sans-serif
- **Data / Code**: JetBrains Mono, monospace

### Scale
| Token | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Labels, metadata, badges |
| `text-sm` | 0.875rem (14px) | Body text, buttons |
| `text-base` | 1rem (16px) | Default body |
| `text-lg` | 1.125rem (18px) | Section descriptions |
| `text-xl` | 1.25rem (20px) | Section titles |
| `text-2xl` | 1.5rem (24px) | Page subtitles |
| `text-3xl` | 1.875rem (30px) | Page titles |
| `text-4xl` | 2.25rem (36px) | Hero headings |

---

## Spacing

4px base grid. All spacing is a multiple of 4.

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `3xl` | 64px |

---

## Component Specifications

### Cards
- Background: `bg-surface`
- Border: 1px `border-subtle`
- Border radius: `radius-lg` (16px)
- Padding: `space-lg` (24px)
- Hover: border → `primary`, subtle glow shadow

### Badges
- Inline-flex, pill shape (`radius-full`)
- Background: class color at 12% opacity
- Text: class color
- Padding: 2px 10px

### Buttons
- **Primary**: `bg-primary`, `text-inverse`, `radius-md`
- **Ghost**: transparent, `border-default`, `text-secondary`
- **Danger**: `bg-danger-muted`, `text-danger`, `border-danger`
- Min height: 40px
- Padding: 10px 22px

### Inputs
- Background: `bg-elevated`
- Border: 1px `border-subtle`
- Border radius: `radius-md`
- Focus: `primary` border + 3px `primary-muted` outline
- Padding: 10px 16px

### Modals
- Overlay: `rgba(0,0,0,0.6)` + `blur(4px)`
- Background: `bg-surface`
- Border radius: `radius-lg`
- Max width: 580px (search), 720px (documents)
- Max height: 85vh

---

## Desktop Layout

- **Header**: Fixed top, 60px height, glass-morphism background
- **Sidebar**: Fixed left, 260px width, navigation + system info
- **Content**: `margin-left: 260px`, max-width 900px, centered
- **Footer**: Bottom of content area

---

## Mobile Layout (≤768px)

### Header
- Fixed top, 52px height
- Left: Logo icon
- Center: Page title
- Right: Search icon, auth avatar/login

### Bottom Navigation
- Fixed bottom, 56px + safe-area padding
- 5 tabs: Home, Catalog, Documents, About, Profile
- Each tab: icon + 10px label
- Active indicator: 2px gold bar at top of tab

### Touch Targets
- Minimum: 44×44px for all interactive elements
- Button min-height: 48px on mobile
- Input min-height: 48px on mobile

### Safe Areas
- Top: `env(safe-area-inset-top)` — header
- Bottom: `env(safe-area-inset-bottom)` — bottom nav

### Page Patterns
- **Lists**: Full-width cards, vertical stack
- **Filters**: Horizontal scroll pills
- **Forms**: Full-screen, large inputs, bottom-anchored submit
- **Detail pages**: Full-width, stacked sections
- **Modals**: Full-screen overlays instead of centered dialogs

---

## Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | ≤768px | Bottom nav, no sidebar, full-width cards |
| Tablet | 769–1024px | Condensed sidebar or bottom nav |
| Desktop | >1024px | Full sidebar + header |
