# sqlite-admin-persistence Specification

## Purpose
TBD - created by archiving change add-sqlite-drizzle-auth-and-admin-apis. Update Purpose after archive.
## Requirements
### Requirement: SQLite persistence initializes the built-in admin records

The application SHALL persist admin-system data in a local SQLite database managed through Drizzle and SHALL initialize the built-in roles `root`, `admin`, and `user` plus a protected default `root` account.

#### Scenario: Fresh persistence contains the built-in roles
- **WHEN** the application initializes an empty admin database
- **THEN** the persisted role records SHALL include exactly the built-in roles `root`, `admin`, and `user`

#### Scenario: Fresh persistence contains a protected root account
- **WHEN** the application initializes an empty admin database
- **THEN** the persisted user records SHALL include a default `root` account marked as protected from ordinary deletion flows

### Requirement: System management APIs expose persisted user records

The application SHALL expose user-management endpoints backed by the persisted admin database instead of frontend-only session state.

#### Scenario: Listing users returns the persisted admin accounts
- **WHEN** the frontend requests the system user list
- **THEN** the application SHALL return the persisted admin user records with the fields needed to render the current management table and detail panel

#### Scenario: Creating a user persists the new account
- **WHEN** an operator creates a new admin account through the system user API
- **THEN** the application SHALL persist that account in SQLite and return it as part of subsequent user-list requests

#### Scenario: Deleting a protected root account is rejected by the API
- **WHEN** an operator attempts to delete the protected `root` account through the user-management API
- **THEN** the application SHALL reject the request and SHALL NOT remove that account from persistence

### Requirement: System management APIs expose persisted role records

The application SHALL expose role-management endpoints backed by the persisted admin database.

#### Scenario: Listing roles returns the built-in persisted roles
- **WHEN** the frontend requests the system role list
- **THEN** the application SHALL return the persisted `root`, `admin`, and `user` role records with their summaries and permission scopes

#### Scenario: Reading a role returns its permission scope
- **WHEN** the frontend requests details for a specific built-in role
- **THEN** the application SHALL return that role's persisted permission-scope data and protection note

