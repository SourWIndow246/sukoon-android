# Sukoon — native Android app

Sukoon is a React Native / Expo Android app, not a WebView wrapper. Native screens render through React Native; Android entry points are in `android/app/src/main/java/in/sukoon/health/`. The optional browser target is for UI development only.

## Install the Android preview

Download [Sukoon-1.0.8.apk from the latest Android preview release](https://github.com/SourWIndow246/sukoon-android/releases/tag/v1.0.8-preview). Access requires permission to this private repository.

The latest preview is **1.0.8 / Android version code 9**. It includes adaptive follow-up questions, dated conversation recall for each family profile, personalised returning check-ins, optional fresh weather context, and care-urgency results without disease lists. See [release notes](releases/Sukoon-1.0.8-notes.md), [conversation recall](docs/conversation-memory.md), and [verification](VERIFICATION.md). The distributed APK connects to the configured hosted backend and Supabase email login; locally built apps require your own environment settings.

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
- Supabase email-code login, private Storage, Postgres migrations and row-level access policies.
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

1. Create a Supabase project and apply `supabase/migrations/001_sukoon.sql`, then `002_remove_family_member.sql`, in the SQL editor. Enable Email Auth and configure code emails using [the email setup guide](docs/supabase-email-setup.md). The `medical-records` bucket is private and limited to 10 MB files.
2. Copy `.env.example` to `.env`. Fill in the public Supabase URL / anon key, the backend URL, and **server-only** Supabase service-role and Anthropic keys. Never expose service-role or AI keys with an `EXPO_PUBLIC_` prefix.
3. Run `pnpm server`, or deploy the Express service using Node 22+ to Railway / Render. Use HTTPS for a physical Android device; `localhost` on a phone refers to that phone. No real credentials are provided in this repository.
4. Configure `ANTHROPIC_MODEL` to an available supported model for your account. The requested `claude-sonnet-4-20250514` has been retired; the code uses the configurable `claude-sonnet-4-6` default.
5. Rebuild the APK after setting `EXPO_PUBLIC_*` variables. A configured app uses OTP login and does not seed fictional profiles. The AI sees patient data only after the first-chat consent notice.
6. Set RevenueCat's webhook authorization value to `REVENUECAT_WEBHOOK_SECRET`, the entitlement to `sukoon_plus`, and its app user ID to the Supabase user UUID. The webhook is implemented, but **native purchase / restore UI is wired; RevenueCat keys, offerings and Play Billing products still need your account configuration**. The preview toggle never charges anyone and cannot enable live subscriptions.

## Important limits before a real medical launch

### Chat language and voice

Each user message selects English, Hindi (Devanagari), or Hinglish (Roman script); numbers and ambiguous short answers keep the previous language. The saved preference is only the initial fallback. The eight fixed questions, answer chips, demo summaries and emergency replies are translated; the live model is instructed to match the latest message in all output fields and explain illness names in everyday words. The local detector uses script and common Hindi words, so uncommon Roman spellings may need improvement.

One **Start voice chat** button enables alternating listening and spoken replies. Final speech transcripts use the same chat endpoint and medical guards as typed messages. Audio is not saved by Sukoon. The operating system or browser speech service may process audio online; the button explains this before use. Typing stays available when voice is off. Stopping, changing chats, navigating away or backgrounding the app cancels recognition and playback. A completed summary is read aloud, including next steps and warning signs, then listening stops.

Web voice requires a browser with speech recognition and speech synthesis, microphone permission, and HTTPS or localhost. Hindi/Hinglish playback requires an installed Hindi voice. Recognition starts in the current chat language (English-India or Hindi-India); browser/device recognition is not universal automatic multilingual detection. It may mishear mixed speech, so the transcript stays visible. Unsupported browsers, permission denial, silence, missing voices and network errors return to typing with a message. Native speech uses `expo-speech-recognition` for SDK 54 and `expo-speech`; **rebuild the Android app** to include the new native modules and microphone permission. Existing APKs do not gain these modules through a web refresh. Physical microphone, mixed-language recognition and speaker testing are still required on target devices.

### Gemini integration

The backend supports Gemini and Anthropic through the shared provider adapter in `server/care-provider.mjs`. The local `.env` file is ignored by Git. Set `AI_PROVIDER=gemini`, fill `GEMINI_API_KEY` locally, and optionally change `GEMINI_MODEL` (preferred model, default: `gemini-3.8-flash`). Then restart `pnpm server`. Never put the key in `EXPO_PUBLIC_*` or the mobile/browser bundle. Set `AI_PROVIDER=anthropic` to deliberately select the previous provider; failed Gemini requests never silently switch providers.

If the preferred Gemini model returns unavailable/not-found, rate-limit or temporary server errors, `server/gemini-models.mjs` discovers models through Google's API and retries suitable text models. Full models rank ahead of Lite; newer generations rank ahead of older ones, with Pro ahead of Flash in the same generation. This is an explicit product preference, not a clinical-accuracy benchmark. Image, audio, transcription, robotics and other specialized models are excluded. Discovery is cached for five minutes; failing models get a short cooldown. At most five generation attempts share the original 75-second timeout. Authentication/schema errors, safety blocks and invalid or truncated generated replies do not trigger model fallback. All attempts use the same instructions, context and output validation.

Live chat also needs the existing Supabase URL, service key and public client settings described in **Enable real services**. A Gemini key alone does not switch the local sample app into live mode. The `/health` endpoint reports storage configuration, AI configuration and provider without exposing credentials. Both providers receive the same language/plain-language rules, history and symptom references, and use the same validation, eight-question gate and shortlist limit. Blocked, truncated, malformed and failed responses cannot produce a completed verdict. Speech transcripts use this same endpoint. Mocked contract tests cover both providers; live end-to-end verification still requires your credentials and configured Supabase project.

Provider documentation: [Gemini key handling](https://ai.google.dev/gemini-api/docs/api-key), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [speech recognition support](https://github.com/jamsch/expo-speech-recognition), [Expo speech](https://docs.expo.dev/versions/v54.0.0/sdk/speech/).

### Symptom reference search and interview

The live assessment retrieves matching entries from `server/clinical-search.mjs`, a small local NHS-linked index covering selected respiratory, headache, abdominal and urinary presentations. The model receives all matching references, patient history and the transcript. This is keyword retrieval, not a professional diagnostic search engine, a probability model, or an integration with a licensed practitioner CDSS. The app does not fetch these pages during each assessment. References were checked on 13 October 2026 and need ongoing editorial review.

Eight follow-up answers are required before a non-emergency result. The server supplies eight history-domain questions; the model can continue with discriminating questions afterwards. Current warning signs can trigger immediate escalation at any turn. Explicit local denials no longer automatically trigger emergency keywords, and merely mentioning a disease such as a relative's stroke does not itself activate the keyword backstop. Contextual interpretation still relies on the model; multilingual negation coverage is incomplete.

Final output allows at most eight distinct tentative explanations. A shorter list does not mean all other diseases have been excluded. General reference links appear in the result and doctor export; they do not verify an individual diagnosis. Urgency uses current warning signs, severity, functional impairment and uncertainty, **never average lethality**. A low average could conceal a time-critical condition. No professional-equivalent accuracy is claimed. Establishing that would require an appropriate clinical knowledge provider and independent clinician-led validation on representative cases, including emergency sensitivity and over-triage rates. The demo remains explicitly non-clinical.

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

### Family removal and mobile voice update (1.0.2)

Long-press a family card for Edit details or Remove member. Removal confirms before deleting the member, their chats/records and family links. Before using this with live accounts, apply `supabase/migrations/002_remove_family_member.sql` after migration 001. The backend queues private-file deletion and retries interrupted cleanup every ten minutes and after restart.

The microphone beside Send opens a voice window. Grant microphone permission when prompted. Android also needs an available speech-recognition service and a speech voice for the conversation language. Actual device speech support varies; permission and retry controls remain in the popup. Normal assessments wait for eight follow-up answers; an unsupported model red verdict cannot bypass that gate.
