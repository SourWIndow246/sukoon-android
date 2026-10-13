import { MIN_FOLLOWUPS, nextQuestion } from '../src/assessment.mjs';
import { z } from 'zod';
export const list=z.array(z.string().trim().min(1).max(1000)).max(60);
export const profileSchema=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),age:z.number().min(0).max(120),gender:z.string().max(40),type:z.enum(['Adult','Child']),avatar:z.number().int().min(0).max(5),weight:z.string().max(10),blood:z.string().max(20),allergies:list,conditions:list,medications:list,vaccines:z.string().max(6000),hereditary:list,parentIds:z.array(z.uuid()).max(2),relation:z.string().max(40),createdAt:z.iso.datetime()}).refine(p=>p.type==='Adult'?p.age>=18:p.age<18,'Age must match Adult or Child').refine(p=>!p.weight||(Number(p.weight)>0&&Number(p.weight)<=400),'Invalid weight');
export const recordSchema=z.object({id:z.uuid(),profileId:z.uuid(),name:z.string().trim().min(1).max(200),date:z.iso.date(),doctor:z.string().max(150),diagnosis:z.string().max(3000),medications:z.string().max(3000),notes:z.string().max(30000),kind:z.enum(['record','followup']),chatId:z.uuid().optional(),storagePath:z.string().max(500).optional(),createdAt:z.iso.datetime()});
export const triageSchema=z.object({colour:z.enum(['green','yellow','red']),title:z.string().min(1).max(200),summary:z.string().min(1).max(3000),possibilities:z.array(z.string().min(1).max(1000)).min(1).max(8).refine(items=>new Set(items.map(v=>v.trim().toLowerCase())).size===items.length,'Duplicate possibilities'),steps:z.array(z.string().min(1).max(1000)).min(1).max(10),watchFor:z.array(z.string().min(1).max(1000)).min(1).max(10),doctor:z.string().max(200),followup:z.string().max(1000)});
export const replySchema=z.object({message:z.string().min(1).max(6000),options:z.array(z.string().max(160)).max(4),triage_suggestion:triageSchema.optional()});
export function safeReply(reply,userTurns,language='English',confirmedEmergency=false){
 const r=replySchema.parse(reply);
 // Emergency care must never wait for the minimum interview length.
 if(userTurns<=MIN_FOLLOWUPS && !(confirmedEmergency && r.triage_suggestion?.colour==='red')) return nextQuestion(userTurns,language);
 if(r.triage_suggestion)r.options=[];
 return r;
}
