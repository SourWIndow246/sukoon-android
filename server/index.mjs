import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { conversationLanguage } from '../src/language.mjs';
import { emergencyFor } from '../src/careCopy.mjs';
import { careReply, aiStatus } from './care-provider.mjs';
import { cleanRemovedFiles } from './profile-removal.mjs';
import { configureHosting } from './hosting.mjs';
import { profileSchema, recordSchema } from './validation.mjs';
import { ancestorFlags, createsCycle, hasUrgentWords } from '../src/policy.mjs';

import { answeredFollowups, dangerAnswer } from '../src/assessment.mjs';
import { searchClinicalReferences, referenceLinks } from './clinical-search.mjs';

const app=express();
configureHosting(app);
const db=process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY?createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const fail=(status,message)=>Object.assign(new Error(message),{status});
let cleaningFiles=false;
async function retryFileCleanup(){if(!db||cleaningFiles)return;cleaningFiles=true;try{await cleanRemovedFiles(db);}catch{console.warn('Removed-profile file cleanup pending; will retry.');}finally{cleaningFiles=false;}}
if(db){setTimeout(()=>void retryFileCleanup(),10000).unref();setInterval(()=>void retryFileCleanup(),600000).unref();}
app.use(helmet());app.use(cors({origin:process.env.ALLOWED_ORIGIN??'http://localhost:8081'}));app.use(express.json({limit:'100kb'}));
app.get('/health',(_req,res)=>res.json({app:'Sukoon',status:'ok',configured:!!db,ai:aiStatus().configured,aiProvider:aiStatus().provider}));
// The webhook never trusts a client-reported purchase. Only the subscription provider can set entitlements.
app.post('/webhooks/revenuecat',async(req,res,next)=>{try{
 const expected=process.env.REVENUECAT_WEBHOOK_SECRET;const received=req.get('authorization')??'';
 if(!expected||received.length!==expected.length||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))throw fail(401,'Invalid webhook authorization.');
 if(!db)throw fail(503,'Storage is not configured.');
 const event=z.object({id:z.string().min(1),type:z.string(),app_user_id:z.uuid(),expiration_at_ms:z.number().nullable().optional(),event_timestamp_ms:z.number(),entitlement_ids:z.array(z.string()).optional()}).parse(req.body.event);
 if(!event.entitlement_ids?.includes('sukoon_plus'))return res.json({received:true,ignored:true});
 // Store cancellations through their paid expiry. Expiration / refunds end access.
 const expiry=['EXPIRATION','REFUND'].includes(event.type)?new Date(event.event_timestamp_ms):new Date(event.expiration_at_ms??event.event_timestamp_ms);
 const {error}=await db.rpc('apply_subscription_event',{p_event_id:event.id,p_owner:event.app_user_id,p_timestamp:event.event_timestamp_ms,p_expires:expiry.toISOString()});if(error)throw fail(500,'Could not update subscription.');res.json({received:true});
 }catch(e){next(e)}});
app.use(rateLimit({windowMs:60000,limit:50,standardHeaders:true,legacyHeaders:false}));
app.use(async(req,res,next)=>{try{if(!db)throw fail(503,'Configure Supabase to enable live features.');const token=req.get('authorization')?.replace(/^Bearer /,'');if(!token)throw fail(401,'Please sign in.');const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw fail(401,'Your session has expired. Please sign in.');req.owner=data.user.id;next();}catch(e){next(e)}});
async function rows(table,owner){const result=[];for(let start=0;;start+=500){const {data,error}=await db.from(table).select('*').eq('owner_id',owner).order('created_at',{ascending:true}).range(start,start+499);if(error)throw fail(500,'Could not read saved records.');result.push(...data);if(data.length<500)break;}return result;}
async function own(table,id,owner,required=true){const {data,error}=await db.from(table).select('*').eq('id',id).maybeSingle();if(error)throw fail(500,'Could not read this record.');if(data&&data.owner_id!==owner)throw fail(404,'Record not found.');if(required&&!data)throw fail(404,'Record not found.');return data;}
async function pref(owner){const {data,error}=await db.from('account_preferences').select('*').eq('owner_id',owner).maybeSingle();if(error)throw fail(500,'Could not read preferences.');return data;}
async function premium(owner){const {data,error}=await db.from('subscriptions').select('expires_at').eq('owner_id',owner).maybeSingle();if(error)throw fail(500,'Could not verify your plan.');return !!data?.expires_at&&Date.parse(data.expires_at)>Date.now();}
app.get('/account',async(req,res,next)=>{try{const [ps,rs,cs,p,plus]=await Promise.all([rows('profiles',req.owner),rows('health_records',req.owner),rows('care_sessions',req.owner),pref(req.owner),premium(req.owner)]);res.json({profiles:ps.map(x=>x.data),records:rs.map(x=>x.data),chats:cs.map(x=>x.data),premium:plus,language:p?.language??'Hinglish',consent:!!p?.consent_at});}catch(e){next(e)}});
app.post('/preferences',async(req,res,next)=>{try{const body=z.object({language:z.enum(['English','Hinglish']).optional(),consent:z.boolean().optional()}).parse(req.body);const old=await pref(req.owner);const {error}=await db.from('account_preferences').upsert({owner_id:req.owner,language:body.language??old?.language??'Hinglish',consent_at:body.consent?(old?.consent_at??new Date().toISOString()):null});if(error)throw fail(500,'Could not save preferences.');res.json({ok:true});}catch(e){next(e)}});
app.delete('/profiles/:id',async(req,res,next)=>{try{
 const id=z.uuid().parse(req.params.id);await own('profiles',id,req.owner);
 const {error}=await db.rpc('remove_family_member',{p_profile:id,p_owner:req.owner});
 if(error)throw fail(409,'Could not remove this profile. Finish any active chat and try again.');
 res.json({ok:true});void retryFileCleanup();
}catch(e){next(e)}});
app.post('/profiles',async(req,res,next)=>{try{const p=profileSchema.parse(req.body);await own('profiles',p.id,req.owner,false);const family=(await rows('profiles',req.owner)).map(x=>x.data);for(const id of p.parentIds){const parent=family.find(x=>x.id===id);if(!parent||parent.type!=='Adult'||parent.age<=p.age||createsCycle(p.id,id,family))throw fail(400,'Please check the biological parent relationships.');}
 const {error}=await db.from('profiles').upsert({id:p.id,owner_id:req.owner,data:p});if(error)throw fail(error.message.includes('plan')?403:400,error.message.includes('plan')?'Your free plan includes 2 adult and 3 child profiles. Upgrade to add more.':'Could not save profile. Check the family relationships.');res.json({ok:true});}catch(e){next(e)}});
app.post('/records',async(req,res,next)=>{try{const r=recordSchema.parse(req.body);await own('profiles',r.profileId,req.owner);await own('health_records',r.id,req.owner,false);if(r.chatId){const c=await own('care_sessions',r.chatId,req.owner);if(c.profile_id!==r.profileId)throw fail(400,'Follow-up must belong to the same profile.');}if(r.storagePath&&!r.storagePath.startsWith(`${req.owner}/${r.profileId}/`))throw fail(400,'Invalid file path.');const {error}=await db.from('health_records').upsert({id:r.id,owner_id:req.owner,profile_id:r.profileId,data:r});if(error)throw fail(500,'Could not save this record.');res.json({ok:true});}catch(e){next(e)}});
app.post('/ocr',rateLimit({windowMs:60000,limit:4}),async(req,res,next)=>{let worker;try{const body=z.object({profileId:z.uuid(),storagePath:z.string().max(500)}).parse(req.body);await own('profiles',body.profileId,req.owner);if(!body.storagePath.startsWith(`${req.owner}/${body.profileId}/`)||!/^.+\.(png|jpe?g)$/i.test(body.storagePath))throw fail(400,'Please use a PNG or JPEG image.');const {data,error}=await db.storage.from('medical-records').download(body.storagePath);if(error||!data)throw fail(404,'Document not found.');if(data.size>10*1024*1024)throw fail(400,'File is too large.');const {createWorker}=await import('tesseract.js');worker=await createWorker('eng');const {data:result}=await worker.recognize(Buffer.from(await data.arrayBuffer()));res.json({text:result.text.slice(0,30000),verified:false});}catch(e){next(e)}finally{if(worker)await worker.terminate()}});
app.post('/referrals',async(req,res,next)=>{try{const r=z.object({profileId:z.uuid(),triageColour:z.enum(['red','yellow','green']),kind:z.enum(['doctor','finance','pharmacy','lab'])}).parse(req.body);await own('profiles',r.profileId,req.owner);const {error}=await db.from('referral_clicks').insert({owner_id:req.owner,profile_id:r.profileId,triage_colour:r.triageColour,kind:r.kind});if(error)throw fail(500,'Could not record referral.');res.json({ok:true});}catch(e){next(e)}});

app.post('/chat',rateLimit({windowMs:60000,limit:15}),async(req,res,next)=>{
 let sessionId;let lockToken;let streamed=false;
 const emit=event=>{if(!res.destroyed)res.write(`data: ${JSON.stringify(event)}\n\n`)};
 try{
 const body=z.object({sessionId:z.uuid(),profileId:z.uuid(),text:z.string().trim().min(1).max(4000),weather:z.object({label:z.string().max(100),temperature:z.number().optional(),observedAt:z.iso.datetime().optional(),latitude:z.number().optional(),longitude:z.number().optional()}).nullable().optional()}).parse(req.body);sessionId=body.sessionId;
 const preferences=await pref(req.owner);if(!preferences?.consent_at)throw fail(403,'Please accept the care-chat notice first.');
 const p=(await own('profiles',body.profileId,req.owner)).data;
 let row=await own('care_sessions',sessionId,req.owner,false);if(row&&row.profile_id!==p.id)throw fail(400,'A chat cannot change profiles.');if(row?.data.endedAt)throw fail(409,'This assessment is complete. Start a new chat.');
 if(!row){const chat={id:sessionId,profileId:p.id,startedAt:new Date().toISOString(),messages:[],demo:false};const {error}=await db.from('care_sessions').insert({id:sessionId,owner_id:req.owner,profile_id:p.id,data:chat});if(error)throw fail(409,'Chat already started. Retry your message.');row={data:chat};}
 const {data:acquired,error:lockError}=await db.rpc('acquire_care_turn',{p_session:sessionId,p_owner:req.owner});if(lockError||!acquired)throw fail(409,'Another message is being processed. Please wait.');lockToken=acquired;
 // Re-read after lock acquisition: the server, not the device, owns the transcript.
 row=await own('care_sessions',sessionId,req.owner);if(row.data.endedAt)throw fail(409,'This assessment is complete. Start a new chat.');
 const messages=[...row.data.messages,{role:'user',content:body.text,at:new Date().toISOString()}];let reply;
 const replyLanguage=conversationLanguage(messages,preferences.language);
 res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();streamed=true;
 emit({type:'status',text:'Reviewing the health background…'});
 if(hasUrgentWords(body.text)||dangerAnswer(messages)){const urgent=emergencyFor(replyLanguage);reply={message:urgent.summary,options:[],triage_suggestion:urgent};}
 else {

 const [family,records,history]=await Promise.all([rows('profiles',req.owner),rows('health_records',req.owner),rows('care_sessions',req.owner)]);
 const recent=history.filter(x=>x.profile_id===p.id&&x.id!==sessionId).slice(-20).map(x=>({startedAt:x.data.startedAt,endedAt:x.data.endedAt,triage_suggestion:x.data.triage_suggestion,complaint:x.data.messages.find(m=>m.role==='user')?.content}));
 const relevantRecords=records.filter(x=>x.profile_id===p.id).map(x=>x.data).slice(-40);
 const weather=body.weather?.observedAt&&Math.abs(Date.now()-Date.parse(body.weather.observedAt))<2*3600000?body.weather:null;
 const clinicalReferences=searchClinicalReferences(messages);
 const context={clinicalReferences,answeredFollowups:answeredFollowups(messages),currentTime:new Date().toISOString(),currentConversationStartedAt:row.data.startedAt,profile:p,language:replyLanguage,familyHistory:ancestorFlags(p.id,family.map(x=>x.data)),records:relevantRecords,previousEncounters:recent,weather,historyWindow:{encounters:20,records:40,note:'Older records remain stored, but may not be in this context. Ask if important history is missing.'}};
 reply=await careReply({messages,context});
 if(reply.triage_suggestion)reply.triage_suggestion.references=referenceLinks(clinicalReferences);
 }
 emit({type:'status',text:reply.triage_suggestion?'Saving your care summary…':'Preparing the next question…'});
 const nextData={...row.data,messages:[...messages,{role:'assistant',content:reply.message,at:new Date().toISOString()}],...(reply.triage_suggestion?{triage_suggestion:reply.triage_suggestion,endedAt:new Date().toISOString()}: {})};
 const {data:committed,error}=await db.rpc('commit_care_turn',{p_session:sessionId,p_owner:req.owner,p_token:lockToken,p_data:nextData});if(error||!committed)throw fail(500,'Could not save this assessment. No completed result was issued.');lockToken=null;emit({type:'result',reply});res.end();
 }catch(e){if(streamed){emit({type:'error',message:e.status?e.message:'The care assistant could not complete this step. Please retry.'});res.end();}else next(e);}finally{if(lockToken&&sessionId)await db.rpc('release_care_turn',{p_session:sessionId,p_owner:req.owner,p_token:lockToken});}
});
app.use((error,req,res,_next)=>{if(res.headersSent)return;const validation=error instanceof z.ZodError;res.status(validation?400:error.status??500).json({error:validation?'Please check the information you entered.':error.status?error.message:'Something went wrong. Please try again.'});});
app.listen(Number(process.env.PORT??3001),'0.0.0.0',()=>console.log(`Sukoon API listening on port ${process.env.PORT??3001}. Storage ${db?'configured':'not configured'}.`));
