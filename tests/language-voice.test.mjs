import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationLanguage, detectLanguage, speechLocale } from '../src/language.mjs';
import { nextQuestion, questionBanks, dangerAnswer, answeredFollowups } from '../src/assessment.mjs';
import { demoReply } from '../src/demo.ts';
import { emergencyFor, sampleResult } from '../src/careCopy.mjs';
import { safeReply } from '../server/validation.mjs';
import { runVoiceSession, spokenReply } from '../src/voiceSession.mjs';
const user=content=>({role:'user',content});
test('message language overrides preferences and follows switches; numbers retain context',()=>{
  assert.equal(detectLanguage('मुझे सिर में दर्द है','English'),'Hindi');
  assert.equal(detectLanguage('mujhe sar dard hai','English'),'Hinglish');
  assert.equal(detectLanguage('I have a headache','Hinglish'),'English');
  assert.equal(conversationLanguage([user('मुझे बुखार है'),user('2')]),'Hindi');
  assert.equal(conversationLanguage([user('मुझे बुखार है'),user('ab thoda theek hai')]),'Hinglish');
  assert.equal(conversationLanguage([user('mujhe bukhar hai'),user('I feel better')]),'English');
  assert.equal(detectLanguage('2 din se'),'Hinglish');
  for(const language of ['Hindi','Hinglish'])for(const q of questionBanks[language])for(const option of q.options)assert.equal(detectLanguage(option,language),language,option);
});
test('sample questions and summaries are localized; server preserves model questions',()=>{
  for(const [language,complaint] of [['Hindi','मुझे सिर में दर्द है'],['Hinglish','mere sar mein dard hai']]) {
    for(let count=1;count<=8;count++) {
      assert.deepEqual(safeReply(nextQuestion(count,language)),nextQuestion(count,language));
      const reply=demoReply({messages:[user(complaint),...Array.from({length:count-1},()=>user('2'))]},{conditions:[],type:'Adult'},'English');
      assert.deepEqual(reply,nextQuestion(count,language));
    }
    const summary=sampleResult(language,false,false);
    assert.equal(detectLanguage(summary.summary),language);
    assert.equal(detectLanguage(emergencyFor(language).summary),language);
  }
});
test('localized danger answers escalate; greeting does not count as a follow-up',()=>{
  for(const language of ['English','Hindi','Hinglish']) {
    const q=nextQuestion(1,language);
    const messages=[user('headache'),{role:'assistant',content:q.message},user(q.options[1])];
    assert.equal(dangerAnswer(messages),true);
    assert.equal(dangerAnswer([...messages.slice(0,-1),user(q.options[0])]),false);
  }
  assert.equal(answeredFollowups([{role:'assistant',content:'Hello'},user('headache')]),0);
});
test('voice sends once per final transcript, speaks after listening closes, stops at verdict',async()=>{
  const events=[];let turn=0;const controller=new AbortController();
  await runVoiceSession({signal:controller.signal,getLanguage:()=>turn?'Hindi':'English',onState:s=>events.push(s),onPartial:()=>{},
    listen:async lang=>{events.push(`listen:${lang}`);return 'सिर में दर्द है';},
    send:async()=>{turn++;return turn===1?{message:'कब से?'}:{message:'अब मदद लें',triage_suggestion:emergencyFor('Hindi')};},
    speak:async(text,lang)=>{events.push(`speak:${lang}`);if(turn===2)assert.match(text,/112/);},
  });
  assert.equal(turn,2);
  assert.deepEqual(events,['listening','listen:English','thinking','speaking','speak:Hindi','listening','listen:Hindi','thinking','speaking','speak:Hindi']);
});
test('stopping while a request is pending prevents speech and another recording',async()=>{
  const controller=new AbortController();let spoken=false;
  await runVoiceSession({signal:controller.signal,getLanguage:()=> 'English',onState:()=>{},onPartial:()=>{},listen:async()=> 'headache',send:async()=>{controller.abort();return {message:'When?'};},speak:async()=>{spoken=true;}});
  assert.equal(spoken,false);
});
test('silence never submits an empty medical turn and failures never speak a verdict',async()=>{
  let sent=false;let spoken=false;
  const options={signal:new AbortController().signal,getLanguage:()=> 'English',onState:()=>{},onPartial:()=>{},listen:async()=>'',send:async()=>{sent=true;},speak:async()=>{spoken=true;}};
  await assert.rejects(runVoiceSession(options),/no-speech/);assert.equal(sent,false);
  await assert.rejects(runVoiceSession({...options,listen:async()=> 'headache'}),/reply-failed/);assert.equal(spoken,false);
  assert.equal(spokenReply({message:'कब से?'}),'कब से?');
});
