export function spokenReply(reply) {
  const t=reply.triage_suggestion;
  return t?[reply.message,t.title,t.summary,...t.steps,...t.watchFor,t.followup].filter((v,i,a)=>v&&a.indexOf(v)===i).join('\n'):reply.message;
}
// Half-duplex: microphone closes before sending and stays closed during playback.
// Abort checks prevent a late permission, transcript or API result restarting audio.
export async function runVoiceSession({signal,listen,send,speak,getLanguage,onState,onPartial}) {
  while(!signal.aborted) {
    onState('listening');
    const text=await listen(getLanguage(),signal,onPartial);
    if(signal.aborted)return;
    if(!text.trim())throw new Error('no-speech');
    onPartial('');onState('thinking');
    const reply=await send(text);
    if(signal.aborted)return;
    if(!reply)throw new Error('reply-failed');
    onState('speaking');
    await speak(spokenReply(reply),getLanguage(),signal);
    if(signal.aborted||reply.triage_suggestion)return;
  }
}
