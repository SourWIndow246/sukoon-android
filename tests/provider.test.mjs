import test from 'node:test';
import assert from 'node:assert/strict';
import { aiConfig, aiStatus, careReply } from '../server/care-provider.mjs';
import { CARE_TOOL } from '../server/prompt.mjs';
import { emergencyTriage } from '../src/policy.mjs';
import { questionBanks } from '../src/assessment.mjs';
const context={language:'Hindi',profile:{age:30},clinicalReferences:{matches:[]}};
const messages=[{role:'user',content:'सिर में दर्द है',at:'2026-10-13T10:00:00Z'}];
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-secret',GEMINI_MODEL:'gemini-3.8-flash'};
const jsonResponse=value=>({ok:true,json:async()=>value});
const candidate=reply=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(reply)}]}}]});
test('explicit provider selection never falls back and status never exposes keys',()=>{
  assert.equal(aiConfig({GEMINI_API_KEY:'x'}).provider,'gemini');
  assert.equal(aiConfig({AI_PROVIDER:'anthropic',GEMINI_API_KEY:'x'}).apiKey,undefined);
  assert.throws(()=>aiConfig({AI_PROVIDER:'other'}));
  assert.throws(()=>aiConfig({...env,GEMINI_MODEL:'../secret?key=x'}));
  assert.equal(JSON.stringify(aiStatus(env)).includes('test-secret'),false);
});
test('Gemini receives private header key, schema, history and language rules; early green is gated',async()=>{
  let calls=0;
  const result=await careReply({messages,context},{env,fetchImpl:async(url,request)=>{
    calls++;assert.match(url,/generativelanguage.googleapis.com.*generateContent$/);
    assert.ok(!url.includes('test-secret'));assert.equal(request.headers['x-goog-api-key'],'test-secret');
    const body=JSON.parse(request.body);
    assert.deepEqual(body.generationConfig.responseJsonSchema,CARE_TOOL.input_schema);
    assert.match(body.systemInstruction.parts[0].text,/everyday sentences/);
    assert.match(body.systemInstruction.parts[0].text,/Roman-script Hinglish/);
    assert.equal(body.contents.at(-1).role,'user');assert.match(body.contents.at(-1).parts[0].text,/सिर/);
    assert.ok(!JSON.stringify(body).includes('test-secret'));
    return jsonResponse(candidate({message:'Done',options:[],triage_suggestion:{...emergencyTriage,colour:'green'}}));
  }});
  assert.equal(calls,1);assert.deepEqual(result,questionBanks.Hindi[0]);
});
test('Gemini preserves complete verdict after eight answers and emergency bypass',async()=>{
  const full=[...messages];for(let i=0;i<8;i++)full.push({role:'assistant',content:'Question'},{role:'user',content:'Answer'});
  for(const [transcript,colour] of [[full,'yellow'],[[{role:'user',content:'I cannot breathe',at:new Date().toISOString()}],'red']]) {
    const result=await careReply({messages:transcript,context},{env,fetchImpl:async()=>jsonResponse(candidate({message:'Help',options:[],triage_suggestion:{...emergencyTriage,colour}}))});
    assert.equal(result.triage_suggestion.colour,colour);
  }
});
test('blocked, truncated, invalid and excessive Gemini responses never become verdicts',async()=>{
  const invalid=[
    {promptFeedback:{blockReason:'SAFETY'}},
    {candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]},
    {candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]},
    candidate({message:'Done',options:[],triage_suggestion:{...emergencyTriage,possibilities:Array(9).fill('condition')}}),
  ];
  for(const response of invalid)await assert.rejects(careReply({messages,context},{env,fetchImpl:async()=>jsonResponse(response)}));
  await assert.rejects(careReply({messages,context},{env,fetchImpl:async()=>({ok:false,json:async()=>({error:'test-secret'})})}),error=>!error.message.includes('test-secret'));
  await assert.rejects(careReply({messages,context},{env:{AI_PROVIDER:'gemini'},fetchImpl:async()=>{throw new Error('must not fetch');}}),/key is missing/);
});
test('Anthropic remains available and uses the same localized guard',async()=>{
  const result=await careReply({messages,context},{env:{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-only'},fetchImpl:async(url,request)=>{
    assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(request.headers['x-api-key'],'test-only');
    return jsonResponse({stop_reason:'tool_use',content:[{type:'tool_use',name:'care_turn',input:{message:'When?',options:[]}}]});
  }});
  assert.deepEqual(result,questionBanks.Hindi[0]);
});
