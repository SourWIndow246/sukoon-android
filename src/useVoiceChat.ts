import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { createVoiceDriver } from './voiceDriver';
import { runVoiceSession } from './voiceSession.mjs';
import { waitForVoiceForeground } from './voiceLifecycle.mjs';
import { voiceCopy, pick } from './language.mjs';
import type { Reply } from './types';

type VoiceState='off'|'starting'|'listening'|'thinking'|'speaking';
export function useVoiceChat({context,language,inputLanguage,onTurn}:{context:string|null;language:string;inputLanguage:string;onTurn:(text:string)=>Promise<Reply|undefined>}) {
  const [state,setState]=useState<VoiceState>('off');
  const [recognitionLanguage,setRecognitionLanguage]=useState('Auto');
  const [automatic,setAutomatic]=useState(false);
  const [partial,setPartial]=useState('');const [error,setError]=useState('');
  const current=useRef({language,inputLanguage,onTurn});current.current={language,inputLanguage,onTurn};
  const session=useRef<AbortController|null>(null);
  const preparing=useRef<AbortController|null>(null);
  const stop=()=>{session.current?.abort();session.current=null;setState('off');setPartial('');};
  useEffect(()=>{
    // Android's microphone permission dialog temporarily deactivates the app.
    const sub=AppState.addEventListener('change',s=>{if(s!=='active'&&preparing.current!==session.current)stop();});
    const hide=()=>{if(document.hidden)stop();};
    if(Platform.OS==='web')document.addEventListener('visibilitychange',hide);
    return()=>{stop();sub.remove();if(Platform.OS==='web')document.removeEventListener('visibilitychange',hide);};
  },[context]);
  const toggle=async(mode=recognitionLanguage)=>{
    if(session.current){stop();return;}
    if(!context)return;
    const controller=new AbortController();session.current=controller;setState('starting');setError('');
    try {
      preparing.current=controller;
      const driver=await createVoiceDriver(controller.signal,mode==='Auto');
      if(!controller.signal.aborted)setAutomatic(driver.automatic);
      if(Platform.OS!=='web')await waitForVoiceForeground({signal:controller.signal,getState:()=>AppState.currentState,subscribe:(listener:(state:string)=>void)=>AppState.addEventListener('change',listener)});
      if(preparing.current===controller)preparing.current=null;
      if(controller.signal.aborted)return;
      if(Platform.OS!=='web'&&AppState.currentState==='background'){stop();return;}
      await runVoiceSession({signal:controller.signal,...driver,
        listen:(_language:string,signal:AbortSignal,onPartial:(text:string)=>void)=>driver.listen(mode==='Auto'?current.current.inputLanguage:mode,signal,onPartial),
        send:(text:string)=>current.current.onTurn(text),getLanguage:()=>current.current.language,
        onState:(value:VoiceState)=>setState(value),onPartial:(text:string)=>setPartial(text),
      });
    } catch(e) {
      if(!controller.signal.aborted) {
        const copy=voiceCopy(current.current.language);const code=e instanceof Error?e.message:'';
        setError(code==='not-allowed'?copy.permission:code==='no-speech'?copy.noSpeech:code==='language-not-supported'?pick(current.current.language,'This voice language is not installed. Add it in your device’s speech settings, or type.','इस भाषा की आवाज़ उपलब्ध नहीं है। फ़ोन की आवाज़ सेटिंग में इसे जोड़ें या लिखकर बताएँ।','Is bhasha ki awaaz nahi hai. Phone ki awaaz settings mein ise jodein ya likhkar batayein.'):code==='unavailable'||code.includes('native module')?copy.unavailable:copy.error);
      }
    } finally {
      if(preparing.current===controller)preparing.current=null;
      if(session.current===controller){controller.abort();session.current=null;setState('off');setPartial('');}
    }
  };
  const chooseLanguage=(mode:string)=>{const restart=!!session.current;stop();setRecognitionLanguage(mode);setError('');if(restart)void toggle(mode);};
  return {recognitionLanguage,chooseLanguage,automatic,enabled:state!=='off',state,partial,error,toggle,stop};
}
