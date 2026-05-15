# expense-control-workspace Specification

## Purpose
TBD - created by archiving change add-intelligent-expense-audit-and-budget-monitoring. Update Purpose after archive.
## Requirements
### Requirement: Expense control module exposes reimbursement audit and budget monitoring workspaces

The application SHALL provide a dedicated `费用管控` admin module with two protected secondary routes: `/admin/expense/reimbursements` for reimbursement review and `/admin/expense/budgets` for budget monitoring.

#### Scenario: Opening the reimbursement route shows the audit workspace

- **WHEN** an authenticated operator opens `/admin/expense/reimbursements`
- **THEN** the application SHALL render the reimbursement audit workspace with upload, queue-style business content, and invoice finding summaries

#### Scenario: Opening the budget route shows the monitoring workspace

- **WHEN** an authenticated operator opens `/admin/expense/budgets`
- **THEN** the application SHALL render the budget monitoring workspace with current totals and summary views derived from persisted mock data

### Requirement: Reimbursement audit page organizes work around upload, queue, and review drill-down
The application SHALL present the reimbursement audit page as a review queue that lets operators upload invoice screenshots, inspect the generated mock results, keep list and detail views synchronized around the same queue state, and drill into each claim's details.

#### Scenario: Opening the reimbursement route shows the current queue immediately
- **WHEN** an authenticated operator opens `/admin/expense/reimbursements`
- **THEN** the page SHALL render the current persisted claim queue in the route's initial protected response instead of waiting for a client-only bootstrap list request

#### Scenario: Uploading a screenshot creates a new reviewable claim
- **WHEN** an operator uploads an invoice screenshot from the reimbursement audit page
- **THEN** the application SHALL create a new claim row that can be reviewed from the current queue

#### Scenario: Queue rows and details share the same processing and outcome state
- **WHEN** the reimbursement audit page loads claims that have uploaded invoices
- **THEN** each visible row and its corresponding detail drill-down SHALL expose the same claim status, processing step, and normalized outcome summary for that claim

#### Scenario: Pending claims continue refreshing until a terminal state is reached
- **WHEN** one or more visible reimbursement claims are still queued or processing
- **THEN** the reimbursement audit workspace SHALL continue refreshing the visible queue and any opened claim detail until those claims reach a terminal status

#### Scenario: Selecting a claim reveals invoice details and handling information
- **WHEN** an operator opens a claim from the reimbursement queue
- **THEN** the application SHALL display that claim's generated invoice fields, attached findings, and current outcome details in a drill-down panel or details view

### Requirement: Budget monitoring page combines summary totals and breakdown views

The application SHALL render the budget monitoring page as a summary workspace that combines budget totals and category-level breakdown views within the same protected route.

#### Scenario: Budget monitoring summarizes the current budget state

- **WHEN** an operator opens `/admin/expense/budgets`
- **THEN** the page SHALL display total budget, used amount, remaining amount, and over-budget blocked totals for the visible scope

#### Scenario: Budget monitoring shows category-level summary data

- **WHEN** persisted reimbursement records exist in the current scope
- **THEN** the page SHALL surface grouped summary data for the configured expense categories

