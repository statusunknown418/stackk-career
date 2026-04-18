# stackk-career

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **coss UI** - shadcn/ui primitives via the `@coss/style` registry, installed directly in `apps/web`
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database (optional):

```bash
pnpm run db:local
```

2. Update your `.env` file in the `apps/web` directory with the appropriate connection details if needed.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

`apps/web` uses the [coss](https://coss.style) shadcn-compatible registry. Primitives live directly in the app at `apps/web/src/components/ui/*`.

- Change design tokens and global styles in `apps/web/src/index.css`
- Update primitives in `apps/web/src/components/ui/*`
- Adjust shadcn aliases or style config in `apps/web/components.json`

### Initialize or re-install the registry

Run this from `apps/web` to (re)initialize the coss style and components:

```bash
pnpm dlx shadcn@latest init @coss/style
```

### Add more components

Run from `apps/web`:

```bash
pnpm dlx shadcn@latest add accordion dialog popover sheet table
```

Import components like this:

```tsx
import { Button } from "@/components/ui/button";
```

## Git Hooks and Formatting

- Initialize hooks: `pnpm run prepare`
- Format and lint fix: `pnpm run check`

## Project Structure

```
stackk-career/
├── apps/
│   ├── web/         # Fullstack application (React + TanStack Start, coss UI)
│   └── fumadocs/    # Documentation site (Next.js + Fumadocs)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   ├── config/      # Shared tsconfig / tooling config
│   ├── db/          # Database schema & queries
│   └── env/         # Shared environment variable schemas
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run db:local`: Start the local SQLite database
- `pnpm run check`: Run Biome formatting and linting
