# antd-tailwind-foundation Specification

## Purpose
TBD - created by archiving change init-nextjs16-antd-tailwindcss. Update Purpose after archive.
## Requirements
### Requirement: Ant Design styles are SSR-safe in App Router

The application SHALL render Ant Design v6 components through an App Router-compatible SSR style registry so that first render includes required styles.

#### Scenario: First render includes Ant Design styles

- **WHEN** the root route renders an Ant Design component on first load
- **THEN** the page SHALL include the component with its intended styling without relying on a delayed client-only style injection step

### Requirement: Tailwind CSS v4 and Ant Design coexist with deterministic layer order

The application SHALL configure Tailwind CSS v4 and Ant Design style injection with an explicit layer order that follows the documented compatibility strategy.

#### Scenario: Global stylesheet declares compatible layer order

- **WHEN** the global stylesheet is loaded
- **THEN** it SHALL declare the CSS layer order needed for Tailwind CSS v4 and the `antd` layer before importing Tailwind

#### Scenario: Tailwind utilities can customize Ant Design layouts predictably

- **WHEN** a page combines Ant Design components with Tailwind utility classes
- **THEN** the resulting layout and spacing SHALL remain predictable without ad hoc selector-specificity workarounds

### Requirement: Shared providers centralize UI configuration

The application SHALL use a shared provider composition for Ant Design theming and style injection so future pages inherit the same UI foundation automatically.

#### Scenario: App Router layout applies shared providers

- **WHEN** any route renders under the root layout
- **THEN** the route SHALL be wrapped with the shared Ant Design provider composition

