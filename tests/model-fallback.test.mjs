import test from 'node:test';
import assert from 'node:assert/strict';
import { availableModels, generateWithFallback, rankModels } from '../server/gemini-models.mjs';
const model=name=>({name:`models/${name}`,supportedGenerationMethods:['generateContent']});
const ok={ok:true,status:200};
test('prefers fast text fallbacks and excludes specialized models',()=>{
  const models=['gemini-2.5-pro','gemini-3.8-flash-tts','gemini-3.8-flash','gemini-3.1-flash-lite','gemini-3.1-pro-preview','gemini-3.1-pro-preview-customtools','gemini-3-pro-image','gemini-3.5-transcribe','gemini-robotics-er-2-preview'].map(model);
  assert.deepEqual(rankModels(models,'gemini-3.8-flash'),['gemini-3.8-flash','gemini-3.1-flash-lite','gemini-2.5-pro','gemini-3.1-pro-preview']);
  assert.deepEqual(rankModels([{...model('gemini-3.8-flash'),supportedGenerationMethods:['embedContent']}]),[]);
});
test('unavailable preferred model falls back with identical body and no key in URLs',async()=>{
  const calls=[];let selected;const body={systemInstruction:{parts:[{text:'Shared safety rules'}]},generationConfig:{responseMimeType:'application/json'}};
  const result=await generateWithFallback({apiKey:'fallback-test',preferred:'gemini-3.8-flash',body,onSelected:name=>selected=name,fetchImpl:async(url,req)=>{
    calls.push(url);assert.ok(!url.includes('fallback-test'));assert.equal(req.headers['x-goog-api-key'],'fallback-test');
    if(url.includes('?'))return {ok:true,json:async()=>({models:[model('gemini-3.1-pro-preview'),model('gemini-2.5-flash')]})};
    assert.deepEqual(JSON.parse(req.body),body);
    return url.includes('3.8')?{ok:false,status:404}:ok;
  }});
  assert.equal(result,ok);assert.equal(selected,'gemini-2.5-flash');assert.equal(calls.length,3);
});
test('model discovery follows pages and caches per key',async()=>{
  let calls=0;const fetchImpl=async url=>{calls++;return {ok:true,json:async()=>url.includes('pageToken=')?{models:[model('gemini-3.8-flash')]}:{models:[model('gemini-2.5-flash')],nextPageToken:'page2'}};};
  const first=await availableModels('paging-test',{fetchImpl});assert.equal(first.length,2);
  await availableModels('paging-test',{fetchImpl});assert.equal(calls,2);
});
test('rate limit tries next suitable model; auth and bad requests never trigger fallback',async()=>{
  let calls=0;
  await generateWithFallback({apiKey:'rate-test',preferred:'gemini-3.8-flash',body:{},fetchImpl:async url=>{
    calls++;if(url.includes('?'))return {ok:true,json:async()=>({models:[model('gemini-3.8-flash'),model('gemini-3.6-flash')]})};
    return url.includes('3.8')?{ok:false,status:429}:ok;
  }});assert.equal(calls,3);
  for(const status of [400,401,403]) {
    let attempts=0;const result=await generateWithFallback({apiKey:`auth-test-${status}`,preferred:'gemini-3.8-flash',body:{},fetchImpl:async()=>{attempts++;return {ok:false,status};}});
    assert.equal(result.status,status);assert.equal(attempts,1);
  }
});
test('fallback attempts are bounded even when the whole project is unavailable',async()=>{
  let generated=0;
  await assert.rejects(generateWithFallback({apiKey:'bounded-test',preferred:'gemini-3.8-flash',body:{},fetchImpl:async url=>{
    if(url.includes('?'))return {ok:true,json:async()=>({models:Array.from({length:10},(_,i)=>model(`gemini-3.${i}-flash`))})};
    generated++;return {ok:false,status:503};
  }}),/busy or unavailable/);
  assert.equal(generated,5);
});
