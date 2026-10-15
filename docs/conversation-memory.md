# Conversation recall

Each chat turn remains saved in Supabase under its account and family profile. New check-ins retrieve actual dated answers with the questions they answered, including unfinished encounters. The latest three encounters are prioritised; older matches and medicine/allergy history are also searched across saved chats. Recall is bounded to twelve selected encounters and approximately 36,000 message characters per request; omitted and partial history is explicitly marked. This is selective recall, not a promise that every stored detail is always loaded.

The opening check-in is generated using this memory and saved as an assistant turn. It never fabricates a user message and cannot issue a care verdict before today's report. Later replies receive the server-owned current transcript, profile, recorded family risks, medical records, and recalled conversations. Old AI verdicts are not used as diagnosed facts. New user corrections take precedence; old symptoms require a current-status check.

Weather is optional. Entering chat refreshes weather only if location permission was already granted and a sufficiently recent approximate position is available; otherwise it is omitted. Users can request location/weather in Settings. The backend ignores stale, future or invalid observations. Weather is context for relevant questions, never a diagnosis by itself.

The result presents care urgency, reasons, next steps, warning signs and follow-up. A legacy empty possibilities array remains in the response schema for older apps. No disease shortlist is shown by the updated app.

Validation: unit tests cover profile isolation, later answers, corrections, older relevant retrieval, weather freshness, returning greetings and opening-verdict rejection. Synthetic Gemini checks cover next-day fever recall, already-answered facts, a resolved symptom followed by a new complaint, and heat exposure. These checks are software verification, not clinical validation.
