---
name: DIA (Do-It Agent)
description: Voice-first business helper for shopkeepers; a warm paper ledger on the counter, with one red button.
colors:
  paper: "#efe4cd"
  sheet: "#f8f1e1"
  sheet-2: "#eadfc6"
  rule: "#dccdb0"
  ink: "#1a1612"
  ink-soft: "#4a4235"
  ink-dim: "#6b5f4c"
  margin: "#b01e2a"
  margin-deep: "#8a1620"
  gold: "#8a6508"
  success: "#15803d"
  warning: "#b45309"
  danger: "#b91c1c"
typography:
  display:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.875rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "3px"
  DEFAULT: "6px"
  md: "8px"
  lg: "12px"
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
  mic-idle:
    backgroundColor: "{colors.margin}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.full}"
  mic-recording:
    backgroundColor: "{colors.margin}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.full}"
  button-primary:
    backgroundColor: "{colors.margin}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "44px"
---

# Design System: DIA (Do-It Agent)

## Overview

**Creative North Star: "The Red-Cloth Bahi-Khata"**

DIA is a voice-first helper for shopkeepers, and the screen is the khata kept on
the counter: warm paper, dark ink, one red margin. There is one button. A
merchant taps it, speaks in their own language, and hears the answer. Every
extra control is a thing they might get wrong, so the interface keeps three
screens only: talk, past conversations, settings.

The design is not a dashboard. There are no charts to read, no filters, no
navigation tree, no scores, no sparklines. Numbers appear only as the answer to
a spoken question, in the sentence DIA is saying. The one red element on any
screen is the thing the merchant should do: the microphone, the language of an
approval, or the confirm button.

**Key Characteristics:**

- Light, warm paper ground (`#efe4cd`) with lighter paper sheets (`#f8f1e1`).
- One accent: Margin Red (`#b01e2a`), reserved for the microphone and the one
  primary action.
- Ink and Ink Soft carry all text; `#6b5f4c` is the quietest label allowed.
- Mukta for both Latin and Devanagari, weights 400-800.
- Big type: the home question is 34-46px, answers are 19px at 1.7 line height.
- 6-8px corners; only the microphone is round.
- One shadow: a sheet of paper resting on the counter. Everything else is flat.

## Layout

- **Shell:** a 64px top bar (wordmark, three links, language chip, shop name)
  over a full-height content area. On mobile, a 64px bottom bar with three tabs.
- **Talk:** a single centred column, `max-w-[640px]` on the home state and
  `max-w-[720px]` once a conversation starts. The composer is a flex child
  below the scroll region, never an overlay.
- **History and Settings:** `max-w-[720px]`, same 20px gutters (`32px` on
  desktop), title and content aligned to the same left edge.
- **Breakpoints:** `sm` 640 (shop name appears), `md` 768 (top nav replaces the
  bottom bar), `lg` 1024 (larger display type).
- **Density:** generous. 28-36px between conversation turns, 14-16px inside
  cards, 44-48px minimum touch targets.

## Colors

### Primary

- **Margin Red** (#b01e2a): the microphone, the approval outline, the primary
  button, the active tab rule, and error text. Nothing else.

### Secondary

- **Total Gold** (#8a6508): the "DIA" speaker mark in a conversation and the
  money totals inside result rows. Never body text.

### Neutral

- **Paper** (#efe4cd): page ground, with one soft radial lift from the top.
- **Sheet** (#f8f1e1): cards, lists, sheets.
- **Sheet 2** (#eadfc6): quoted messages and the selected language row.
- **Rule** (#dccdb0): every 1px border and divider.
- **Ink** (#1a1612): text and the merchant's own message bubble.
- **Ink Soft** (#4a4235): supporting sentences.
- **Ink Dim** (#6b5f4c): labels and timestamps; the lowest contrast in use.

### Status

- **Green** (#15803d): a completed check, a sent stamp, profit that is safe.
- **Amber** (#b45309): waiting states.
- **Danger** (#b91c1c): failures only.

## Typography

**One family: Mukta (400, 500, 600, 700, 800).**

- **Display** (800, 34-46px): the home question. Two lines maximum.
- **Headline** (800, 30-38px): page titles.
- **Title** (700, 15-18px): card headings and the answer's lead sentence.
- **Body** (400, 19px / 1.7): DIA's answers; quoted messages sit at 15px.
- **Text** (600, 14-17px): list rows, hints, buttons.
- **Label** (700, 12px, 0.12em, uppercase): column labels only, never a kicker.

Money and counts use `.num` (tabular numerals) so columns of rupees line up.

## Elevation & Depth

Flat at rest. Cards and lists use one shared shadow:

`0 1px 1px rgba(58,44,24,0.08), 0 10px 30px -12px rgba(58,44,24,0.28)`

The microphone adds a deeper lift and a 2px inset bottom edge, so it reads as a
physical button. Nothing else moves.

## Shapes

- 6px default radius, 8px on cards, 12px on the merchant's message bubble.
- Fully round: the microphone, the composer field, the send button, switches.
- 2px borders only on an approval waiting for a yes, and on status stamps.
- Hairlines are 1px `#dccdb0`. No coloured side bars.

## Components

### Microphone

The only hero. 132px on home, 54px in the composer. Margin Red with paper icon;
a stop square while recording. While recording, two thin red rings breathe
outward at 2.6s and a 34px waveform runs beneath. Disabled during work.

### List rows

`Sheet` background, 1px rule between rows, 36px icon disc on the paper ground,
17px semibold label, chevron. 64-72px tall. Used for suggestions, languages,
and past conversations.

### Approval sheet

2px Margin Red border, paper ground. A small red label "needs your yes" and the
customer count along the top rule; the plain-language title and why; the exact
message in a Sheet 2 quote; offer and cost; then a 48px red "yes, send it" and a
secondary "no". After the decision, the sheet collapses to a single stamp:
green "sent", grey "not sent", red "something went wrong".

### Answer

No card. A gold "DIA" mark with a replay control, the answer in 19px ink, then
plain-language result sheets. A collapsed "what I checked" line lists the steps
in the merchant's words ("your sales", "the customer list"), never tool names.

### Composer

Bottom of a conversation only: 54px mic, rounded input, round send button.
While recording, the input is replaced by a waveform and a timer.

## Do's and Don'ts

### Do

- **Do** keep one primary action per screen.
- **Do** write in the merchant's language, in the simplest sentence that is true.
- **Do** translate tool names, card titles, offer types, and status into plain
  words before they reach the screen.
- **Do** keep answers scannable at 19px with 1.7 line height, and money tabular.
- **Do** show the merchant's own words, then DIA's answer, then the decision.
- **Do** give every failure a plain sentence and a retry.

### Don't

- **Don't** add dashboards, charts, filters, tables, scores, or navigation trees.
- **Don't** say "campaign", "audience", "ledger", "demo", "tool", "agent step",
  "confidence", "hypothesis", or any API word in front of the merchant.
- **Don't** use sparklines, progress rings, or decorative status LEDs.
- **Don't** use more than one shadow, or blur and glass as decoration.
- **Don't** use a second accent colour; red is the only call to action.
- **Don't** show raw JSON, model names, provider names, or error stacks.
