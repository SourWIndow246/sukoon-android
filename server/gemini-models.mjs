import { createHash } from 'node:crypto';

const cache=new Map();
const cooldowns=new Map();
const keyId=key=>createHash('sha256').update(key).digest('hex');
const retryable=new Set([404,429,500,502,503,504]);
// Product preference, not a claim of clinical accuracy. Full models precede Lite;
// within a generation, Pro precedes Flash. Specialized models cannot enter chat.
export function rankModels(models,preferred) {
  return [...new Set(models.filter(m=>m.supportedGenerationMethods?.includes('generateContent'))
    .map(m=>m.name?.replace(/^models\//,''))
    .filter(name=>/^gemini-\d+(?:\.\d+)?-(?:pro|flash)(?:-lite)?(?:-preview(?:-\d{2}-\d{2})?|-\d{3})?$/.test(name??'')))]
    .sort((a,b)=>{
      if(a===preferred)return -1;if(b===preferred)return 1;
      const score=name=>{const [,version,tier]=name.match(/^gemini-([\d.]+)-(pro|flash)/);return [name.includes('-lite')?0:1,Number(version),tier==='pro'?1:0,name.includes('preview')?0:1];};
      const left=score(a),right=score(b);
      for(let i=0;i<left.length;i++)if(left[i]!==right[i])return right[i]-left[i];
      return a.localeCompare(b);
    });
}
export async function availableModels(apiKey,{fetchImpl=fetch,signal,now=Date.now()}={}) {
  const id=keyId(apiKey);const old=cache.get(id);
  if(old?.expires>now)return old.models;
  const models=[];let token;const seen=new Set();
  do {
    const url=new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('pageSize','1000');if(token)url.searchParams.set('pageToken',token);
    const response=await fetchImpl(url.toString(),{headers:{'x-goog-api-key':apiKey},signal});
    if(!response.ok)throw Object.assign(new Error('Could not check available Gemini models. Please try again.'),{status:502});
    const page=await response.json();models.push(...(page.models??[]));token=page.nextPageToken;
    if(token&&seen.has(token))throw new Error('Repeated model page');
    if(token)seen.add(token);
  } while(token&&seen.size<20);
  if(cache.size>=20)cache.delete(cache.keys().next().value);
  cache.set(id,{models,expires:now+5*60_000});return models;
}
export async function generateWithFallback({apiKey,preferred,body,fetchImpl=fetch,signal,onSelected=()=>{}}) {
  const id=keyId(apiKey);const cooling=model=>(cooldowns.get(`${id}:${model}`)??0)>Date.now();
  let candidates=cooling(preferred)?[]:[preferred];let discovered=false;const attempted=new Set();
  for(let tries=0;tries<5;) {
    const model=candidates.shift();
    if(!model) {
      if(discovered)break;
      discovered=true;
      candidates=rankModels(await availableModels(apiKey,{fetchImpl,signal}),preferred).filter(m=>!attempted.has(m)&&!cooling(m));
      continue;
    }
    attempted.add(model);tries++;
    const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',headers:{'x-goog-api-key':apiKey,'content-type':'application/json'},body:JSON.stringify(body),signal,
    });
    if(response.ok){onSelected(model);return response;}
    // Authentication, request/schema errors, and safety-blocked outputs do not
    // trigger retries with different models. No provider error body is surfaced.
    if(!retryable.has(response.status))return response;
    cooldowns.set(`${id}:${model}`,Date.now()+(response.status===404?5*60_000:60_000));
    if(cooldowns.size>200)cooldowns.delete(cooldowns.keys().next().value);
  }
  throw Object.assign(new Error('Available Gemini models are busy or unavailable. Please try again shortly; no assessment was made.'),{status:503});
}
