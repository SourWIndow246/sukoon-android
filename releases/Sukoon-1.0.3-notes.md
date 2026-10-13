# Sukoon 1.0.3 — phone testing build

Install `Sukoon-1.0.3.apk` on an Android 7 or newer ARM64 phone. It uses the same testing signing key as earlier previews, so it can update them in place. This is a sideloaded testing build, not a Play Store release.

The app connects to `https://sukoon-api-ma2b.onrender.com` and the configured Supabase project. Sign in with your email code. Gemini and Supabase server credentials remain on the backend and are excluded from the APK.

Included: email login, family profile editing/removal by long press, voice chat beside Send with its own dialog, and Hindi/Hinglish/English responses. Normal symptom assessment requires eight follow-up answers before a verdict; explicit emergency symptoms may prompt earlier urgent advice. Clinical accuracy has not been professionally validated.

Render's free instance sleeps after inactivity; the first request may take 50 seconds or longer. Keep an internet connection and allow microphone access for voice chat. Speech recognition also depends on the phone's installed speech service and language support.

Phone checks: sign in, open a family profile, send a normal symptom message, try Hindi/Hinglish, tap the microphone, and long-press a profile to edit it. Native voice operation still needs confirmation on the actual phone.
