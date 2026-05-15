# admin-user-role-management Specification

## Purpose
Define the seeded user and role management experience under `/admin/system` so the admin workspace has a stable baseline for future system-management features.
## Requirements
### Requirement: System management exposes seeded users and roles

The application SHALL provide initialized system-management data from the persisted admin store, including exactly three built-in roles named `root`, `admin`, and `user`, plus a default protected `root` user record and a seeded baseline of ordinary users that is available as soon as the user opens system-management pages.

#### Scenario: User management starts with a default root account and seeded ordinary users

- **WHEN** a user opens `/admin/system/users`
- **THEN** the user list SHALL include the default `root` account together with a seeded baseline of ordinary non-protected users without requiring any prior setup

#### Scenario: Seeded ordinary users default to normal user behavior

- **WHEN** the seeded baseline users are displayed on `/admin/system/users`
- **THEN** those records SHALL be treated as ordinary non-protected users and SHALL NOT be marked as system-reserved root accounts

#### Scenario: Role management starts with three built-in roles

- **WHEN** a user opens `/admin/system/roles`
- **THEN** the role list SHALL display the built-in roles `root`, `admin`, and `user`

### Requirement: User management supports basic account lifecycle actions

The application SHALL provide a user-management page that uses standard Ant Design admin components to list users, search users within the current seeded dataset, support creating users, viewing user details, deleting removable users, and assigning a role during creation through persisted service-backed data.

#### Scenario: Searching users narrows the visible list

- **WHEN** an operator enters a keyword that matches a username or display name
- **THEN** the user-management table SHALL filter the visible records to the matching users

#### Scenario: Creating a user assigns an admin or user role

- **WHEN** an operator creates a user from the user-management page
- **THEN** the form SHALL allow selecting either the `admin` role or the `user` role for that account

#### Scenario: Viewing a user reveals account details

- **WHEN** an operator chooses to inspect a user from the user list
- **THEN** the application SHALL display that user's core details, including account name and assigned role

#### Scenario: Deleting a non-root user removes it from the list

- **WHEN** an operator confirms deletion for a user that is not protected
- **THEN** the application SHALL remove that user from the current user list

#### Scenario: Root user is protected from deletion

- **WHEN** an operator attempts to delete the default `root` account
- **THEN** the application SHALL prevent the deletion action from completing

### Requirement: Role management explains the built-in permission tiers

The application SHALL provide a role-management page that describes the built-in `root`, `admin`, and `user` roles, supports searching within the built-in role dataset, and exposes a way to inspect the permission scope of each role.

#### Scenario: Searching roles narrows the visible list

- **WHEN** an operator enters a keyword that matches a role label or permission summary
- **THEN** the role-management table SHALL filter the visible records to the matching built-in roles

#### Scenario: Role management shows permission summaries

- **WHEN** a user opens `/admin/system/roles`
- **THEN** each built-in role SHALL present a short summary of the permission level it represents

#### Scenario: Viewing a role reveals its permission scope

- **WHEN** an operator chooses to inspect a role from the role list
- **THEN** the application SHALL display the permission scope associated with that role

#### Scenario: Built-in roles remain fixed in this phase

- **WHEN** a user is viewing the initial role-management page
- **THEN** the application SHALL treat `root`, `admin`, and `user` as fixed built-in roles instead of exposing custom-role creation or destructive editing flows

### Requirement: System management pages use persisted data across refreshes

The application SHALL keep user-management and role-management pages backed by persisted service data so that supported changes remain visible after navigation or page refresh.

#### Scenario: Newly created users remain visible after refresh
- **WHEN** an operator creates a non-root user and then reloads `/admin/system/users`
- **THEN** the created user SHALL still appear in the user list

### Requirement: System management list pages use a stacked management-list layout

The application SHALL render `/admin/system/users` and `/admin/system/roles` as stacked management-list pages that prioritize overview, search, and tabular operations within the main content pane.

#### Scenario: User management page renders the stacked list layout

- **WHEN** a user opens `/admin/system/users`
- **THEN** the page SHALL render a green overview card first, a search-focused operations card second, and a table card third within a single-column content flow

#### Scenario: Role management page renders the stacked list layout

- **WHEN** a user opens `/admin/system/roles`
- **THEN** the page SHALL render the same green overview card, search-focused operations card, and table card sequence used by the user-management page

#### Scenario: Search is handled from the operations card

- **WHEN** an operator enters a keyword in the operations card on either system-management page
- **THEN** the visible table rows SHALL update to match the search criteria for that page's dataset

#### Scenario: Pagination changes show table-card loading feedback

- **WHEN** an operator changes the current page from the table card pagination controls
- **THEN** the table card SHALL display an appropriate loading or pending state while the next page of rows is being applied

#### Scenario: Table card adapts to the available content height

- **WHEN** a system-management list page is rendered inside the admin shell
- **THEN** the table card SHALL stretch with the available main-content height instead of using a fixed one-off viewport calculation

### Requirement: System management routes bootstrap their current datasets in the protected page response
The application SHALL load the current user and role datasets from the protected route response for `/admin/system/users` and `/admin/system/roles`, so operators can see the latest records on first render without relying on a client-only bootstrap round trip.

#### Scenario: User management route renders seeded users from the initial response
- **WHEN** an authenticated operator opens `/admin/system/users`
- **THEN** the page SHALL render the current user dataset as part of the route's initial protected response before any optional client-side refresh behavior runs

#### Scenario: Role management route renders built-in roles from the initial response
- **WHEN** an authenticated operator opens `/admin/system/roles`
- **THEN** the page SHALL render the current role dataset as part of the route's initial protected response before any optional client-side refresh behavior runs

