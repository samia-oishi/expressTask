# Postman demonstration guide

This collection follows the Swagger UI groups: **System, Authentication, Account, Profile and Admin**. Each request name includes its HTTP method and path. **Experiments** contains additional checks that demonstrate validation and security behavior. Select individual requests; do not run the whole collection blindly.

## Start here

1. Start the API and database using the root README. Check `http://localhost:5000/api/v1/health`.
2. In Postman, import both `Express Task API.postman_collection.json` and `Express Task API.postman_environment.json` from this folder. Select **Express Task API - Local** in the environment selector.
3. Requests use `http://localhost:5000` directly. If your server uses another address, update the request URLs in Postman. The environment is still needed for the test email, passwords, IDs and tokens. Keep the sample passwords for a local disposable test account only.
4. Send **System → GET /api/v1/health**. Expect 200. Then open **Authentication → POST /api/v1/auth/signup**, inspect the example body and send it. A pre-request script creates a unique `runId` and, if `userEmail` is blank, an `@example.test` address. Signup saves the returned user IDs.
5. Send **Authentication → POST /api/v1/auth/signin — Sign in as user**. Its post-response script saves `userToken`. Send **Account → GET /api/v1/users/me** and **Profile → GET /api/v1/users/me/profile** to use that token.
6. To demonstrate admin requests, seed a trusted admin using the root README, then enter its credentials into the environment's `adminEmail` and `adminPassword`. Send **Sign in as admin**, which saves `adminToken` and `adminUserId`. Admin requests use `targetUserId` (normally the disposable user from signup), which must be different from the admin ID.

Open each request's description, Body and Authorization tabs before sending. After sending, inspect the actual status, response body and **Test Results**. A green test means its assertion passed; it does not prove every aspect of a feature works. Saved responses, where included, are labelled illustrative and are not live responses.

To create another generated account, clear **both** `runId` and `userEmail` in the selected environment, then send signup and signin again. Clearing only `runId` preserves the email. Use an email address you control instead of the generated address for real email demonstrations. Variables in an imported Postman environment are separate from `.env` and from the repository JSON file; do not export or commit real credentials or tokens.

## Demonstration paths

- **System:** show the server check, health endpoint, OpenAPI YAML and echo. Swagger UI is an extra request; open its URL in a browser to interact with it.
- **Authentication:** signup and signin are public. Signout requires `userToken` and invalidates previous tokens. Sign in again afterward.
- **Account and Profile:** use a fresh `userToken`. Show account data, then show and update profile data. A password change uses `userPassword` and `newPassword`; after success set `userPassword` to the new current password and sign in again.
- **Admin:** sign in as admin and use a separate disposable target. Role changes and deactivation/reactivation invalidate the target's previous tokens; the target must sign in again. A role-change example promotes the target; edit its body to `{"role":"user"}` to demote it later.
- **State changes and deletion:** requests are marked in their names and descriptions. Deactivation retains account data and is reversible through reactivation. Deletion is irreversible and cascades to the profile and reset-token records. Use disposable data. A last active admin is protected, but do not attempt a last-admin deletion experiment unless you have independently verified the exact state and accept the risk: if another active admin exists, deletion may succeed.

## Password-reset demonstration

The generated `@example.test` address is not a mailbox. To receive a reset link, use an active disposable account at a mailbox you can access, configure `SMTP_USER`, `SMTP_APP_PASSWORD` and an accessible `APP_BASE_URL`, and start the application with those settings. Never commit credentials or share a live reset link.

1. Set `userEmail` to that account's email and send **Authentication → POST /api/v1/auth/forgot-password**. A generic 200 does not confirm account existence or email delivery; missing SMTP configuration returns 503. This request's test accepts either status, so inspect the actual response.
2. Open the received email. To demonstrate the browser flow, open the link and submit the form. Alternatively copy only the `token` query parameter into `passwordResetToken` in the selected environment.
3. In Postman, **GET /reset-password** returns the HTML form and checks token format only. **POST /reset-password** submits `token` and `newPassword` as URL-encoded form fields. Alternatively, **POST /api/v1/auth/reset-password** submits the same values as JSON. Use only one successful submission per token: after a reset it is used. Request a new email to demonstrate the other path.
4. After a successful reset, set `userPassword` to the value of `newPassword` and sign in again. The old access token is invalidated. A reused or expired token should return 400.

## Experiments and prerequisites

Run the seven numbered learning experiments after signup and user signin. Experiments 5, 6 and 7 are a sequence: set a bio, omit it to see it stay unchanged, then set it to `null` to clear it. Experiments 1–4 show missing authentication, insufficient role and rejected fields. Expected error statuses are intentional and their test should pass when the API rejects the request correctly.

The remaining experiments are individual admin/security checks. Invalid limit, UUID, self-target and role require an admin signin and appropriate target. For token invalidation after promotion, first sign in as the disposable user, then promote that user in Admin; the old user token should get 401. The promoted-target signin stores `targetAdminToken`; demote the target before checking that token. Deactivation experiments require a target that has just been deactivated; repeated-reactivation requires an active target. The deleted-target check requires that the disposable target has already been deleted. Read each request before sending it.

The collection deliberately does not automate a last-admin self-deletion check against an unknown database state. For an isolated demonstration of that safeguard, use a disposable database with exactly one active admin and verify the state first.
