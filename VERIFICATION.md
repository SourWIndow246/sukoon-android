# Sukoon Android preview verification

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
