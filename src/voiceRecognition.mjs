import { conversationLanguage, speechLocale } from './language.mjs';

// A saved Hinglish preference is not evidence that the next speaker uses Hindi.
export const initialVoiceLanguage = messages => conversationLanguage(messages, 'English');

export function recognitionOptions(language, autoLocales = []) {
  const options = {lang:speechLocale(language), interimResults:true, continuous:false, maxAlternatives:1, recordingOptions:{persist:false}};
  if(autoLocales.length === 2) {
    options.lang = autoLocales.find(locale=>locale.startsWith(options.lang.slice(0,2))) ?? autoLocales[0];
    options.androidRecognitionServicePackage = 'com.google.android.as';
    options.requiresOnDeviceRecognition = true;
    options.androidIntentOptions = {
      EXTRA_ENABLE_LANGUAGE_DETECTION:true,
      EXTRA_ENABLE_LANGUAGE_SWITCH:'balanced',
      EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES:autoLocales,
      EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES:autoLocales,
    };
  }
  return options;
}

// Final results are ready to send; some services delay their separate end event.
// Never submit an interim transcript on silence or an error.
export function recognizeTurn(recognizer, options, signal, onPartial) {
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('aborted'));return;}
    let settled=false;
    const listeners=[];
    const finish=(error,text='')=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      listeners.forEach(listener=>listener.remove());
      signal.removeEventListener('abort',cancel);
      // Release the mic before starting the request or speech playback.
      try {recognizer.abort();} catch {}
      error?reject(new Error(error)):resolve(text);
    };
    const cancel=()=>finish('aborted');
    const timer=setTimeout(()=>finish('no-speech'),45000);
    signal.addEventListener('abort',cancel,{once:true});
    listeners.push(recognizer.addListener('result',event=>{
      if(settled||signal.aborted)return;
      const text=event.results[0]?.transcript??'';
      onPartial(text);
      if(event.isFinal)finish(text.trim()?undefined:'no-speech',text);
    }));
    listeners.push(recognizer.addListener('end',()=>finish('no-speech')));
    listeners.push(recognizer.addListener('error',event=>finish(event.error)));
    try {recognizer.start(options);} catch {finish('unavailable');}
  });
}
