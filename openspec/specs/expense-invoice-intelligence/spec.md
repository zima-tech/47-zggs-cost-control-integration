# expense-invoice-intelligence Specification

## Purpose
TBD - created by archiving change add-intelligent-expense-audit-and-budget-monitoring. Update Purpose after archive.
## Requirements
### Requirement: Uploaded invoice screenshots use deterministic mock scenario IDs

The application SHALL treat the uploaded invoice screenshot filename stem as a mock scenario selector and SHALL recognize `mock-success`, `mock-fake`, `mock-duplicate`, `mock-compliance`, and `mock-overbudget` as deterministic business outcomes.

#### Scenario: `mock-success` creates a successful reimbursement result

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-success`
- **THEN** the application SHALL persist that upload as a successful mock reimbursement result without blocking findings

#### Scenario: `mock-fake` creates a forged-invoice finding

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-fake`
- **THEN** the application SHALL create a blocking forged-invoice finding for the related claim

#### Scenario: `mock-duplicate` creates a duplicate-reimbursement finding

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-duplicate`
- **THEN** the application SHALL create a blocking duplicate-reimbursement finding for the related claim

#### Scenario: `mock-compliance` creates a compliance finding

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-compliance`
- **THEN** the application SHALL create a blocking reimbursement-compliance finding for the related claim

#### Scenario: `mock-overbudget` creates an over-budget blocking result

- **WHEN** an operator uploads a screenshot whose filename stem is `mock-overbudget`
- **THEN** the application SHALL create a blocking over-budget finding and mark the related claim as forbidden for reimbursement

### Requirement: Mock uploads persist generated invoice fields and common expense categories

The application SHALL generate and persist mock invoice data for each upload, including invoice header, amount, tax amount, tax rate, issue date, and an expense category from a predefined common category list.

#### Scenario: A recognized mock upload stores generated invoice data

- **WHEN** an operator uploads a screenshot using one of the supported mock scenario IDs
- **THEN** the application SHALL persist generated invoice fields and a category selection for that claim alongside the resulting findings

#### Scenario: An unrecognized filename falls back to a normal success flow

- **WHEN** an operator uploads a screenshot whose filename stem does not match any supported mock scenario ID
- **THEN** the application SHALL treat the upload as a normal success case and SHALL still persist generated invoice fields and a category selection

### Requirement: Review findings remain auditable from persisted records

The application SHALL persist the mock scenario result as auditable review findings so the reimbursement workspace can reload and display the same outcome after refresh.

#### Scenario: Reloading the queue preserves prior mock results

- **WHEN** an operator refreshes the reimbursement review page after uploading invoice screenshots
- **THEN** the application SHALL display the same persisted mock findings and generated invoice fields for the previously created claims

### Requirement: Claim outcomes use one normalized summary and distinguish business results from technical failures
The application SHALL expose each reimbursement claim with a single normalized outcome summary for list and detail displays, SHALL use the claim status to distinguish business-rule outcomes from technical processing failures, and SHALL avoid presenting duplicate summary and error messages for the same claim state.

#### Scenario: Business-rule outcomes show a single claim summary
- **WHEN** a claim reaches a business outcome such as approved, rejected, or forbidden
- **THEN** the application SHALL present one normalized outcome summary for that claim together with any persisted findings, without adding a second technical-error message block for the same outcome

#### Scenario: Technical queue failures surface as failed claims
- **WHEN** queue processing throws a technical exception while handling a claim
- **THEN** the application SHALL mark that claim as failed and present the technical failure through the same normalized outcome-summary channel used by the claim's final status

