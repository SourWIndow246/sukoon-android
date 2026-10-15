import test from 'node:test';
import assert from 'node:assert/strict';
import {initialVoiceLanguage,recognitionOptions,recognizeTurn} from '../src/voiceRecognition.mjs';
import {runVoiceSession} from '../src/voiceSession.mjs';

function fakeRecognizer() {
  const handlers=new Map();let aborted=0;
  return {
    addListener:(type,handler)=>{handlers.set(type,handler);return {remove:()=>handlers.delete(type)}},
    start(){},abort(){aborted++},emit:(type,event)=>handlers.get(type)?.(event),
    get aborted(){return aborted},get listenerCount(){return handlers.size},
  };
}
test('voice starts in English without a user message and follows actual user language',()=>{
  assert.equal(initialVoiceLanguage([{role:'assistant',content:'Namaste. Aaj kaisa lag raha hai?'}]),'English');
  assert.equal(initialVoiceLanguage([{role:'user',content:'I have a headache'}]),'English');
  assert.equal(initialVoiceLanguage([{role:'user',content:'मुझे बुखार है'}]),'Hindi');
  assert.equal(initialVoiceLanguage([{role:'user',content:'mujhe bukhar hai'}]),'Hinglish');
  assert.equal(initialVoiceLanguage([{role:'user',content:'मुझे बुखार है'},{role:'user',content:'I feel better'}]),'English');
  assert.equal(recognitionOptions('English').lang,'en-IN');
  assert.equal(recognitionOptions('Hindi').lang,'hi-IN');
  assert.equal(recognitionOptions('English').requiresOnDeviceRecognition,undefined);
  const auto=recognitionOptions('English',['en-US','hi-IN']);
  assert.equal(auto.lang,'en-US');assert.equal(auto.requiresOnDeviceRecognition,true);
  assert.deepEqual(auto.androidIntentOptions.EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES,['en-US','hi-IN']);
});
test('final transcript closes microphone and resolves without a delayed end event',async()=>{
  const recognizer=fakeRecognizer();const partials=[];
  const turn=recognizeTurn(recognizer,recognitionOptions('English'),new AbortController().signal,text=>partials.push(text));
  recognizer.emit('result',{isFinal:false,results:[{transcript:'I have'}]});
  assert.equal(recognizer.aborted,0);
  recognizer.emit('result',{isFinal:true,results:[{transcript:'I have a headache'}]});
  assert.equal(recognizer.aborted,1);
  assert.equal(await turn,'I have a headache');
  recognizer.emit('end');recognizer.emit('error',{error:'aborted'});
  assert.equal(recognizer.listenerCount,0);
  assert.deepEqual(partials,['I have','I have a headache']);
});
test('interim-only speech and cancelled recordings never become sent transcripts',async()=>{
  for(const cancel of [false,true]) {
    const recognizer=fakeRecognizer();const controller=new AbortController();
    const turn=recognizeTurn(recognizer,{},controller.signal,()=>{});
    recognizer.emit('result',{isFinal:false,results:[{transcript:'I cannot'}]});
    if(cancel)controller.abort();else recognizer.emit('end');
    await assert.rejects(turn,cancel?/aborted/:/no-speech/);
    assert.equal(recognizer.listenerCount,0);assert.equal(recognizer.aborted,1);
  }
});
test('spoken reply uses its own language even before React updates conversation state',async()=>{
  const controller=new AbortController();
  await runVoiceSession({signal:controller.signal,getLanguage:()=> 'Hindi',onState:()=>{},onPartial:()=>{},
    listen:async()=> 'I have a headache',send:async()=>({message:'When did it start?'}),
    speak:async(text,language)=>{assert.equal(language,'English');controller.abort();},
  });
});
