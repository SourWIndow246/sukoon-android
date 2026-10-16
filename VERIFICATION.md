## Mobile fixes · 13 October 2026 · 1.0.2 / code 3

- Built releases/Sukoon-1.0.2-preview.apk (30,780,184 bytes). Gradle assembleRelease passed in 5m 27s. APK signature, embedded bundle, native speech modules, microphone permission and absence of configured server keys passed verification. SHA-256: 0808fb91a9a86175d9f0f357892b90c5b5d47411243ec2e1b97765f1f9449950. Logs: qa/android-build-latest.log, qa/apk-verification-latest.log, qa/mobile-fixes-tests.log.

- Eight answered follow-ups precede a normal verdict. Early model-generated red output now requires explicit emergency evidence; the vague report "i have one of this problem" is covered by a regression test. Clear danger reports still bypass the interview.
- Before completion, the chat header shows neutral answer progress instead of traffic lights.
- Microphone control sits beside Send and opens a dedicated voice modal with listening, thinking, speaking, retry and stop states. Permission-dialog interruptions now wait for foreground before listening. Missing voice-list metadata can use the platform default for the requested language.
- Long-press a family card to edit or remove. Removal needs a confirmation, deletes that member's local chats/records and clears parent links. Live removal is an owner-scoped database transaction; private file cleanup uses a durable retry queue.
- New migration: supabase/migrations/002_remove_family_member.sql. Apply it before deploying the updated server. No remote migration or live database deletion has been run here.
- TypeScript passed; 38 automated tests passed across the suite, including six mobile regression tests.
- This APK is still a local demo because live public/backend configuration is incomplete. The Gemini key stays on the server.
- Physical-phone microphone recording/playback and native popup gestures remain unverified. Tests cover sequencing, cancellation and permission restoration; they do not establish hardware compatibility or clinical accuracy.
- Emergency backstop references checked: https://www.nhs.uk/symptoms/shortness-of-breath/ and https://www.nth.nhs.uk/patients/emergency/. Keyword matching is incomplete and is not a validated clinical rule system.

# Sukoon Android preview verification

## Latest phone preview — 1.0.8, 15 October 2026

- Install file: `releases/Sukoon-1.0.8.apk`, also available as `Sukoon-preview.apk`; 30,794,692 bytes; version 1.0.8 / code 9; Android 7+; arm64-v8a.
- Native Gradle release build succeeded in 5m 31s: 518 tasks, 43 executed. Log: `qa/apk-1.0.8-build.log`.
- APK signature, native speech modules, microphone permission, embedded Hermes runtime, configured public API/Supabase settings, and absence of server secrets/environment files verified. Log: `qa/apk-1.0.8-verification.log`.
- SHA-256: `671582218575975c59e619f7a8f1045bf5d87c2eb47b038debbecb0430a40d94`.
- TypeScript and 52 automated tests passed. Synthetic Gemini checks exercised next-day fever recall, already-answered facts, a resolved symptom followed by a new complaint, and heat context. Logs: `qa/continuity-tests.log` and `qa/continuity-model-check.log`.
- The hosted backend deployed source commit `c12a15c`; `/health` returned 200 with Gemini/storage configured, and `/account` returned 401 without authentication.
- These are engineering checks. Authenticated hosted chat, physical-phone keyboard/voice behaviour and clinical accuracy were not independently validated in this release. Recall is bounded to selected recent/relevant encounters; see `docs/conversation-memory.md`.

## Previous phone preview — 13 October 2026

- Install file: `releases/Sukoon-1.0.1-preview.apk` (also copied to `Sukoon-preview.apk`), 30,773,200 bytes. Version 1.0.1 / code 2; Android 7+; arm64-v8a.
- Native release build succeeded: 518 tasks, 127 executed. Log: `qa/android-build-latest.log`.
- Signature, embedded Hermes bundle, native speech recognition and speech playback classes, microphone permission, and absence of bundled `.env` files verified. Log: `qa/apk-verification-latest.log`.
- Bundled app code checked against the configured server secret values: none found. The Gemini key remains server-only.
- SHA-256: `a985d5004c5b9cc57508caf363df8558f1f7bfb7a6a2f35f884a2a8c6b3d753c`.
- Includes automatic typed-language selection, Hindi/Hinglish questions and summaries, plain-language instructions, and the voice chat toggle. 32 automated tests and TypeScript checks passed before packaging.
- This APK runs the labelled local demo because public Supabase settings are not configured. Gemini provider/fallback code runs on the backend and is not bundled into the phone app. A hosted backend and Supabase configuration are needed for real AI replies.
- Microphone recognition, speaker playback and installation still need testing on the user's physical phone. Development signing is used for this preview.

## Previous preview

Date: 11 October 2026.

## Final APK

- File: `releases/Sukoon-preview.apk` — 30,693,884 bytes (about 31 MB).
- Native Gradle `assembleRelease` succeeded after the final source changes: 477 tasks, 19 executed and 458 up to date. Build log: `qa/android-build.log`.
- Android package `in.sukoon.health`, label Sukoon, version 1.0.0 / code 1, minimum API 24 (Android 7), target API 36, arm64-v8a.
- `scripts/verify-apk.ps1` passed: APK v2 signature verifies, launcher activity exists, Android classes, embedded app bundle and native Hermes runtime are present. Verification output: `qa/apk-verification.log`.
- SHA-256: `d69a70f5de0f792fb898e5ce34e3c8f15d1fed3156e888992897330a13def0c0`. A `.sha256` file is alongside the APK.
- This release-mode preview uses the development signing key. Use your own protected production key for a store release.

## Source and behaviour

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- Automated checks: `node --test tests/*.test.mjs` passed all 12 tests. These cover profile quotas, immediate emergency handling in English/Hinglish, normal follow-up flow and closure, rejection of premature non-urgent model results, ancestry through both parents, cycle handling, theme selection/persistence parsing, and text contrast in both palettes.
- Shared React Native screen smoke test at a 412 × 915 viewport: family selection, dashboard, Settings, Light/Dark switching, saved Dark preference after reload, Hinglish question chips, four follow-up questions, completed green sample report, persistent top traffic light, and removal of the composer after completion.
- Empty string conditional children were converted to boolean guards to avoid native text rendering warnings.

## What these checks do not prove

- No Android device or emulator was attached (`adb devices` returned an empty list). Installation, physical-device launch, camera, native PDF sharing, native keyboard behaviour, and Android system-theme changes have not been tested on a device.
- Live Supabase OTP/storage/OCR, Anthropic responses, RevenueCat billing and webhook delivery were not tested against real accounts. They require the configuration described in README.md.
- Passing engineering tests does not demonstrate clinical safety or diagnostic accuracy. This APK uses clearly labelled deterministic demo conversations until real services are configured. It is not ready for patient use.

## Device acceptance checklist

1. Install `releases/Sukoon-preview.apk` on an arm64 Android phone running Android 7 or newer.
2. Open Sukoon without a development server; select a sample family profile.
3. In Settings → Appearance, test Light, Dark and Use phone setting. Close and reopen the app to confirm the saved preference.
4. Complete a sample care chat, check the final traffic light, and confirm the composer closes. Start a new check-in and confirm the previous one remains in History.
5. Create a fictional profile and record; test the camera/document permissions, PDF export and Android share sheet with sample data.
6. Before production, repeat on supported Android versions with large text, TalkBack, keyboard open, and low-network conditions. Configure production signing and live services separately.
