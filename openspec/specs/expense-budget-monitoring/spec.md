# expense-budget-monitoring Specification

## Purpose
TBD - created by archiving change add-intelligent-expense-audit-and-budget-monitoring. Update Purpose after archive.
## Requirements
### Requirement: Budget monitoring displays totals derived from persisted mock reimbursement data

The application SHALL monitor budget consumption by comparing seeded budget totals with amounts derived from persisted mock reimbursement records and SHALL present the result as a summary view.

#### Scenario: Opening the budget page shows overall totals

- **WHEN** an operator opens the budget monitoring workspace
- **THEN** the application SHALL display total budget, used amount, remaining amount, and over-budget blocked totals for the visible scope

#### Scenario: Category summary reflects persisted mock reimbursement data

- **WHEN** persisted reimbursement records exist across one or more expense categories
- **THEN** the application SHALL aggregate those records into category-level summary totals on the budget page

### Requirement: Over-budget mock uploads are forbidden from reimbursement and visible in monitoring totals

The application SHALL treat the `mock-overbudget` upload scenario as a forbidden reimbursement outcome and SHALL reflect that outcome in the budget monitoring summary.

#### Scenario: `mock-overbudget` blocks the related claim

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-overbudget`
- **THEN** the application SHALL mark the related claim as over budget and forbidden for reimbursement

#### Scenario: Blocked over-budget claims appear in budget monitoring totals

- **WHEN** one or more persisted claims are marked as over budget
- **THEN** the budget monitoring page SHALL include those blocked claims in its over-budget blocked totals

### Requirement: Budget monitoring route bootstraps summary data in the protected page response
The application SHALL load the current budget summary and category aggregates in the protected route response for `/admin/expense/budgets`, so operators can see the latest totals on first render before optional client-side table interactions run.

#### Scenario: Opening the budget page renders summary totals from the initial response
- **WHEN** an authenticated operator opens `/admin/expense/budgets`
- **THEN** the page SHALL render the current budget totals and category summary dataset as part of the route's initial protected response

#### Scenario: Filtering budget categories preserves the current summary context
- **WHEN** an operator applies category filters or changes pagination on the budget monitoring page
- **THEN** the page SHALL update the visible category table without discarding the current summary totals that were already rendered for that workspace

