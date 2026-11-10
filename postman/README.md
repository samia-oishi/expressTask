# Postman QA

Import both JSON files in this directory and select **Express Task API - Local**.

Before running admin requests, set `adminEmail` and `adminPassword` to the trusted account created by `npm run seed:admin`. Secrets are intentionally blank in the committed environment.

The collection initializes a unique `userEmail` when `runId` is blank. Clear `runId` before another run to generate a new disposable identity. Run folders individually in their numbered order; destructive requests are deliberately placed last.

Password reset, password change, signout, self-deactivation, reactivation, and permanent deletion requests are available in the **Manual account flows** folder. For password reset, copy the token from the Gmail link into `passwordResetToken`; the browser link itself also opens the built-in reset form.

The admin regression flow promotes and later demotes the disposable user. It also invalidates tokens intentionally, so run the sign-in requests again when a later request needs a fresh token.

## Learning experiments

After **01 Setup and basic account QA**, run **Learning experiments - run after setup, before admin teardown**. It reuses the disposable `userToken` and teaches one behavior at a time:

| Experiment | Expected result | What it demonstrates |
| --- | --- | --- |
| Protected request without a token | `401 Unauthorized` | The API could not identify a caller. |
| Normal user calls an admin route | `403 Forbidden` | Identity is valid, but the current role lacks permission. |
| Signup includes `role: "admin"` | `400 Bad Request` | Public callers cannot grant themselves roles. |
| Profile update includes an unsupported `role` field | `400 Bad Request` | Strict validation rejects fields the profile feature does not own. |
| PATCH sets a bio, then omits `bio` | `200 OK`; saved bio remains | An omitted field means “leave it unchanged.” |
| PATCH sends `bio: null` | `200 OK`; bio becomes null | Explicit null clears an optional value. |

Postman displays the response status/body and runs a small assertion after each request. Read the **Test Results** tab, then explain why the observed result happened. Run the experiments before the admin regression folder, which eventually deletes the disposable user.

## Manual email experiment

The password-reset requests are in **Manual account flows**. Real delivery requires SMTP credentials and access to the mailbox. The forgot-password request returns `503` for every address when SMTP is not configured; it does not claim an email was sent. If configured, copy the token from the received link into `passwordResetToken` and continue with the reset request.
