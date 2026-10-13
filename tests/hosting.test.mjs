import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configureHosting } from '../server/hosting.mjs';

test('hosted proxy preserves client separation without trusting the whole forwarding chain',async t=>{
 const app=express();configureHosting(app,{TRUST_PROXY_HOPS:'1'});
 app.get('/',(req,res)=>res.json({ip:req.ip}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());
 const url=`http://127.0.0.1:${server.address().port}/`;
 for(const client of ['198.51.100.1','198.51.100.2']) {
  const response=await fetch(url,{headers:{'X-Forwarded-For':`203.0.113.99, ${client}`}});
  assert.equal((await response.json()).ip,client);
 }
});
test('hosting rejects invalid trust and missing production credentials without exposing values',()=>{
 for(const value of ['true','-1','1.5','99'])assert.throws(()=>configureHosting(express(),{TRUST_PROXY_HOPS:value}),/TRUST_PROXY_HOPS/);
 assert.throws(()=>configureHosting(express(),{NODE_ENV:'production',GEMINI_API_KEY:'private-test-key'}),/Missing server setting: SUPABASE_URL/);
 assert.doesNotThrow(()=>configureHosting(express(),{NODE_ENV:'production',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',GEMINI_API_KEY:'test'}));
});
