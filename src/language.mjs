export const languages = ['English', 'Hindi', 'Hinglish'];
export function detectLanguage(text, fallback = 'English') {
  if (/[\u0900-\u097f]/u.test(text)) return 'Hindi';
  if (/\b(mujhe|mujko|mere|mera|meri|hum|aap|aaj|kal|hai|hain|hoon|hua|hui|raha|rahi|nahi|nahin|haan|han|ji|dard|bukhar|chakkar|saans|ulti|khansi|pet|pait|batao|theek|thik|bahut|zyada|kuch|kab|kaise|paani|pani|dawai|dava|achha|accha|kamzori|bilkul|sirf|samajh|pata|din|se|takleef|kahan|kaam|aaram|sab|pehle|jaisa|aisi|waisi|batata|batati)\b/i.test(text)) return 'Hinglish';
  // Short answers, numbers and punctuation alone do not establish a new language.
  if (/^(?:\s|[\d.,°%-]|yes|no|ok|okay|hmm|none)+$/i.test(text)) return fallback;
  if (/[a-z]{2}/i.test(text)) return 'English';
  return fallback;
}
export function conversationLanguage(messages, fallback = 'English') {
  return messages.filter(m=>m.role==='user').reduce((lang,m)=>detectLanguage(m.content,lang),fallback);
}
export const speechLocale = language => language === 'English' ? 'en-IN' : 'hi-IN';
export const pick = (language, english, hindi, hinglish) => language==='Hindi'?hindi:language==='Hinglish'?hinglish:english;
export function voiceCopy(language) {
  return {
    start:pick(language,'Start voice chat','बोलकर बात करें','Bolkar baat karein'),
    stop:pick(language,'Stop voice chat','आवाज़ बंद करें','Awaaz band karein'),
    listening:pick(language,'Listening…','सुन रहे हैं…','Sun rahe hain…'),
    thinking:pick(language,'One moment…','एक पल…','Ek pal…'),
    speaking:pick(language,'Speaking…','जवाब सुनिए…','Jawab suniye…'),
    starting:pick(language,'Starting microphone…','माइक शुरू हो रहा है…','Mic shuru ho raha hai…'),
    notice:pick(language,'Voice messages send when you finish speaking. Your device’s speech service may process audio online. Tap again to stop.', 'बोलना खत्म करने पर आपकी बात भेज दी जाएगी। फ़ोन या ब्राउज़र की आवाज़ सेवा इंटरनेट पर आपकी आवाज़ सुन सकती है। बंद करने के लिए फिर दबाएँ।', 'Bolna khatam karne par aapki baat bhej di jayegi. Phone ya browser ki awaaz service internet par aapki awaaz sun sakti hai. Band karne ke liye phir dabayein.'),
    permission:pick(language,'Allow microphone access to use voice chat. You can still type.', 'बोलकर बात करने के लिए माइक की अनुमति दें। आप लिखकर भी बात कर सकते हैं।','Bolkar baat karne ke liye mic ki permission dein. Aap likhkar bhi baat kar sakte hain.'),
    unavailable:pick(language,'Voice is unavailable here. Try Chrome or Edge, or use the updated phone app. You can still type.', 'यहाँ बोलकर बात करने की सुविधा नहीं है। Chrome, Edge या नया फ़ोन ऐप आज़माएँ। आप लिखकर बात कर सकते हैं।','Yahan bolkar baat karne ki suvidha nahi hai. Chrome, Edge ya naya phone app aazmayein. Aap likhkar baat kar sakte hain.'),
    noSpeech:pick(language,'I didn’t catch that. Tap the microphone to try again, or type.', 'आपकी बात सुनाई नहीं दी। फिर से माइक दबाएँ या लिखकर बताएँ।','Aapki baat sunai nahi di. Phir se mic dabayein ya likhkar batayein.'),
    error:pick(language,'Voice stopped. Please check your connection and microphone, then try again. You can still type.', 'आवाज़ बंद हो गई। इंटरनेट और माइक जाँचकर फिर कोशिश करें। आप लिखकर भी बात कर सकते हैं।','Awaaz band ho gayi. Internet aur mic check karke phir koshish karein. Aap likhkar bhi baat kar sakte hain.'),
  };
}
