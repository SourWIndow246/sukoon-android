import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { speechLocale } from './language.mjs';

export async function createVoiceDriver(signal:AbortSignal) {
  // Lazy import keeps text chat usable in older native builds without this module.
  const { ExpoSpeechRecognitionModule:recognizer }=await import('expo-speech-recognition');
  if(signal.aborted)throw new Error('aborted');
  if(!recognizer.isRecognitionAvailable())throw new Error('unavailable');
  if(Platform.OS==='web'&&!(globalThis as any).speechSynthesis)throw new Error('unavailable');
  if(Platform.OS!=='web') {
    const permission=await recognizer.requestPermissionsAsync();
    if(signal.aborted)throw new Error('aborted');
    if(!permission.granted)throw new Error('not-allowed');
  }
  return {
    listen:(language:string,abort:AbortSignal,onPartial:(text:string)=>void)=>new Promise<string>((resolve,reject)=>{
      if(abort.aborted){reject(new Error('aborted'));return;}
      let finalText='';let settled=false;
      const listeners:{remove:()=>void}[]=[];
      const cleanup=()=>{listeners.forEach(l=>l.remove());clearTimeout(timer);abort.removeEventListener('abort',cancel);};
      const finish=(error?:string)=>{if(settled)return;settled=true;cleanup();error?reject(new Error(error)):resolve(finalText);};
      const cancel=()=>{finish('aborted');recognizer.abort();};
      const timer=setTimeout(()=>{finish('no-speech');recognizer.abort();},45000);
      abort.addEventListener('abort',cancel,{once:true});
      listeners.push(recognizer.addListener('result',event=>{
        if(settled||abort.aborted)return;
        const text=event.results[0]?.transcript??'';
        onPartial(text);
        if(event.isFinal)finalText=text;
      }));
      listeners.push(recognizer.addListener('end',()=>finish(finalText?undefined:'no-speech')));
      listeners.push(recognizer.addListener('error',event=>finish(event.error)));
      try {recognizer.start({lang:speechLocale(language),interimResults:true,continuous:false,maxAlternatives:1,recordingOptions:{persist:false}});}
      catch {finish('unavailable');}
    }),
    speak:async(text:string,language:string,abort:AbortSignal)=>{
      const locale=speechLocale(language);
      const voices=await Speech.getAvailableVoicesAsync();
      if(abort.aborted)return;
      const normalized=(value:string)=>value.replace(/_/g,'-').toLowerCase();
      const voice=voices.find(v=>normalized(v.language)===normalized(locale))??voices.find(v=>normalized(v.language).startsWith(locale.slice(0,2)));
      // Do not silently read Hindi with an English voice.
      if(voices.length&&!voice)throw new Error('language-not-supported');
      const chunks=text.match(/[\s\S]{1,250}(?:\s|$)|[\s\S]{1,250}/g)??[];
      for(const chunk of chunks) {
        if(abort.aborted)return;
        await new Promise<void>((resolve,reject)=>{
          let settled=false;
          const finish=(error?:string)=>{if(settled)return;settled=true;clearTimeout(timer);abort.removeEventListener('abort',cancel);error?reject(new Error(error)):resolve();};
          const cancel=()=>{void Speech.stop();finish('aborted');};
          const timer=setTimeout(()=>{void Speech.stop();finish('speech-timeout');},90000);
          abort.addEventListener('abort',cancel,{once:true});
          try {Speech.speak(chunk,{language:locale,...(voice?{voice:voice.identifier}:{}),rate:0.95,onDone:()=>finish(),onStopped:()=>finish('aborted'),onError:()=>finish('speech-error')});}
          catch {finish('speech-error');}
        });
      }
    },
  };
}
