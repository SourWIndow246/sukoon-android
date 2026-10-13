# Host the Sukoon API on Render

The testing backend is deployed at https://sukoon-api-ma2b.onrender.com on the free Singapore instance. Render service: `srv-db71g50m7kps73bncr3g`, branch: `codex/live-backend`. The first deployment of `8a1a0ad` passed the live `/health` check and returned 401 for unauthenticated `/account` requests on October 13, 2026. Secrets are stored in Render environment settings; local `.env` points the next Android build to this HTTPS origin.

The app connects directly to Supabase for email login and uses this Node service for authenticated profile, chat and record operations. Gemini and the Supabase server key belong in Render environment settings.

Use the repository's render.yaml blueprint, selecting the deployment branch. It creates one free Node web service in Singapore, installs only server dependencies, and checks /health. Automatic deploys are disabled so a future push will not silently replace the running API.

Enter these values from the existing local .env into Render's secret environment fields:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY

The blueprint sets Gemini as the provider, keeps model fallback enabled, and configures one trusted proxy hop for rate limiting. No database is created: the existing Supabase project is used. The existing migrations must already be applied.

After Render reports Live, check https://YOUR-SERVICE.onrender.com/health. It should return status ok, configured true and ai true. This checks service configuration, not email delivery or clinical accuracy. Protected /account requests without a user token should return 401.

Put the actual HTTPS service origin in EXPO_PUBLIC_API_URL locally and rebuild the APK. Supabase public client settings must also be present. Server-only keys must remain absent from APK assets.

Free Render services sleep after 15 minutes without inbound traffic; the next request may wait for startup. This is a testing deployment. OCR is resource intensive, and file cleanup queued during sleep runs after the server wakes. Choose paid always-on hosting separately if needed.

References: https://render.com/docs/deploy-node-express-app, https://render.com/docs/free, https://render.com/docs/blueprint-spec

The preferred model is now `gemini-3.1-flash-lite`, selected for faster replies. The app prompt, structured response schema, language handling and minimum-question/emergency validation remain unchanged. Fallbacks prefer Flash-Lite, then Flash, then Pro; stable models precede preview models in each group. In one synthetic English follow-up comparison on October 13, 2026, 3.1 Flash-Lite completed in 12.9s and 3.5 Flash-Lite in 19.1s; 3.8 Flash and 2.5 Flash-Lite failed to finish within the request timeout. These are limited measurements, not a latency guarantee or clinical validation.
