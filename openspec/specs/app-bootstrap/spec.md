# app-bootstrap Specification

## Purpose
Provide a minimal root-route entry surface that keeps the application bootable while directing continued development toward the admin experience.
## Requirements
### Requirement: Repository provides a runnable Next.js 16 baseline

The repository SHALL include a Next.js 16 application using App Router, TypeScript, and standard npm scripts so that a contributor can install dependencies and run the project immediately, with the default development server running on port `8001`.

#### Scenario: Fresh install can start the application on port 8001

- **WHEN** a contributor runs `npm install` in the repository root and then starts the development server with `npm run dev`
- **THEN** the repository SHALL resolve a valid Next.js 16 application with App Router entrypoints, no missing package or config files, and the dev server listening on port `8001`

#### Scenario: Production build succeeds

- **WHEN** a contributor runs `npm run build`
- **THEN** the repository SHALL produce a successful production build without requiring manual setup outside the documented global Ant Design CLI install

### Requirement: Repository provides an initial starter route

The repository SHALL use the root route as a direct handoff into the admin experience instead of rendering a separate welcome-style entry page, so the admin workspace becomes the default path for continued feature work.

#### Scenario: Root route redirects directly to the admin workspace

- **WHEN** a contributor opens the root route after starting the application
- **THEN** the application SHALL redirect the request to `/admin` without requiring an extra click or intermediate landing view

#### Scenario: Root route no longer renders a separate entry surface

- **WHEN** a contributor lands on the root route
- **THEN** the application SHALL NOT render standalone welcome copy, CTA cards, or a secondary entry page before the admin interface

