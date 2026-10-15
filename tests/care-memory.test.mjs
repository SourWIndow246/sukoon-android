import test from 'node:test';
import assert from 'node:assert/strict';
import {recallHistory,currentWeather} from '../server/care-memory.mjs';
import {careReply} from '../server/care-provider.mjs';
const user=content=>({role:'user',content});const ai=content=>({role:'assistant',content});
const row=(id,profile_id,messages,startedAt='2026-10-14T12:00:00Z')=>({id,profile_id,data:{startedAt,messages}});
test('recall keeps later answers with their questions and excludes other people, demos and current chat',()=>{
 const rows=[row('a','p',[user('Hello'),ai('What is bothering you?'),user('Fever 39 C since yesterday'),ai('Any medicines?'),user('I take medicine for blood pressure')]),row('b','other',[user('Private pregnancy detail')]),row('current','p',[user('Today')]),{...row('demo','p',[user('Demo fever')]),data:{...row('x','p',[]).data,messages:[user('Demo fever')],demo:true}}];
 const result=recallHistory(rows,'p','current');assert.equal(result.encounters.length,1);
 assert.equal(result.encounters[0].messages.at(-1).content,'I take medicine for blood pressure');
 assert.equal(result.encounters[0].messages.at(-2).content,'Any medicines?');
 assert.equal(result.encounters[0].messages.at(-1).at,'2026-10-14T12:00:00Z');
 assert.ok(!JSON.stringify(result).includes('Private pregnancy'));
});
test('recall retains recent corrections and retrieves older matching symptoms within a bound',()=>{
 const rows=Array.from({length:50},(_,i)=>row(String(i),'p',[user(i===0?'I have recurring migraines':'My foot is sore'),ai('More details?'),user('A mild ache')],new Date(Date.UTC(2026,7,i+1)).toISOString()));
 rows.push(row('latest','p',[user('The fever has gone. I stopped that medicine on my doctor’s advice.')],'2026-10-15T06:00:00Z'));
 const result=recallHistory(rows,'p','current',[user('The migraines came back')]);
 assert.ok(result.encounters.some(e=>e.id==='0'));assert.ok(result.encounters.some(e=>e.id==='latest'));
 assert.ok(result.omittedEncounterCount>0);assert.ok(JSON.stringify(result).length<45000);
});
test('stale, future and malformed weather is not supplied as current evidence',()=>{
 const now=Date.parse('2026-10-15T10:00:00Z');const sample={temperature:35,observedAt:'2026-10-15T09:00:00Z'};
 assert.equal(currentWeather(sample,now).temperature,35);
 for(const observedAt of ['2026-10-14T10:00:00Z','2026-10-16T10:00:00Z','invalid'])assert.equal(currentWeather({...sample,observedAt},now),null);
 assert.equal(currentWeather({...sample,temperature:999},now),null);
});
test('returning greetings reach model with memory; openings cannot produce a verdict',async()=>{
 const context={language:'English',memory:{encounters:[{messages:[user('Fever yesterday')]}]}};
 const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test',GEMINI_MODEL:'gemini-3.1-flash-lite'};
 let calls=0;const fetchImpl=async(_url,request)=>{calls++;assert.match(request.body,/Fever yesterday/);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'How is the fever today?',options:[]})}]}}]})}};
 assert.match((await careReply({messages:[user('hi')],context},{env,fetchImpl})).message,/fever/);assert.equal(calls,1);
 const bad=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'Done',options:[],triage_suggestion:{colour:'green',title:'Home care',summary:'Fine',possibilities:[],steps:['Rest'],watchFor:['Worsening'],doctor:'Doctor',followup:'Tomorrow'}})}]}}]})});
 await assert.rejects(careReply({messages:[],context:{...context,openingCheckIn:true}},{env,fetchImpl:bad}),/feeling today/);
});
