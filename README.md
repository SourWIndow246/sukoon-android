# Sukoon — native Android app

Sukoon is a React Native / Expo Android app, not a WebView wrapper. Native screens render through React Native; Android entry points are in `android/app/src/main/java/in/sukoon/health/`. The optional browser target is for UI development only.

## Install the Android preview

Download [Sukoon-preview.apk from the Android preview release](https://github.com/SourWIndow246/sukoon-android/releases/tag/v1.0.0-preview.1). Access requires permission to this private repository.

The verified preview is available at `releases/Sukoon-preview.apk` (about 31 MB), for Android phones with an **arm64-v8a** processor, Android 7 or newer. Transfer it to the phone, open it, and approve installation from your chosen file manager. This preview is signed with the standard development key and is **not a Play Store release**. No development server is needed for the APK.

The preview starts with an explicitly labelled fictional family. Profiles, text records and assessment history persist locally. Do not enter real medical records into demo mode. Demo conversations are deterministic examples, not AI assessments.

## Included

- Netflix-style family selector; 2 adult + 3 child free allowance; unlimited Plus preview.
- Light, Dark, and Use phone setting modes. Appearance is saved on the device, applies to every screen and modal, and adjusts Android system UI. A moon/sun shortcut is available on the family selector.
- Two-step profiles: avatars, age, gender, weight, blood group, allergies, conditions, medication, vaccines and biological parent links.
- Native document picker and camera scan. Structured record editor; doctor follow-up linked to its assessment. Authenticated image OCR through Tesseract on the backend. PDF text must currently be entered manually. In demo mode original files are not retained.
- English / Hindi / Hinglish conversation UI, easy-answer chips, dated history context, persistent traffic-light box, animated 120 px Reanimated result circle, automatic conversation closure, and fresh new conversations.
- Emergency call and nearby-ER actions; clinician booking link; explicit payment-assistance placeholder.
- Bloodline ancestry traversal across generations and both biological parent branches. This is family history, not genetic testing or a disease prediction.
- Native PDF export and Android share sheet; export remains available for all records even on the free plan.
- Opt-in approximate location and current weather. Old weather is excluded by the backend after two hours.
- Supabase SMS OTP wiring, private Storage, Postgres migrations and row-level access policies.
- Express backend: authenticated profiles/records, Claude tool-validated triage, minimum question gate with urgent override, timestamped context, database session locks, closed-chat enforcement, referral logs, subscription webhook idempotency.

## Run / build

Node 22+ and pnpm 11+ are recommended. Dependencies are locked in `pnpm-lock.yaml`.

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm android
```

With Java 17 and the Android SDK installed, build a standalone preview:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```

The setup script keeps tools inside `.tools/`; it requires the SDK license to be accepted by the user. `scripts/build-apk.ps1` uses local tools if present and outputs the APK. For an x86_64 emulator or other ABI, change `-PreactNativeArchitectures` in that script. Release-mode preview embeds Hermes bytecode and runs without Metro.

Alternative: `eas.json` has `preview` (APK) and `production` (AAB) profiles. Using Expo EAS requires your Expo login and project linkage. Configure your own production signing credentials before publishing. The default local release build uses the development keystore strictly for preview distribution.

## Enable real services

1. Create a Supabase project and apply `supabase/migrations/001_sukoon.sql` in the SQL editor. Enable Phone Auth and configure an SMS provider. The `medical-records` bucket is private and limited to 10 MB files.
2. Copy `.env.example` to `.env`. Fill in the public Supabase URL / anon key, the backend URL, and **server-only** Supabase service-role and Anthropic keys. Never expose service-role or AI keys with an `EXPO_PUBLIC_` prefix.
3. Run `pnpm server`, or deploy the Express service using Node 22+ to Railway / Render. Use HTTPS for a physical Android device; `localhost` on a phone refers to that phone. No real credentials are provided in this repository.
4. Configure `ANTHROPIC_MODEL` to an available supported model for your account. The requested `claude-sonnet-4-20250514` has been retired; the code uses the configurable `claude-sonnet-4-6` default.
5. Rebuild the APK after setting `EXPO_PUBLIC_*` variables. A configured app uses OTP login and does not seed fictional profiles. The AI sees patient data only after the first-chat consent notice.
6. Set RevenueCat's webhook authorization value to `REVENUECAT_WEBHOOK_SECRET`, the entitlement to `sukoon_plus`, and its app user ID to the Supabase user UUID. The webhook is implemented, but **native purchase / restore UI is wired; RevenueCat keys, offerings and Play Billing products still need your account configuration**. The preview toggle never charges anyone and cannot enable live subscriptions.

## Important limits before a real medical launch

This is a functional engineering MVP, **not clinically validated medical software**. Its disclaimer is not a substitute for medical, regulatory, security and privacy review.

- Live Claude, SMS OTP, cloud storage, cloud OCR and RevenueCat cannot be end-to-end tested without credentials. The API never silently substitutes the demo for a failed live assessment.
- Neither the rule-based demo nor the keyword backstop is a diagnostic algorithm. Clinicians must evaluate triage quality, red-flag sensitivity, paediatric handling, escalation timing and language coverage before use with patients. Conservative keyword matching can produce false positives.
- No numerical probabilities, Crocin dose calculator, antibiotics, or unproven remedies are generated. Dosing requires product concentration, contraindication and clinician/pharmacist verification.
- Records are retained until explicitly managed; context is bounded to 20 previous encounters and 40 recent records per assessment. This is durable storage with bounded AI context, not an “infinite memory” guarantee. Retrieval and clinician-reviewed longitudinal summarisation are next steps before large histories.
- Doctor notes are stored as user-reported medical findings; AI output is `triage_suggestion`. Follow-ups provide future context, not automatic model training or proof of accuracy.
- Server sends streamed progress events and a validated complete reply. Unvalidated partial medical output is never shown. This is not token-by-token model streaming.
- Cross-account spouse/family sharing, AdMob, notifications, real lending and in-app doctor scheduling are not enabled. Finance CTAs are explicit placeholders and never transmit clinical records to a lender.
- Add clinician evaluation, production privacy policy, deletion/retention controls, incident response, encryption review, monitoring and appropriate audit controls before real users.

## Verification

`pnpm test` checks profile quotas, emergency English/Hinglish handling, complete normal question flow, green/yellow/red result closure, refusal of premature non-urgent model results, and inheritance through both parents across three generations. `pnpm typecheck` checks the app source. Native bundle and APK verification are recorded in `VERIFICATION.md`.

Primary references: [Expo APK builds](https://docs.expo.dev/build-reference/apk/), [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations), [NHS emergency warning signs](https://www.nhs.uk/conditions/heart-attack/), [India Emergency Response Support System](https://112.gov.in/).
