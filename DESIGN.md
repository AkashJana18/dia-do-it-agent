---
name: DIA (Do-It Agent)
description: Voice-first autonomous business teammate for Paytm merchants; the red-cloth bahi-khata ledger on a desk.
colors:
  desk: "#0e0c0a"
  paper: "#f4ecdc"
  paper-2: "#efe3cc"
  ink: "#1a1612"
  ink-soft: "#3a332a"
  margin: "#b01e2a"
  gold: "#b8860b"
  credit: "#1e4a8a"
  success: "#15803d"
  warning: "#b45309"
  danger: "#b91c1c"
typography:
  display:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "normal"
  title:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
  caption:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  none: "0px"
  sm: "2px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.margin}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "rgba(176, 30, 42, 0.9)"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.margin}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  input-field:
    backgroundColor: "rgba(244, 236, 220, 0.6)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "20px"
  nav-item-active:
    backgroundColor: "{colors.margin}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: DIA (Do-It Agent)

## Overview

**Creative North Star: "The Red-Cloth Bahi-Khata"**

DIA is a voice-first autonomous business teammate for small merchants, and its interface is the red-cloth bahi-khata opened on the counter under one lamp. The ground is a dark espresso desk; the content lives on warm cream paper panels; a red margin line runs through the page; type is ink-black; totals are gold. The merchant reads it the way they read a ledger, line by line, and DIA writes each agent step as a line being posted. There is no generic admin dashboard and no dark-cyber AI look: no glass, no gradients, no neon, no purple. Depth comes from the paper panel resting on the desk, not from blur or glow. Hierarchy is carried by weight and case, not by size alone, so the type scale stays narrow. Money and counts always use tabular numerals.

**Key Characteristics:**

- Dark espresso desk ground (`#0e0c0a`) with warm cream paper panels (`#f4ecdc`) as the only content surface.
- Red margin line (`#b01e2a`) used for primary actions, active navigation, pending approvals, and the margin rule.
- Three text inks only: ink (`#1a1612`), ink-soft (`#3a332a`), and margin red for emphasis.
- Gold (`#b8860b`) reserved for totals and the wordmark; never for body text.
- Mukta for both Latin and Devanagari, weights 300-800; tabular numerals for all numbers.
- Sharp corners (2px) everywhere except the fully round record button; stamps keep square corners.
- One shadow only: the paper-panel drop; everything else is flat.

## Colors

The palette is a khata on a desk: espresso ground, cream paper, red margin, ink type, gold totals.

### Primary

- **Margin Red** (#b01e2a): Primary action color. Used for primary buttons, active nav items, pending-approval cards, the red margin line, and error/failed states. Its rarity is the point; it should never flood a screen.

### Secondary

- **Total Gold** (#b8860b): Used for the wordmark subtitle ("Do-It Agent") and for totals/summary figures in charts. Never for body text or primary actions.

### Tertiary

- **Credit Blue** (#1e4a8a): Declared in the palette for a credit/debit distinction; reserved, not yet wired into the UI.

### Neutral

- **Espresso Desk** (#0e0c0a): Page ground and sidebar background. Dark-first scene.
- **Cream Paper** (#f4ecdc): Primary content surface for cards and panels.
- **Cream Paper 2** (#efe3cc): Secondary paper surface, used for nested cards and input backgrounds.
- **Ink** (#1a1612): Primary text color on paper.
- **Ink Soft** (#3a332a): Secondary text, captions, and muted labels on paper.

### Status

- **Success Green** (#15803d): Completed tool events, healthy margins, completed actions.
- **Warning Amber** (#b45309): Pending tool events, pending approvals, tight-but-open states.
- **Danger Red** (#b91c1c): Failed tool events, rejected actions, tight margins. Shares hue family with Margin Red but is the Tailwind default red-700 used for status chips.

### Named Rules

**The Three Inks Rule.** Body text on paper uses only Ink and Ink Soft; Margin Red is reserved for actions, status, and the margin line. Gold is an accent for totals and the wordmark, never for body text.

**The Margin Is Rare Rule.** The red margin is used on no more than one primary action and the active nav item per screen. Its rarity is what makes a stamp feel like a stamp.

**The No Glass Rule.** No glass, gradients, or neon anywhere. Depth comes from the paper panel resting on the desk ground, never from blur or glow.

## Typography

**Display Font:** Mukta (with ui-sans-serif, system-ui, sans-serif fallback) for all Latin and Devanagari text.
**Body Font:** Mukta (same family; one family carries the whole system).
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, monospace, used only for code in Settings.

**Character:** A single humanist sans that covers both Latin and Devanagari, so Hindi/Hinglish text never falls back to a different voice. Hierarchy is carried by weight and case, not by size alone, which keeps the ledger compact and readable at projector widths. All money and counts use tabular numerals.

### Hierarchy

- **Display** (800, 1.25rem, 1): The "DIA" wordmark in the sidebar. Tight tracking.
- **Headline** (800, 1.5rem, 1.1): Page titles ("Today's page", "The audit ledger"). Extrabold.
- **Title** (700, 1rem, 1.2): Card titles and section headers.
- **Body** (400, 0.875rem, 1.5): Default reading text, list rows, form labels. Max line length ~75ch.
- **Label** (700, 0.6875rem, 0.1em tracking, uppercase): Section labels, table headers, status chips.
- **Caption** (700, 0.625rem, 0.1em tracking, uppercase): Tool-event chips, receipt numbers, timestamps.

### Named Rules

**The Weight Carries Rank Rule.** Hierarchy is carried by weight and case, not by size alone; sizes stay within a narrow 10-24px band so the ledger stays compact.

**The Tabular Numerals Rule.** Every currency value and count uses tabular numerals via the `.num` utility. Never use proportional numerals for money.

**The One Family Rule.** Mukta is the only text face; Devanagari and Latin share one voice. Mono is reserved for code.

## Layout

The layout is a ledger open on a desk. The ground is the espresso desk; the sidebar is a desk rail; content scrolls inside paper panels.

- **Shell:** Flex row, full height. Sidebar `w-60` (240px) on `md` and above; hidden below `md`. Main area flexes and scrolls, with `pb-16` on mobile to clear the bottom nav.
- **Content container:** `max-w-6xl` (1152px) centered with `p-6 md:p-8`. Settings narrows to `max-w-3xl`.
- **Grids:** `lg:grid-cols-5`, `lg:grid-cols-3`, `lg:grid-cols-2` for page layouts; cards at `gap-5`.
- **Breakpoints:** `md` (768px) reveals the sidebar and switches to desktop nav; `lg` (1024px) enables multi-column grids.
- **Mobile nav:** Fixed bottom bar, `z-40`, desk ground at 95% opacity, top border, 8 items in a row, icon plus first word of label at 10px.
- **Spacing rhythm:** 4px base unit (xs 4, sm 8, md 12, lg 16, xl 20, 2xl 24, 3xl 32). Most internal card padding is 20px (xl).
- **Density:** Compact. Rows are 8-10px vertical padding; chips and stamps are 2-4px vertical. No large hero blocks.

## Elevation & Depth

The system is flat by default. The only shadow is the paper panel resting on the desk. There is no glass, blur, or glow.

### Shadow Vocabulary

- **Paper Panel** (`box-shadow: 0 1px 0 rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)`): The single shadow, used by every card and panel. The 1px bottom edge is a hard ruled line; the 8px/24px drop lifts the paper off the desk. Applied via `.paper-panel`.
- **Ruled Lines** (`background-image: repeating-linear-gradient(0deg, transparent 0, transparent 23px, rgba(26,22,18,0.06) 23px, rgba(26,22,18,0.06) 24px)`): Faint horizontal rules inside paper panels, evoking ruled ledger paper.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The paper-panel shadow appears only on content surfaces (cards, message bubbles, preview panels). Nav, buttons, inputs, and chips are flat.

**The One Shadow Rule.** There is exactly one shadow value in the system. Do not invent new elevations; if a surface needs separation, use a border or a tonal step instead.

## Shapes

The form language is a ruled ledger: sharp corners, thin borders, square stamps.

- **Corner radius:** 2px (`rounded-sm`) on cards, buttons, inputs, nav items, chips, and tables. The record button is the sole exception at fully round (`rounded-full`).
- **Stamps and badges:** Square corners (0px) with a 2px solid border, uppercase tracked label. Status stamps use green/amber/red borders on tinted 50-level backgrounds.
- **Borders:** 1px solid at `ink/10` (rgba(26,22,18,0.1)) for dividers and card edges; `ink/20` for input strokes; `white/5` and `white/10` on the desk ground.
- **Margin line:** The red 2px border on pending-approval cards and stamp buttons doubles as the red margin line of the khata.

### Named Rules

**The Sharp Corners Rule.** 2px radius everywhere. Stamps and badges are square. Only the record button is round.

**The Thin Border Rule.** Borders are 1px at low opacity (`ink/10` on paper, `white/5` on desk). A 2px border is reserved for stamps and pending-approval cards.

## Components

### Buttons

- **Shape:** 2px radius, semibold tracked label.
- **Primary:** Margin Red background, cream paper text, 40px height, 0 16px padding. Hover drops to 90% opacity.
- **Secondary:** Cream Paper 2 background, ink text, same metrics. Hover lightens to Cream Paper.
- **Ghost:** Transparent background, paper text on desk, hover white/5. Used on the desk ground.
- **Stamp:** Transparent background, 2px Margin Red border, Margin Red text; hover fills Margin Red with paper text. Used for approve/reject and other stamp actions.
- **Sizes:** sm 32px height / 0 12px, md 40px / 0 16px, lg 48px / 0 24px.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-margin` on all variants. Disabled: 50% opacity, no pointer events.

### Cards / Containers

- **Corner Style:** 2px radius (paper-panel).
- **Background:** Cream Paper; nested cards use Cream Paper 2.
- **Shadow Strategy:** The single paper-panel shadow; ruled lines inside.
- **Border:** 1px ink/10 by default (global `*` border color); pending-approval cards add a 2px Margin Red border.
- **Internal Padding:** 20px (p-5) default; 12px (p-3) for compact cards.

### Inputs / Fields

- **Style:** 2px radius, 1px ink/20 stroke, Cream Paper at 60% opacity background, ink text, 40px height, 0 12px padding.
- **Focus:** 2px Margin Red ring (`focus:ring-2 focus:ring-margin`), no outline.
- **Placeholder:** ink at 40% (textarea) or 70% (input).
- **Error / Disabled:** Not separately styled in the current system; errors surface as Margin Red text.

### Navigation

- **Desktop:** 240px sidebar on desk ground. Wordmark "DIA" extrabold paper at top, "Do-It Agent" gold tracked subtitle. Nav items: 2px radius, 10px 12px padding, 14px icon + 14px semibold label, paper/70 default, hover white/5 + paper. Active: Margin Red background, paper text.
- **Mobile:** Fixed bottom bar on desk ground at 95% opacity, top border white/10. 8 items, icon 18px plus first word of label at 10px. Active: Margin Red text; inactive: paper/60.
- **Focus:** Margin Red 2px ring on all nav items.

### Stamps (Badges)

- **Style:** Square corners, 2px border, 11px bold uppercase tracked label, 2.5px 6px padding (px-2.5 py-1).
- **Approved:** green-700 border and text on green-50.
- **Pending:** amber-700 border and text on amber-50.
- **Rejected:** red-700 border and text on red-50.

### Tool-Event Chips

- **Style:** 2px radius, 10px label, 2px 8px padding, 1px border at 40% opacity of the status color, status-colored text on the matching 50-level tint. Completed shows a check, failed an x, running an ellipsis.

### Record Button

- **Shape:** Fully round, 40px (Overview) or 44px (Assistant), centered icon.
- **Idle:** Cream Paper 2 background on paper, or paper/10 on desk; ink/paper icon.
- **Recording:** Margin Red background, paper icon, pulse animation.

### Stat Cell

- **Style:** 2px radius, 1px ink/10 border, Cream Paper 40% background, 8px padding. 10px uppercase tracked label in ink/70, bold value below.

## Do's and Don'ts

### Do:

- **Do** use the espresso desk as the ground and cream paper as the only content surface.
- **Do** keep Margin Red rare: one primary action and the active nav item per screen.
- **Do** use Mukta for both Latin and Devanagari, and tabular numerals for all money and counts.
- **Do** carry hierarchy with weight and case; keep sizes in the 10-24px band.
- **Do** use the single paper-panel shadow for content surfaces; keep nav, buttons, inputs, and chips flat.
- **Do** use 2px radius everywhere; square corners for stamps and badges.
- **Do** use 1px ink/10 borders on paper and white/5 on desk; reserve 2px for stamps and pending-approval cards.
- **Do** use the Margin Red 2px focus ring on every interactive element, with `focus:outline-none`.
- **Do** keep the mobile bottom nav visible and clear it with bottom padding on main.

### Don't:

- **Don't** use glass, blur, gradients, or neon. Depth comes from the paper panel on the desk.
- **Don't** introduce a second shadow or a new elevation level.
- **Don't** use any typeface other than Mukta (and mono for code).
- **Don't** use proportional numerals for money or counts.
- **Don't** flood a screen with Margin Red; its rarity is the point.
- **Don't** use rounded corners larger than 2px except the record button.
- **Don't** add a multi-merchant switcher or template dashboard chrome; the UI is a single merchant's khata.
- **Don't** fabricate metrics or numbers; every figure comes from the database or a tool result.