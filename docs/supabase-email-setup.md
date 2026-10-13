# Supabase email setup for Sukoon

The source now uses email codes for sign-in. Existing APK 1.0.2 still contains phone login; rebuild after the public configuration and backend URL are ready.

1. In Authentication → Sign In / Providers, enable Email and allow new users to sign up. Keep email confirmation enabled. Phone/SMS configuration is optional for future work.
2. In Authentication → Email Templates, put the code template below in both **Confirm signup** and **Magic Link**, and save each. First-time and returning users need to receive a code they can enter inside the app.

```html
<h2>Your Sukoon sign-in code</h2>
<p>Enter this code in the Sukoon app:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request this code, you can ignore this email.</p>
```

3. For the first test, use the email address belonging to your Supabase organization account. The default email service sends only to team addresses and currently permits two messages per hour. For other recipients, configure custom SMTP in Supabase with your email service's sender address, host, port, username and password. These delivery credentials stay in Supabase.
4. Run database migrations 001 and 002 once, in order, if not already applied. No new database migration is needed for changing phone login to email: data belongs to the Supabase user ID.
5. Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the existing .env; use the publishable key for the app and secret key for the backend. Keep Gemini settings. EXPO_PUBLIC_API_URL must point to your separate HTTPS Node backend.
6. Restart the backend, verify configuration and rebuild the APK. In the rebuilt app, tap Send email code, check email, enter the code and verify. New users start with an empty family; add a fictional profile to check saving and chat. If account loading fails after successful verification, Retry loading account retries the backend without consuming the same code twice.

References:
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp

Actual email delivery and cloud account loading remain untested until the project configuration is supplied. Automated tests verify request/verification contracts, invalid input, returned sessions and failure propagation.
