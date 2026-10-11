export type Profile = { id: string; name: string; age: number; gender: string; type: 'Adult'|'Child'; avatar: number; weight: string; blood: string; allergies: string[]; conditions: string[]; medications: string[]; vaccines: string; hereditary: string[]; parentIds: string[]; relation: string; createdAt: string };
export type RecordItem = { id: string; profileId: string; name: string; date: string; doctor: string; diagnosis: string; medications: string; notes: string; kind: 'record'|'followup'; chatId?: string; storagePath?: string; createdAt: string };
export type Light = 'green'|'yellow'|'red';
export type Message = { role: 'user'|'assistant'; content: string; at: string };
export type Triage = { colour: Light; title: string; summary: string; possibilities: string[]; steps: string[]; watchFor: string[]; doctor: string; followup: string };
export type Chat = { id: string; profileId: string; startedAt: string; endedAt?: string; messages: Message[]; triage_suggestion?: Triage; context?: string; demo?: boolean };
export type AppData = { profiles: Profile[]; records: RecordItem[]; chats: Chat[]; premium: boolean; language: 'English'|'Hinglish'; consent: boolean };
export type Reply = { message: string; options: string[]; triage_suggestion?: Triage };
