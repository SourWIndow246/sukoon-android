import test from 'node:test';
import assert from 'node:assert/strict';
import { ancestorFlags, createsCycle, hasUrgentWords, profileLimit, emergencyTriage, familyLayers } from '../src/policy.mjs';
import { safeReply } from '../server/validation.mjs';
import { demoReply } from '../src/demo.ts';
import { CARE_TOOL, SYSTEM_PROMPT } from '../server/prompt.mjs';
const p={id:'person',name:'Test',age:30,type:'Adult',conditions:[],allergies:[]};
const chat=answers=>({id:'test',profileId:p.id,messages:answers.map(content=>({role:'user',content}))});
test('the live model contract loads and requests structured triage',()=>{assert.equal(CARE_TOOL.name,'care_turn');assert.match(SYSTEM_PROMPT,/AT LEAST THREE/);assert.deepEqual(CARE_TOOL.input_schema.properties.triage_suggestion.properties.colour.enum,['green','yellow','red']);});
test('free account enforces five profiles and separate adult/child quotas',()=>{
 const profiles=[{type:'Adult'},{type:'Adult'},{type:'Child'},{type:'Child'}];
 assert.match(profileLimit(profiles,'Adult',false),/2 adult/);
 assert.equal(profileLimit(profiles,'Child',false),null);
 assert.match(profileLimit([...profiles,{type:'Child'}],'Child',false),/5 members/);
 assert.equal(profileLimit([...profiles,{type:'Child'}],'Adult',true),null);
});
test('emergency English and Hinglish escalate without waiting for follow-ups',()=>{
 for(const text of ['I cannot breathe','seene mein dard','saans nahi aa rahi','behosh hai']){
  assert.equal(hasUrgentWords(text),true,text);assert.equal(demoReply(chat([text]),p,'Hinglish').triage_suggestion.colour,'red');
 }
});
test('normal demo flow asks all follow-up questions before selecting a light',()=>{
 const answers=['Headache','Since today','Mild · usual activities okay','None of these','No other symptoms'];
 for(let i=1;i<5;i++)assert.equal(demoReply(chat(answers.slice(0,i)),p,'English').triage_suggestion,undefined);
 const final=demoReply(chat(answers),p,'English');assert.equal(final.triage_suggestion.colour,'green');assert.equal(final.options.length,0);assert.match(final.triage_suggestion.summary,/not a medical assessment/);
});
test('demo uncertainty leads to yellow and explicit danger response to red',()=>{
 const answers=['Headache','Since today','Moderate · resting more','None of these','Not sure'];
 assert.equal(demoReply(chat(answers),p,'English').triage_suggestion.colour,'yellow');
 assert.equal(demoReply(chat([...answers.slice(0,3),'Yes · one of these']),p,'Hinglish').triage_suggestion.colour,'red');
});
test('live output refuses premature green but never blocks red',()=>{
 const early=safeReply({message:'Done',options:[],triage_suggestion:{...emergencyTriage,colour:'green'}},1);
 assert.equal(early.triage_suggestion,undefined);assert.ok(early.options.length);
 const red=safeReply({message:'Get help',options:['unwanted question'],triage_suggestion:emergencyTriage},1);
 assert.equal(red.triage_suggestion.colour,'red');assert.deepEqual(red.options,[]);
 assert.throws(()=>safeReply({message:'',options:[],triage_suggestion:{colour:'green'}},9));
});
test('both parents pass ancestry through three generations without unrelated relatives',()=>{
 const family=[{id:'grandparent',name:'Grandparent',hereditary:['Diabetes'],parentIds:[]},{id:'parent',name:'Parent',hereditary:[],parentIds:['grandparent']},{id:'spouse',name:'Spouse',hereditary:['Thyroid'],parentIds:[]},{id:'child',name:'Child',hereditary:[],parentIds:['parent','spouse']},{id:'other',name:'Unrelated',hereditary:['Cancer'],parentIds:[]}];
 assert.deepEqual(ancestorFlags('child',family),[{condition:'Diabetes',relative:'Grandparent'},{condition:'Thyroid',relative:'Spouse'}]);
 assert.equal(createsCycle('grandparent','child',family),true);assert.equal(createsCycle('child','spouse',family),false);
 assert.deepEqual(familyLayers(family).map(row=>row.map(p=>p.id)),[['grandparent','spouse','other'],['parent'],['child']]);
});
test('malformed ancestry cannot loop forever or count the patient as their own ancestor',()=>{
 const f=[{id:'a',name:'A',hereditary:['X'],parentIds:['b']},{id:'b',name:'B',hereditary:['Y'],parentIds:['a']}];
 assert.deepEqual(ancestorFlags('a',f),[{condition:'Y',relative:'B'}]);
});
