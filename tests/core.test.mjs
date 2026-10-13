import test from 'node:test';
import assert from 'node:assert/strict';
import { ancestorFlags, createsCycle, hasUrgentWords, profileLimit, emergencyTriage, familyLayers } from '../src/policy.mjs';
import { safeReply } from '../server/validation.mjs';
import { demoReply } from '../src/demo.ts';
import { CARE_TOOL, SYSTEM_PROMPT } from '../server/prompt.mjs';
import { questions, answeredFollowups } from '../src/assessment.mjs';
import { searchClinicalReferences, referenceLinks } from '../server/clinical-search.mjs';
const p={id:'person',name:'Test',age:30,type:'Adult',conditions:[],allergies:[]};
const chat=answers=>({id:'test',profileId:p.id,messages:answers.map(content=>({role:'user',content}))});
test('the live model contract loads and requests structured triage',()=>{assert.equal(CARE_TOOL.name,'care_turn');assert.match(SYSTEM_PROMPT,/AT LEAST EIGHT/);assert.deepEqual(CARE_TOOL.input_schema.properties.triage_suggestion.properties.colour.enum,['green','yellow','red']);});
test('free account enforces five profiles and separate adult/child quotas',()=>{
 const profiles=[{type:'Adult'},{type:'Adult'},{type:'Child'},{type:'Child'}];
 assert.match(profileLimit(profiles,'Adult',false),/2 adult/);
 assert.equal(profileLimit(profiles,'Child',false),null);
 assert.match(profileLimit([...profiles,{type:'Child'}],'Child',false),/5 members/);
 assert.equal(profileLimit([...profiles,{type:'Child'}],'Adult',true),null);
});
test('emergency English and Hinglish escalate without waiting for follow-ups',()=>{
 for(const text of ['I cannot breathe','seene mein dard aur saans nahi aa rahi','saans nahi aa rahi','behosh hai']){
  assert.equal(hasUrgentWords(text),true,text);assert.equal(demoReply(chat([text]),p,'Hinglish').triage_suggestion.colour,'red');
 }
});
test('normal demo flow asks all follow-up questions before selecting a light',()=>{
 const answers=['Headache','None of these','Gradual, since today','Forehead pressure','Mild · usual activities okay','Improving','No other symptoms','All as usual','No known additional history'];
 for(let i=1;i<9;i++)assert.equal(demoReply(chat(answers.slice(0,i)),p,'English').triage_suggestion,undefined);
 const final=demoReply(chat(answers),p,'English');assert.equal(final.triage_suggestion.colour,'green');assert.equal(final.options.length,0);assert.match(final.triage_suggestion.summary,/not a medical assessment/);
});
test('demo uncertainty leads to yellow and explicit danger response to red',()=>{
 const answers=['Headache','None of these','Since today','Forehead','Moderate · resting more','Staying the same','Not sure','All as usual','Not sure'];
 assert.equal(demoReply(chat(answers),p,'English').triage_suggestion.colour,'yellow');
 assert.equal(demoReply({messages:[{role:'user',content:'Headache'},{role:'assistant',content:questions[0].message},{role:'user',content:'Yes · one of these'}]},p,'Hinglish').triage_suggestion.colour,'red');
});
test('live output gates early verdicts unless emergency is confirmed',()=>{
 const early=safeReply({message:'Done',options:[],triage_suggestion:{...emergencyTriage,colour:'green'}},1);
 assert.equal(early.triage_suggestion,undefined);assert.ok(early.options.length);
 const red=safeReply({message:'Get help',options:['unwanted question'],triage_suggestion:emergencyTriage},1,'English',true);
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
test('eight follow-up answers are required for both non-emergency colours',()=>{
 for(const colour of ['green','yellow']) {
  const reply={message:'Assessment',options:[],triage_suggestion:{...emergencyTriage,colour}};
  for(let turns=1;turns<=8;turns++)assert.deepEqual(safeReply(reply,turns),questions[turns-1]);
  assert.equal(safeReply(reply,9).triage_suggestion.colour,colour);
 }
 assert.equal(answeredFollowups([{role:'user'},{role:'user'}]),0);
 assert.equal(answeredFollowups([{role:'user'},{role:'assistant'},{role:'user'}]),1);
});
test('explicit denials do not automatically trigger red; uncertainty and new danger still do',()=>{
 for(const text of ['No chest pain','I have no chest pain, just a cough','Chest pain nahi hai','No headache. No fever.','My father had a stroke','History of seizures','Not sure about chest pain'])assert.equal(hasUrgentWords(text),false,text);
 for(const text of ['No fever but I cannot breathe','No longer having one sided weakness','No chest pain but blue lips'])assert.equal(hasUrgentWords(text),true,text);
});
test('reference retrieval uses patient symptoms, excludes simple denials and retains provenance',()=>{
 const result=searchClinicalReferences([{role:'assistant',content:'Any chest pain?'},{role:'user',content:'No chest pain. Cough with mucus.'}]);
 assert.ok(result.matches.some(m=>m.name==='Bronchitis'));
 assert.ok(!result.matches.some(m=>m.name==='Acute coronary syndrome'));
 assert.ok(referenceLinks(result).every(r=>r.url.startsWith('https://www.nhs.uk/')));
 assert.deepEqual(searchClinicalReferences([{role:'user',content:'Unrecognised symptom'}]).matches,[]);
});
test('shortlist rejects overflow and duplicates instead of silently dropping conditions',()=>{
 const reply={message:'Assessment',options:[],triage_suggestion:{...emergencyTriage,colour:'yellow',possibilities:Array.from({length:8},(_,i)=>`Condition ${i}`)}};
 assert.equal(safeReply(reply,9).triage_suggestion.possibilities.length,8);
 assert.throws(()=>safeReply({...reply,triage_suggestion:{...reply.triage_suggestion,possibilities:[...reply.triage_suggestion.possibilities,'Ninth']}},9));
 assert.throws(()=>safeReply({...reply,triage_suggestion:{...reply.triage_suggestion,possibilities:['Same','same']}},9));
});
