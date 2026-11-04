---
description: "Use when building or modifying React components, app layout, controls, styling, or accessibility."
applyTo:
  - "src/components/**"
  - "src/App.tsx"
  - "src/App.css"
  - "src/index.css"
---
# React UI Instructions

- Use function components and the existing game/settings contexts. Dispatch game actions for shared state changes; do not duplicate blackjack rules in components.
- Use Fluent UI v9 components and design tokens, following nearby component and styling patterns.
- Preserve accessible names for interactive controls with labels or `aria-label`; retain useful tooltip relationships and keyboard-operable controls.
- There is no splash screen. Before a game, `src/components/Table.tsx` shows the selected player and dealer as floating seat chips and starts play with the Start game button. Do not reintroduce splash-screen visibility settings or a separate player-selection start dialog.
- The Players dialog in `src/components/PlayersDialog.tsx` is opened from the header. It creates named profiles, selects the human profile for the next game, and shows profile statistics; selecting a player does not change an already active game.
- Preserve the responsive table and seat behavior, and respect reduced-motion preferences when adding animation.
- Keep dealer automation in `src/components/Agent.tsx`; clean up timers and other effects when dependencies change or components unmount.
- Add or update colocated React Testing Library tests for user-visible behavior and accessibility-relevant changes.
