---
description: "Use when adding, modifying, or debugging Vitest and React Testing Library tests."
applyTo:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "src/setupTests.ts"
---
# Testing Instructions

- Keep tests beside the implementation and use Vitest with the existing React Testing Library setup.
- `src/setupTests.ts` installs jest-dom matchers, cleans up rendered components and clears `localStorage` after each test, and stubs `ResizeObserver`.
- Make card draws deterministic by setting the deck order or stubbing the deck's deal behavior. Natural blackjacks end rounds immediately, so use them only when testing that path.
- For game changes, assert the user-visible or state outcome that matters, including relevant status, player bank, pot, settlement, or activity log behavior.
- Run the narrow test file during iteration, then `npm test`, `npm run typecheck`, and `npm run lint` for the completed change when practical.
