import { emergencyTriage } from './policy.mjs';
import { pick } from './language.mjs';
export function emergencyFor(language) {
  if(language==='English')return emergencyTriage;
  const hi=language==='Hindi';
  return {
    colour:'red',title:hi?'अभी डॉक्टर की मदद लें':'Abhi doctor ki madad lein',
    summary:hi?'आपकी बात से लगता है कि तुरंत मदद की ज़रूरत हो सकती है। और सवालों का इंतज़ार न करें।':'Aapki baat se lagta hai ki turant madad ki zaroorat ho sakti hai. Aur sawalon ka intezaar na karein.',
    possibilities:[hi?'वजह जानने के लिए डॉक्टर को अभी सामने से जाँच करनी होगी।':'Wajah jaanne ke liye doctor ko abhi saamne se jaanch karni hogi.'],
    steps:hi?['भारत में 112 पर कॉल करें। दूसरे देश में वहाँ के मदद के नंबर पर कॉल करें।','किसी को अपने पास बुलाएँ और अस्पताल पहुँचने में मदद लें।','दवाओं की सूची और रिपोर्ट पास हों तो साथ ले जाएँ।']:['Bharat mein 112 par call karein. Doosre desh mein wahan ke madad ke number par call karein.','Kisi ko apne paas bulayein aur hospital pahunchne mein madad lein.','Dawaon ki list aur report paas hon toh saath le jayein.'],
    watchFor:[hi?'तकलीफ़ बढ़ने का इंतज़ार न करें।':'Takleef badhne ka intezaar na karein.'],
    doctor:hi?'अस्पताल की इमरजेंसी':'Hospital ki emergency',
    followup:hi?'मदद मिलने के बाद डॉक्टर की सलाह यहाँ जोड़ सकते हैं।':'Madad milne ke baad doctor ki salah yahan jod sakte hain.',
  };
}
export function sampleResult(language,concerning,child) {
  const t=(en,hi,hing)=>pick(language,en,hi,hing);
  return {
    colour:concerning?'yellow':'green',
    title:concerning?t('Keep an eye on it and speak to a doctor','ध्यान रखें और डॉक्टर से बात करें','Dhyan rakhein aur doctor se baat karein'):t('Some care at home','घर पर थोड़ी देखभाल','Ghar par thodi dekhbhal'),
    summary:t('This is a sample report, not a medical assessment of the symptoms you entered.','यह सिर्फ़ एक नमूना है। यह आपकी बताई परेशानी की डॉक्टर जैसी जाँच नहीं है।','Yeh sirf ek namoona hai. Yeh aapki batayi pareshani ki doctor jaisi jaanch nahi hai.'),
    possibilities:[t('The live assistant will talk about possible causes after asking more about how you feel.','असली सहायक आपकी परेशानी समझकर उसकी संभावित वजहें बताएगा।','Asli sahayak aapki pareshani samajhkar uski mumkin wajah batayega.'),t('This sample cannot tell you what illness you have.','यह नमूना नहीं बता सकता कि आपको कौन सी बीमारी है।','Yeh namoona nahi bata sakta ki aapko kaun si bimari hai.')],
    steps:[concerning?t('Speak to a doctor about your symptoms.','अपनी परेशानी के बारे में डॉक्टर से बात करें।','Apni pareshani ke baare mein doctor se baat karein.'):t('Rest and notice any changes in how you feel.','आराम करें और ध्यान रखें कि तकलीफ़ बदल तो नहीं रही।','Aaram karein aur dhyan rakhein ki takleef badal toh nahi rahi.'),t('Drink your usual fluids, unless your doctor has asked you to limit them.','पहले की तरह पानी पिएँ, जब तक डॉक्टर ने कम पानी पीने को न कहा हो।','Pehle ki tarah paani piyein, jab tak doctor ne kam paani peene ko na kaha ho.'),t('Ask a doctor or pharmacist before starting any medicine.','कोई दवा शुरू करने से पहले डॉक्टर या दवा देने वाले से पूछें।','Koi dawa shuru karne se pehle doctor ya dawa dene wale se poochhein.')],
    watchFor:[t('Get help right away for trouble breathing, chest pain, fainting or sudden weakness.','साँस लेने में दिक्कत, सीने में दर्द, बेहोशी या अचानक कमज़ोरी हो तो तुरंत मदद लें।','Saans lene mein dikkat, seene mein dard, behoshi ya achanak kamzori ho toh turant madad lein.'),t('Speak to a doctor if symptoms stay, get worse, or worry you.','तकलीफ़ बनी रहे, बढ़े या चिंता हो तो डॉक्टर से बात करें।','Takleef bani rahe, badhe ya chinta ho toh doctor se baat karein.')],
    doctor:child?t('Children’s doctor','बच्चों के डॉक्टर','Bachchon ke doctor'):t('Doctor','डॉक्टर','Doctor'),
    followup:t('You can add your doctor’s advice here after your visit.','डॉक्टर से मिलने के बाद उनकी सलाह यहाँ जोड़ सकते हैं।','Doctor se milne ke baad unki salah yahan jod sakte hain.'),
  };
}
