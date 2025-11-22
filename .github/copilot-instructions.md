# Copilot Instructions

This repository contains Chris's blackjack game built with React and TypeScript.

## Project Overview

A web-based blackjack game where a human player can compete against a dealer algorithm. The project demonstrates React patterns, TypeScript, and UI design with Fluent UI components.

## Technologies Used

- **React** 17.0.2 - UI framework
- **TypeScript** 4.9.5 - Type-safe JavaScript
- **Fluent UI** (@fluentui/react 8.120.7) - Microsoft's design system
- **Create React App** (react-scripts 5.0.1) - Build tooling
- **Jest** - Testing framework (via react-scripts)
- **ESLint** - Code linting

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```
   Note: Use `--legacy-peer-deps` flag due to peer dependency conflicts between packages.

2. **Development Server**
   ```bash
   npm start
   ```
   Opens the app at `localhost:3000`

3. **Build for Production**
   ```bash
   npm run build
   ```
   Creates optimized production build in `build/` directory

4. **Run Tests**
   ```bash
   npm test
   ```
   Note: There are currently known test configuration issues with ESM modules that need resolution.

## Project Structure

```
src/
├── classes/       # Game logic classes (e.g., Card, Deck, Player)
├── components/    # React components
├── context/       # React Context providers
├── enums/         # TypeScript enums
├── functions/     # Utility functions
├── interfaces/    # TypeScript interfaces
├── types/         # TypeScript type definitions
├── App.tsx        # Main application component
└── index.tsx      # Application entry point
```

## Code Style and Conventions

### TypeScript
- Use TypeScript strict mode
- Define interfaces in `interfaces/` directory
- Define enums in `enums/` directory
- Use explicit types for function parameters and return values
- Target ES5 (configured in tsconfig.json, default for Create React App)

### React
- Use functional components with hooks
- Follow React best practices
- Use JSX syntax with TypeScript (.tsx extension)
- Import React components from `components/index.ts`

### ESLint Configuration
- ESLint is configured via `.eslintrc.json`
- Rules include TypeScript-specific linting
- Unused variables warnings are disabled
- Follow existing code style for consistency

### File Organization
- Group related functionality in dedicated directories
- Keep components modular and reusable
- Use index files for clean imports
- Separate concerns: UI components, business logic (classes), and utilities (functions)

## Testing

- Tests use Jest and React Testing Library
- Test files should be named `*.test.tsx` or `*.test.ts`
- Place tests alongside the code they test
- **Current Known Issue**: Jest configuration needs updates to handle ESM modules from `react-syntax-highlighter` in test environment

## Building and Deployment

- The project is deployed to Azure Static Web Apps
- Build process uses Create React App's build system
- Output directory is `build/`
- Deployment is automated via GitHub Actions (`.github/workflows/azure-static-web-apps-lemon-ocean-0d87ac20f.yml`)

## Dependencies Management

- Use npm for package management
- Node version: 16.13.0 to 18.19.1 (specified in `engines`)
- Always use `--legacy-peer-deps` when installing packages
- Check for security vulnerabilities with `npm audit`

## Development Guidelines

1. **Minimal Changes**: Make surgical, focused changes to existing code
2. **Test Before Merging**: Verify builds complete successfully
3. **Type Safety**: Leverage TypeScript's type system fully
4. **Code Quality**: Run ESLint before committing (implicit in build process)
5. **Documentation**: Update README.md if adding significant features
6. **Consistency**: Match existing code patterns and style

## Known Issues

- Peer dependency conflicts between ESLint packages (use `--legacy-peer-deps`)
- Test configuration needs updates for ESM module support (Jest handling of react-syntax-highlighter)
- Several npm package deprecation warnings (non-critical)

## Additional Notes

- The game implements basic blackjack rules with a dealer AI
- UI uses Fluent UI components for consistent Microsoft-style design
- State management uses React Context API
- The project demonstrates Flux-like patterns for state management
