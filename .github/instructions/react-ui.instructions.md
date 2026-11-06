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
- Use Fluent UI v9 components and design tokens, following nearby component and styling patterns. Do not hard-code colors; use `tokens` in `makeStyles` or the theme's CSS variables in stylesheets, so components follow the theme mode and accent chosen in the Appearance settings.
- Appearance settings (theme mode, accent, card style, card back pattern and color) are typed keys of `SettingsState` with their allowed values in `settingOptions`. Add new presets to `src/theme/` and keep the Options panel controls to stock Fluent components.
- Preserve accessible names for interactive controls with labels or `aria-label`; retain useful tooltip relationships and keyboard-operable controls.
- There is no splash screen. Before a game, `src/components/Table.tsx` shows the selected player and dealer as floating seat chips and starts play with the Start game button. Do not reintroduce splash-screen visibility settings or a separate player-selection start dialog.
- The Players dialog in `src/components/PlayersDialog.tsx` is opened from the header. It creates named profiles, selects the human profile for the next game, and shows profile statistics; selecting a player does not change an already active game.
- The pot begins as a floating chip beside the pre-game seats and stays fixed in the board's top-left corner during play (bottom-left below the 720px container breakpoint); do not move it around the table, and keep it visible after a hand ends. `usePotMotion` slides the last pot up out of view and the new one in from the top when a hand or game begins, and shimmers and bounces it when it grows; the controls and dealer automation wait through `PotAnimationContext` until it finishes. With reduced motion there is no bounce and no wait.
- Keep the Activity Log bounded to the available viewport height and scroll its entries vertically when they overflow, while keeping its heading visible and preserving horizontal table scrolling.
- Keep the in-app rules in `src/components/RulesDialog.tsx` and the README's Rules section accurate with the reducer/domain behavior. When blackjack rules or available actions change, update both descriptions and their relevant tests.
- Preserve the responsive table and seat behavior, and respect reduced-motion preferences when adding animation.
- Keep dealer automation in `src/components/Agent.tsx`; clean up timers and other effects when dependencies change or components unmount.
- Add or update colocated React Testing Library tests for user-visible behavior and accessibility-relevant changes.
