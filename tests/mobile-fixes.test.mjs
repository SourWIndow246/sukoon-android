import test from 'node:test';
import assert from 'node:assert/strict';
import { withoutMember } from '../src/family.mjs';
import { hasUrgentWords, emergencyTriage } from '../src/policy.mjs';
import { safeReply } from '../server/validation.mjs';
import { demoReply } from '../src/demo.ts';
import { waitForVoiceForeground } from '../src/voiceLifecycle.mjs';
import { cleanRemovedFiles } from '../server/profile-removal.mjs';

test('reported vague phrase cannot produce an early verdict in demo or provider output',()=>{
 const messages=[{role:'user',content:'i have one of this problem'}];
 const p={conditions:[],allergies:[]};
 const first=demoReply({messages},p,'English');assert.equal(first.triage_suggestion,undefined);
 for(const colour of ['green','yellow','red'])for(let count=1;count<=8;count++){
  assert.equal(safeReply({message:'Done',options:[],triage_suggestion:{...emergencyTriage,colour}},count).triage_suggestion,undefined);
 }
 for(let i=0;i<8;i++){
  const question=demoReply({messages},p,'English');assert.equal(question.triage_suggestion,undefined);
  messages.push({role:'assistant',content:question.message},{role:'user',content:i===0?'None of these':'No other problem'});
 }
 assert.ok(demoReply({messages},p,'English').triage_suggestion);
});
test('clear danger remains urgent; resolved bleeding and vague symptoms do not auto-trigger',()=>{
 for(const phrase of ['i have one of this problem','bleeding stopped','sudden mild headache','behosh nahi hai','I am not unconscious','बेहोश नहीं हैं'])assert.equal(hasUrgentWords(phrase),false,phrase);
 for(const phrase of ["bleeding won't stop",'heavy bleeding','sudden severe headache','I cannot breathe','behosh hai','सांस नहीं आ रही'])assert.equal(hasUrgentWords(phrase),true,phrase);
});
test('removing a parent clears their records, chats and links, preserving other members',()=>{
 const data={premium:false,profiles:[{id:'p',parentIds:[]},{id:'c',parentIds:['p','q']},{id:'q',parentIds:[]}],records:[{id:1,profileId:'p'},{id:2,profileId:'c'}],chats:[{id:3,profileId:'p'},{id:4,profileId:'q'}]};
 const result=withoutMember(data,'p');assert.deepEqual(result.profiles.map(p=>p.id),['c','q']);assert.deepEqual(result.profiles[0].parentIds,['q']);assert.deepEqual(result.records,[data.records[1]]);assert.deepEqual(result.chats,[data.chats[1]]);assert.equal(data.profiles.length,3);assert.deepEqual(data.profiles[1].parentIds,['p','q']);
 assert.deepEqual(withoutMember({profiles:[{id:'p',parentIds:[]}],records:[],chats:[]},'p').profiles,[]);
});
test('permission dialog can dismiss before foreground event without cancelling voice',async()=>{
 let notify;let removed=false;const controller=new AbortController();
 const ready=waitForVoiceForeground({signal:controller.signal,getState:()=> 'background',subscribe:listener=>{notify=listener;return {remove:()=>removed=true}}});
 notify('inactive');notify('active');await ready;assert.equal(removed,true);
});
test('closing voice popup while waiting for permission cancels pending startup',async()=>{
 const controller=new AbortController();let removed=false;
 const ready=waitForVoiceForeground({signal:controller.signal,getState:()=> 'background',subscribe:()=>({remove:()=>removed=true})});
 controller.abort();await assert.rejects(ready,/aborted/);assert.equal(removed,true);
});
test('cloud file cleanup stays within the removed member and retains failed jobs for retry',async()=>{
 let removed=[];let jobDeleted=false;let failed=true;
 const db={from:()=>({select:()=>({limit:async()=>({data:[{owner_id:'owner',profile_id:'member'}]})}),delete:()=>({eq:()=>({eq:async()=>{jobDeleted=true;return {}}})})}),storage:{from:()=>({list:async prefix=>{assert.equal(prefix,'owner/member');return {data:removed.length?[]:[{name:'report.pdf'}]}},remove:async paths=>{if(failed)return {error:{}};removed=paths;return {}}})}};
 await assert.rejects(cleanRemovedFiles(db),/clean removed files/);assert.equal(jobDeleted,false);
 failed=false;await cleanRemovedFiles(db);assert.deepEqual(removed,['owner/member/report.pdf']);assert.equal(jobDeleted,true);
});
