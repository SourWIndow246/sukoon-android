// Localized sample questions for offline demo only; live interviews are adaptive.
export const questions = [
  {message:"Are there any emergency warning signs now: great trouble breathing, chest pain that won't go away, fainting, sudden weakness on one side, or bleeding that won't stop?",options:['None of these','Yes · one of these','Not sure']},
  {message:'When did this start? Did it come on all at once or slowly?',options:[]},
  {message:'Where do you feel the problem, and what does it feel like?',options:[]},
  {message:'How bad is it? Can you do your usual daily tasks?',options:['Mild · usual activities okay','Moderate · resting more','Severe · cannot manage']},
  {message:'Since it began, is it improving, staying the same, or getting worse?',options:['Improving','Staying the same','Getting worse','Not sure']},
  {message:'Have you noticed anything else, such as a fever or being sick?',options:['No other symptoms','I will describe them','Not sure']},
  {message:'How are drinking, eating and passing urine compared with usual?',options:['All as usual','Drinking or eating less','Much less urine','Not sure']},
  {message:'Do you have any health problems, take medicines, or have allergies? Tell us about any recent injury, pregnancy or childbirth too.',options:['No known additional history','I will describe it','Not sure']},
];
const q=(message,options=[])=>({message,options});
export const questionBanks = {
  English:questions,
  Hindi:[
    q('क्या अभी साँस लेने में बहुत दिक्कत, सीने में लगातार दर्द, बेहोशी, शरीर की एक तरफ अचानक कमज़ोरी या खून बहना बंद न होने जैसी कोई बात है?',['इनमें से कुछ नहीं','हाँ · इनमें से कोई बात है','पता नहीं']),
    q('यह कब शुरू हुआ? अचानक हुआ या धीरे-धीरे?'),
    q('तकलीफ़ कहाँ है और कैसी लग रही है?'),
    q('तकलीफ़ कितनी है? क्या रोज़ के काम कर पा रहे हैं?',['हल्की · काम कर पा रहे हैं','थोड़ी ज़्यादा · आराम चाहिए','बहुत ज़्यादा · काम नहीं हो रहे']),
    q('शुरू होने के बाद से तकलीफ़ कम हुई, वैसी ही है या बढ़ रही है?',['कम हो रही है','वैसी ही है','बढ़ रही है','पता नहीं']),
    q('इसके अलावा बुखार, उल्टी या कोई और परेशानी है?',['और कोई परेशानी नहीं','बताता हूँ','पता नहीं']),
    q('खाना, पानी पीना और पेशाब पहले की तरह हो रहा है?',['सब पहले जैसा','खाना या पानी कम है','पेशाब बहुत कम है','पता नहीं']),
    q('कोई पुरानी बीमारी, दवा या एलर्जी है? हाल की चोट, गर्भ में बच्चा होने या हाल में बच्चा पैदा होने की बात भी बताएँ।',['ऐसी कोई बात नहीं','बताता हूँ','पता नहीं']),
  ],
  Hinglish:[
    q('Kya abhi saans lene mein bahut dikkat, seene mein lagataar dard, behoshi, shareer ki ek taraf achanak kamzori, ya khoon behna band na hone jaisi koi baat hai?',['Inmein se kuch nahi','Haan · inmein se koi baat hai','Pata nahi']),
    q('Yeh kab shuru hua? Achanak hua ya dheere-dheere?'),
    q('Takleef kahan hai aur kaisi lag rahi hai?'),
    q('Takleef kitni hai? Kya roz ke kaam kar paa rahe hain?',['Halki · kaam ho rahe hain','Thodi zyada · aaram chahiye','Bahut zyada · kaam nahi ho rahe']),
    q('Shuru hone ke baad se takleef kam hui, waisi hi hai ya badh rahi hai?',['Kam ho rahi hai','Waisi hi hai','Badh rahi hai','Pata nahi']),
    q('Iske alawa bukhar, ulti ya koi aur pareshani hai?',['Aur koi pareshani nahi','Batata hoon','Pata nahi']),
    q('Khana, paani peena aur peshab pehle ki tarah ho raha hai?',['Sab pehle jaisa','Khana ya paani kam hai','Peshab bahut kam hai','Pata nahi']),
    q('Koi purani bimari, dawa ya allergy hai? Haal ki chot, pet mein bachcha hone ya haal mein bachcha paida hone ki baat bhi batayein.',['Aisi koi baat nahi','Batata hoon','Pata nahi']),
  ],
};
export function nextQuestion(userTurns, language='English') {
  const bank=questionBanks[language]??questions;
  return bank[Math.min(Math.max(userTurns - 1, 0), bank.length - 1)];
}
export function answeredFollowups(messages) {
  // Initial complaint is not a follow-up. Only count answers to saved assistant turns.
  let complaintSeen=false; let count=0;
  messages.forEach((m,i)=>{if(m.role!=='user')return;if(complaintSeen&&messages[i-1]?.role==='assistant')count++;complaintSeen=true;});
  return count;
}
export function dangerAnswer(messages) {
  const last=messages.at(-1);
  return last?.role==='user' && Object.values(questionBanks).some(bank=>messages.at(-2)?.content===bank[0].message && [bank[0].options[1].toLowerCase(), 'yes', 'haan', 'हाँ'].includes(last.content.trim().toLowerCase()));
}

// A vague opening is not evidence for any triage colour.
export function clarifyOpening(messages,language='English') {
 const users=messages.filter(m=>m.role==='user');
 if(users.length!==1||!/^\s*(?:i have (?:one of (?:this|these) problems?|a problem)|help|hello|hi)[.!?]*\s*$/i.test(users[0].content))return null;
 return {message:language==='Hindi'?'आपको क्या परेशानी हो रही है?':language==='Hinglish'?'Aapko kya pareshani ho rahi hai?':'What problem are you having?',options:[]};
}
