import type { Chat, Profile, Reply, Triage } from './types';
import { hasUrgentWords, emergencyTriage } from './policy.mjs';
export function demoReply(chat: Chat, profile: Profile, language: string): Reply {
  const answers=chat.messages.filter(m=>m.role==='user'); const last=answers.at(-1)?.content??'';
  if(hasUrgentWords(last)) return {message:emergencyTriage.summary, options:[],triage_suggestion:emergencyTriage as Triage};
  const hi=language==='Hinglish';
  const questions=[
    {message:hi?'Samajh gaya. Yeh kab se ho raha hai? Aaj shuru hua, ya kuch din se?':'I understand. When did this start — today, or a few days ago?',options:['Since today','1–2 days','More than 3 days']},
    {message:hi?'Takleef kitni hai? Kya normal kaam kar paa rahe hain, aur paani pee rahe hain?':'How much is it affecting everyday activities? Are they able to drink and do their usual activities?',options:['Mild · usual activities okay','Moderate · resting more','Severe · cannot manage']},
    {message:hi?'Ek zaroori sawaal: saans lene mein bahut dikkat, seene mein dard, behoshi, ya achanak kamzori toh nahi?':'One important check: any severe trouble breathing, chest pain, fainting, or sudden weakness?',options:['None of these','Yes · one of these','I’m not sure']},
    {message:hi?'Aur koi naya symptom, bukhar, ulti, ya nayi medicine? Apne shabdon mein bataiye.':'Any other new symptoms, a measured fever, vomiting, or new medicine? Tell me in your own words.',options:['No other symptoms','There are other symptoms','Not sure']}
  ];
  if(answers.length===4 && /^Yes/.test(last)) return {message:emergencyTriage.summary,options:[],triage_suggestion:emergencyTriage as Triage};
  if(answers.length<=questions.length) return questions[answers.length-1];
  const all=answers.map(x=>x.content).join(' ');
  const concerning=/severe|more than 3|moderate|not sure|fever|bukhar|vomit|ulti/i.test(all)||/^There are other/.test(last)||profile.conditions.length>0;
  const triage:Triage = {colour:concerning?'yellow':'green',title:concerning?'Observe & arrange a check-in':'A little care at home',
    summary:'This is a sample report showing how Sukoon’s assessment will look. It is not a medical assessment of the symptoms you entered.',
    possibilities:['Live AI will discuss possible explanations after a fuller assessment.','No diagnosis or numerical probability is calculated in this demo.'],
    steps:concerning?['Arrange a conversation with a qualified clinician.','Note changes in symptoms and any measured temperature.','Keep your usual medication list ready for your doctor.']:['Rest and keep a note of how you feel.','Drink your usual fluids, unless your doctor has restricted them.','Check with a clinician or pharmacist before starting medication.'],
    watchFor:['Seek urgent care for breathing difficulty, chest pain, fainting, or sudden weakness.','Contact a clinician if symptoms persist, worsen, or concern you.'],doctor:profile.type==='Child'?'Paediatrician':'General physician',followup:'Upload the doctor’s advice after your visit to keep your history up to date.'};
  return {message:'Thank you for taking the time. Your sample care summary is ready below.',options:[],triage_suggestion:triage};
}
