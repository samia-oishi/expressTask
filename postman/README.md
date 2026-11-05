# Postman QA

Import both JSON files in this directory and select **Express Task API - Local**.

Before running admin requests, set `adminEmail` and `adminPassword` to the trusted account created by `npm run seed:admin`. Secrets are intentionally blank in the committed environment.

The collection initializes a unique `userEmail` when `runId` is blank. Clear `runId` before another run to generate a new disposable identity. Run folders individually in their numbered order; destructive requests are deliberately placed last.

Password reset, password change, signout, self-deactivation, reactivation, and permanent deletion requests are available in the **Manual account flows** folder. For password reset, copy the token from the Gmail link into `passwordResetToken`; the browser link itself also opens the built-in reset form.

The admin regression flow promotes and later demotes the disposable user. It also invalidates tokens intentionally, so run the sign-in requests again when a later request needs a fresh token.
