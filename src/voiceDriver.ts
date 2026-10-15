import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { speechLocale } from './language.mjs';
import { recognitionOptions, recognizeTurn } from './voiceRecognition.mjs';

let installedAutoLocales:Promise<string[]>|undefined;


export async function createVoiceDriver(signal:AbortSignal, automatic=false) {
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
  if(automatic&&Platform.OS==='android'&&Number(Platform.Version)>=34&&!installedAutoLocales) {
    installedAutoLocales=recognizer.getSupportedLocales({androidRecognitionServicePackage:'com.google.android.as'})
      .then(({installedLocales})=>{
        const en=installedLocales.find(l=>/^en[-_]/i.test(l));
        const hi=installedLocales.find(l=>/^hi[-_]/i.test(l));
        return en&&hi?[en.replace('_','-'),hi.replace('_','-')]:[];
      }).catch(()=>[]);
  }
  // Bound capability discovery so unsupported phones don't delay every turn.
  const autoLocales:string[]=automatic&&installedAutoLocales?await new Promise(resolve=>{
    const timer=setTimeout(()=>resolve([]),800);
    installedAutoLocales!.then(locales=>{clearTimeout(timer);resolve(locales);});
  }):[];
  let voicesPromise:ReturnType<typeof Speech.getAvailableVoicesAsync>|undefined;
  return {
    automatic: autoLocales.length===2,
    listen:(language:string,abort:AbortSignal,onPartial:(text:string)=>void)=>recognizeTurn(recognizer,recognitionOptions(language,autoLocales),abort,onPartial),
    speak:async(text:string,language:string,abort:AbortSignal)=>{
      const locale=speechLocale(language);
      const voices=await (voicesPromise??=Speech.getAvailableVoicesAsync());
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
          try {Speech.speak(chunk,{language:locale,...(voice?{voice:voice.identifier}:{}),rate:1.05,onDone:()=>finish(),onStopped:()=>finish('aborted'),onError:()=>finish('speech-error')});}
          catch {finish('speech-error');}
        });
      }
    },
  };
}
