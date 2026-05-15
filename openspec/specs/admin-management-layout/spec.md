# admin-management-layout Specification

## Purpose

Define the protected admin shell for the fee-control integration project.

## Requirements

### Requirement: Admin shell exposes fee-control and system management modules

The application SHALL provide an `/admin` workspace with a fixed left navigation, a header, and a scrollable content pane for these protected routes:

- `/admin/expense/user-upload`
- `/admin/expense/reimbursements`
- `/admin/expense/budgets`
- `/admin/system/users`
- `/admin/system/roles`
- `/admin/system/audit-logs`

#### Scenario: Opening a fee-control route activates the fee-control module

- **WHEN** an authenticated user opens any `/admin/expense/*` route
- **THEN** the `费控一体化` module SHALL be active
- **AND** the matching secondary item SHALL be active

#### Scenario: Opening a system route activates the system module

- **WHEN** an authenticated administrator opens any `/admin/system/*` route
- **THEN** the `系统管理` module SHALL be active
- **AND** the matching secondary item SHALL be active

### Requirement: Ordinary users only see allowed routes

The application SHALL restrict ordinary users to their own upload workspace and non-audit system views.

#### Scenario: Ordinary user opens admin workspace

- **WHEN** a `user` role account enters the admin workspace
- **THEN** the navigation SHALL show `普通用户上传`, `用户管理`, and `角色管理`
- **AND** it SHALL hide administrator-only fee-control and audit routes
