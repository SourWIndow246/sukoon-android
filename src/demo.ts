import type { Chat, Profile, Reply, Triage } from './types';
import { hasUrgentWords } from './policy.mjs';
import { questions, nextQuestion, dangerAnswer } from './assessment.mjs';
import { conversationLanguage, pick } from './language.mjs';
import { emergencyFor, sampleResult } from './careCopy.mjs';
export function demoReply(chat: Chat, profile: Profile, fallback: string): Reply {
  const answers=chat.messages.filter(m=>m.role==='user'); const last=answers.at(-1)?.content??'';
  const language=conversationLanguage(chat.messages,fallback);
  if(hasUrgentWords(last)||dangerAnswer(chat.messages)) {
    const triage=emergencyFor(language) as Triage;
    return {message:triage.summary,options:[],triage_suggestion:triage};
  }
  if(answers.length<=questions.length) return nextQuestion(answers.length,language);
  const all=answers.map(x=>x.content).join(' ');
  const concerning=/severe|more than 3|moderate|not sure|fever|bukhar|vomit|ulti|pata nahi|zyada|badh rahi|पता नहीं|ज़्यादा|बढ़ रही|बुखार|उल्टी/i.test(all)||profile.conditions.length>0;
  return {message:pick(language,'Your sample care summary is ready below.','आपकी देखभाल का नमूना नीचे है।','Aapki dekhbhal ka namoona neeche hai.'),options:[],triage_suggestion:sampleResult(language,concerning,profile.type==='Child') as Triage};
}
