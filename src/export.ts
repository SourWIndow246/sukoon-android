import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppData, Profile } from './types';
import { disclaimer } from './data';
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function exportHistory(p:Profile,data:AppData){
 const chats=data.chats.filter(c=>c.profileId===p.id); const records=data.records.filter(r=>r.profileId===p.id);
 const text=`SUKOON — Health history\n${p.name} · ${p.age} years · ${p.gender}\nGenerated: ${new Date().toLocaleString()}\n${disclaimer}\n\nAllergies: ${p.allergies.join(', ')||'Not recorded'}\nConditions: ${p.conditions.join(', ')||'Not recorded'}\nMedicines: ${p.medications.join(', ')||'Not recorded'}\n\nMEDICAL RECORDS (user-entered; not verified)\n${records.map(r=>`${r.date} · ${r.name}\nDoctor: ${r.doctor}\nDoctor-reported finding: ${r.diagnosis}\nMedications: ${r.medications}\nNotes: ${r.notes}`).join('\n\n')}\n\nASSESSMENT HISTORY\n${chats.map(c=>`${new Date(c.startedAt).toLocaleString()}${c.demo?' — DEMO, not a clinical assessment':''}\n${c.triage_suggestion?`${c.triage_suggestion.colour.toUpperCase()}: ${c.triage_suggestion.title}\n${c.triage_suggestion.summary}\nSymptom references: ${(c.triage_suggestion.references??[]).map(r=>r.url).join('; ')}\nNext steps: ${c.triage_suggestion.steps.join('; ')}`:'Assessment incomplete'}\n${c.messages.map(m=>`${m.role==='user'?'Family':'Sukoon'}: ${m.content}`).join('\n')}`).join('\n\n')}`;
 if(Platform.OS==='web'){
   const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Sukoon-${p.name.replace(/[^a-zA-Z0-9]/g,'-')}-history.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 const {uri}=await Print.printToFileAsync({html:`<html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:30px;color:#183f33}h1{color:#0f6e56}pre{white-space:pre-wrap;font:13px/1.6 Arial}</style></head><body><h1>Sukoon · Health history</h1><pre>${escape(text)}</pre></body></html>`});
 if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:'application/pdf',dialogTitle:'Share health history with your doctor'});else await Share.share({message:text});
}
