---
name: Brainless
description: A Club-theme operational toolkit for fast work behind the counter.
colors:
  club-canvas: "#f3f0e8"
  club-shell: "#f7f6f2"
  club-surface: "#fffdfa"
  club-ink: "#1c1914"
  club-muted: "#595349"
  club-coral: "#c64022"
  club-coral-strong: "#9f301b"
  success: "#18723b"
  warning: "#9a530e"
  danger: "#c72c2c"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-club-primary:
    backgroundColor: "{colors.club-ink}"
    textColor: "{colors.club-surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-club-brand:
    backgroundColor: "{colors.club-coral}"
    textColor: "{colors.club-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    height: "48px"
  field-club:
    backgroundColor: "{colors.club-surface}"
    textColor: "{colors.club-ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  card-operational:
    backgroundColor: "{colors.club-surface}"
    textColor: "{colors.club-ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Brainless

## Overview

**Creative North Star: "The Behind-the-Counter Queue"**

Brainless feels like a practical control surface used during live store operations: immediately scannable, touch-ready, and explicit about state. Its visual identity is Club: warm paper, dark ink, coral signals, solid surfaces, and restrained lift.

Operational surfaces inherit this palette instead of mixing in leftover violet glass. Information is organized into readable cards, compact filters, status badges, and focused work areas; the interface makes shared state and the next action visible.

**Key Characteristics:**

- One complete Club theme with shared hierarchy and interaction behavior.
- Dense but readable operational layouts with clear selected states.
- Rounded rectangular controls, pill filters, and at least 44px touch targets.
- Coral is the action signal.
- Traditional Chinese copy and the cat mark remain part of the product identity.

## Colors

Club is warm and material. Semantic success, warning, and danger colors remain legible without displacing coral as the main action color.

### Primary

- **Counter Coral:** Actions, active outlines, icon accents, and focused fields.

### Neutral

- **Warm Canvas / Shell / Paper:** Layers progress from app background to navigation shell and solid content surfaces.
- **Counter Ink / Muted Ledger:** Primary and supporting text.

**The Theme Integrity Rule.** Use Club's palette as a complete set; do not reintroduce Classic violet glass or a second theme switcher.

**The Signal Rarity Rule.** Reserve coral and semantic colors for actions, selection, focus, and status—not broad decorative fields.

## Typography

**Display Font:** Plus Jakarta Sans (with UI sans-serif and system fallbacks)

**Body Font:** Plus Jakarta Sans (with UI sans-serif and system fallbacks)

**Label Font:** Plus Jakarta Sans (with UI sans-serif and system fallbacks)

**Character:** Heavy, tightly tracked headings make operational promises and selected subjects unmistakable. Body text stays neutral and generous enough for instructions, feedback, and comments.

### Hierarchy

- **Display:** Black, compact, and tightly tracked; use for the primary page promise.
- **Headline:** Black with tight leading; use for focused records, dialogs, and major empty states.
- **Title:** Bold; use for cards and section headings.
- **Body:** Regular with open leading; use for descriptions, long feedback, and discussion text, generally capped near 68 characters per line.
- **Label:** Semibold, often uppercase with wide tracking in table headers and compact controls.

**The Scan-Then-Read Rule.** Let weight and spacing identify title, state, and metadata before the user reads the longer body copy.

## Layout

The application shell is centered and fluid, with a wide maximum content area (1540px) and responsive side padding from 20px to 48px. General containers cap at 1280px. Operational pages use a 4–8px base rhythm, 16–24px card spacing, and compact controls near the data they affect.

Desktop may split a queue and focused detail into asymmetric columns; mobile stacks them and shows one context at a time with an explicit return action. Navigation remains horizontally scrollable when it cannot fit. Breakpoints follow Tailwind defaults: 640px, 768px, 1024px, and 1280px. Safe-area padding and dynamic viewport height are supported.

**The First-Action Rule.** Put the page promise and primary create action before dense operational content; put search, filters, and sorting directly above the queue they control.

## Elevation & Depth

Club is flat by default and uses borders plus low, warm shadows to distinguish sticky controls, selected rows, and focused detail. Large atmospheric blurs may sit behind a hero or shell but never obscure content.

### Shadow Vocabulary

- **Club Low:** A 1px–2px warm shadow for small controls.
- **Club Selected:** A compact dark lift for active navigation and selected queue rows.
- **Club Focused:** A broad, faint warm shadow for detail panels and hero surfaces.

**The Structural Depth Rule.** Elevation communicates stickiness, selection, overlays, or focused work; ordinary content surfaces remain quiet.

## Shapes

Small badges use 8px corners, controls and inputs use 12px corners, and cards, navigation tiles, and dialogs use 16px corners. Pills are reserved for filters and compact status. Thin low-contrast borders define structure; dashed borders are limited to empty or drop-style states. The cat logo remains circular.

## Components

### Buttons

- **Shape:** Gently rounded controls with 12px corners and a minimum 44px touch target.
- **Club Primary:** Ink-filled for standard completion; coral-filled for the highest-level create action.
- **Hover / Focus:** Use color or opacity shifts and a visible 2px outline; disabled controls reduce opacity and stop pointer interaction.
- **Secondary / Ghost:** Bordered or transparent, taking text and surface colors from Club.

### Chips

- **Style:** Pill filters use solid ink/coral when selected; unselected chips sit on a quiet surface.
- **State:** Status badges use semantic tinted fills with a 1px inset ring. Category badges pair a small outline icon with concise text.

### Cards / Containers

- **Corner Style:** 16px corners.
- **Background:** Solid warm paper.
- **Shadow Strategy:** Rest quietly; lift selected, sticky, or focused regions according to the depth rules.
- **Internal Padding:** Usually 16–24px, reduced on compact mobile layouts.

### Inputs / Fields

- **Style:** Full-width, 12px corners, Club surface, subtle border, and at least 44px tall. Mobile text inputs stay at 16px to avoid browser zoom.
- **Focus:** Shift the border toward coral and add a restrained matching ring.
- **Error / Disabled:** Errors use explicit danger text and tint; disabled controls preserve their shape and reduce opacity.

### Navigation

Navigation is sticky, icon-led, and horizontally scrollable. Club uses small paper tiles with coral icons and a black selected tile. Labels stay short and centered; the logo anchors the shell.

### Operational Queue

Queue rows combine a vote control, category, status, title, excerpt, author/store, activity, and time. Selection is unmistakable: Club reverses the row to black. A focused detail preserves the same metadata, exposes discussion and status history, and keeps creation behind a search-and-similarity check.

## Do's and Don'ts

### Do:

- **Do** keep information hierarchy and touch behavior consistent across operational pages.
- **Do** keep shared state—status, vote count, author/store, timestamps, and errors—visible at the point of action.
- **Do** use the 8px / 12px / 16px corner hierarchy consistently.
- **Do** disable nonessential motion under reduced-motion preferences.

### Don't:

- **Don't** mix leftover Classic violet-glass primitives into Club surfaces.
- **Don't** hide operational status inside body copy or a secondary dialog.
- **Don't** turn dense work queues into chat walls; preserve list scanability and a focused thread.
- **Don't** make a user create a duplicate when search and similar-item review can route them to an existing discussion.
