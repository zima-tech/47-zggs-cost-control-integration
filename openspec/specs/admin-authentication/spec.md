# admin-authentication Specification

## Purpose
TBD - created by archiving change add-sqlite-drizzle-auth-and-admin-apis. Update Purpose after archive.
## Requirements
### Requirement: Admin login verifies credentials and creates a session

The application SHALL provide a login flow for admin accounts that validates a username and password against the persisted admin user store and creates a server-side session when the credentials are valid.

#### Scenario: Valid credentials sign the user into the admin workspace
- **WHEN** an operator submits valid credentials for an existing admin account
- **THEN** the application SHALL create a session, set the authentication cookie, and allow access to `/admin`

#### Scenario: Invalid credentials are rejected
- **WHEN** an operator submits an unknown username or an invalid password
- **THEN** the application SHALL reject the login attempt and SHALL NOT create an authenticated session

### Requirement: Admin workspace routes require an authenticated session

The application SHALL protect `/admin` and all of its child routes behind an authenticated admin session.

#### Scenario: Unauthenticated access is redirected to login
- **WHEN** a visitor opens `/admin` or any `/admin/*` route without a valid session
- **THEN** the application SHALL redirect that request to the login experience

#### Scenario: Authenticated access can open protected admin pages
- **WHEN** an operator opens an `/admin` route with a valid authenticated session
- **THEN** the application SHALL render the requested admin page without requiring the user to log in again

### Requirement: Authentication exposes session lifecycle endpoints

The application SHALL expose server endpoints for reading the current session and ending the current authenticated session.

#### Scenario: Reading the current session returns the signed-in admin user
- **WHEN** the frontend requests the current authenticated session with a valid cookie
- **THEN** the application SHALL return the signed-in admin user's core identity information

#### Scenario: Logging out invalidates the current session
- **WHEN** an authenticated operator triggers logout
- **THEN** the application SHALL invalidate the current session and clear the authentication cookie

