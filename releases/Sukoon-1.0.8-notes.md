# Sukoon 1.0.8 — Android preview

Install `Sukoon-1.0.8.apk` on an ARM64 Android phone running Android 7 or newer. Version code: 9. Size: 30,794,692 bytes. The existing development signing key allows updating earlier previews in place.

## Changes

- Adaptive follow-up questions use the current conversation and previously answered facts, without a fixed question count. Explicit emergency handling remains immediate.
- Returning check-ins use dated conversations for the selected family profile, including unfinished chats and later answers. Recent and relevant older history is selected within bounded context; every stored detail is not guaranteed to be recalled.
- User corrections take priority over older reports. Previous AI results are not treated as diagnosed facts.
- Relevant profile information, medical records and optional fresh weather context inform questions. Automatic weather refresh requires previously granted location permission.
- Results and exports present care urgency, reasons and next steps without disease shortlists.
- Includes earlier login/logout, Settings, optional Easy reading, voice dialog and Android keyboard layout fixes.

## Services and verification

The APK uses `https://sukoon-api-ma2b.onrender.com` and the configured Supabase project. Gemini and Supabase server credentials stay on the backend. Render deployment of source commit `c12a15cfaa344d0e013296c3588b28523bf553df` succeeded on 15 October 2026; the health endpoint returned 200 and an unauthenticated account request returned 401.

TypeScript and 52 automated tests passed. Four synthetic Gemini checks covered next-day fever recall, known answers, a corrected complaint, and heat exposure. Gradle release assembly, APK signature, native voice modules, public service settings and absence of server secrets in APK assets were verified. Physical-phone behaviour and clinical accuracy have not been validated by these checks.

SHA-256: `671582218575975c59e619f7a8f1045bf5d87c2eb47b038debbecb0430a40d94`.

This is a development-signed testing preview. Render's free service can take 50 seconds or longer to wake after inactivity. Speech recognition depends on the phone's installed speech service and language support.
