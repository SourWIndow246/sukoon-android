// Retrieve source messages, never invented summaries. All rows must already be owner-scoped.
const terms=text=>new Set((text.toLowerCase().match(/[\p{L}\p{M}]{3,}/gu)??[]).filter(t=>!['the','and','have','that','this','with','what','today','yesterday','feeling'].includes(t)));
export function recallHistory(rows,profileId,currentId,messages=[],now=new Date().toISOString()) {
 const history=rows.filter(r=>r.profile_id===profileId&&r.id!==currentId&&!r.data.demo)
   .filter(r=>Array.isArray(r.data.messages)&&r.data.messages.some(m=>m.role==='user'))
   .sort((a,b)=>Date.parse(b.data.startedAt)-Date.parse(a.data.startedAt));
 const query=terms(messages.filter(m=>m.role==='user').map(m=>m.content).join(' '));
 const candidates=history.map((r,index)=>{
   const text=r.data.messages.filter(m=>m.role==='user').map(m=>m.content).join(' ');
   const words=terms(text);const score=[...query].filter(t=>words.has(t)).length+(/allerg|medicin|medicat|pregnan|diabet|asthma|blood pressure|taking|take daily|दवा|एलर्जी|dawai|dawa|insulin/i.test(text)?2:0);
   return {r,index,score};
 }).sort((a,b)=>(a.index<3?0:1)-(b.index<3?0:1)||b.score-a.score||a.index-b.index);
 let budget=36000;const encounters=[];
 for(const {r,index,score} of candidates){
   if(encounters.length>=12||budget<800)break;
   if(index>=3&&score===0&&encounters.length>=6)continue;
   // A question and its answer stay together, so a bare "no" retains its meaning.
   const units=[];for(let i=0;i<r.data.messages.length;i++){
     const m=r.data.messages[i];if(m.role!=='user')continue;
     const before=r.data.messages[i-1];
     units.push({i,score:[...terms(m.content+' '+(before?.content??''))].filter(t=>query.has(t)).length,
       pair:[...(before?.role==='assistant'?[before]:[]),m].map(x=>({role:x.role,content:x.content,at:x.at??r.data.startedAt}))});
   }
   const limit=Math.min(budget,index<3?6500:3500);let used=0;
   const selected=units.toSorted((a,b)=>b.score-a.score||b.i-a.i).filter(u=>{const size=JSON.stringify(u.pair).length;if(used+size>limit)return false;used+=size;return true;}).sort((a,b)=>a.i-b.i);
   if(!selected.length)continue;
   encounters.push({id:r.id,startedAt:r.data.startedAt,endedAt:r.data.endedAt??null,
     source:'saved conversation; user reports are unverified; assistant questions are context only',
     messages:selected.flatMap(u=>u.pair),partial:selected.length<units.length});budget-=used;
 }
 return {asOf:now,encounters:encounters.sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt)),
   storedEncounterCount:history.length,omittedEncounterCount:history.length-encounters.length,
   note:'Dates and words are source evidence. Missing symptoms are unknown, not denied. Check whether old symptoms and medicines still apply. Records remain saved even if not selected here.'};
}
export function currentWeather(weather,now=Date.now()){
 if(!weather?.observedAt)return null;const age=now-Date.parse(weather.observedAt);
 if(!Number.isFinite(age)||age< -300000||age>2*3600000||!Number.isFinite(weather.temperature)||weather.temperature< -90||weather.temperature>65)return null;
 return {...weather,source:'weather shared by this device; optional context, not evidence of illness'};
}
