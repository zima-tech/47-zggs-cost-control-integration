# developer-workflow-tooling Specification

## Purpose
TBD - created by archiving change init-nextjs16-antd-tailwindcss. Update Purpose after archive.
## Requirements
### Requirement: Repository enforces consistent import ordering

The repository SHALL include a linting workflow that detects or fixes inconsistent JavaScript and TypeScript import ordering.

#### Scenario: Linting checks import order

- **WHEN** a contributor runs the repository lint workflow
- **THEN** the workflow SHALL evaluate source files against the configured import ordering rules

### Requirement: Repository supports deterministic Tailwind class ordering

The repository SHALL include formatting support that normalizes Tailwind utility class order in authored source files.

#### Scenario: Formatter normalizes utility class order

- **WHEN** a contributor formats a source file containing Tailwind utility classes
- **THEN** the formatter SHALL reorder those classes according to the configured Tailwind-aware formatting rules

### Requirement: Codex can discover the Ant Design MCP server from repository config

The repository SHALL include Codex MCP configuration for the Ant Design CLI server.

#### Scenario: Codex reads repository MCP configuration

- **WHEN** Codex loads repository-local MCP configuration
- **THEN** it SHALL find an `antd` MCP server entry that starts the Ant Design CLI with the `mcp` subcommand

