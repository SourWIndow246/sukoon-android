import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { createClient } from '@supabase/supabase-js';
import { AppData, Chat, Profile, RecordItem, Reply } from './types';
import { emptyData } from './data';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL; const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const tokenStorage={ getItem:(k:string)=>SecureStore.getItemAsync(k),setItem:(k:string,v:string)=>SecureStore.setItemAsync(k,v),removeItem:(k:string)=>SecureStore.deleteItemAsync(k) };
export const supabase=url&&key?createClient(url,key,{auth:{storage:Platform.OS==='web'?AsyncStorage:tokenStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const isLive=!!supabase;
const api=process.env.EXPO_PUBLIC_API_URL??'http://localhost:3001';
export async function request(path:string,body?:unknown,method='POST') {
  const session=await supabase?.auth.getSession(); const token=session?.data.session?.access_token;
  if(!token)throw new Error('Please sign in to continue.');
  const r=await fetch(`${api}${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(method!=='GET'?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const error=await r.json().catch(()=>({error:'Connection interrupted. Please try again.'}));throw new Error(error.error??'Something went wrong.');}return r;
}
export async function loadAccount():Promise<AppData>{return {...emptyData,...await (await request('/account',undefined,'GET')).json()};}
export async function saveProfile(p:Profile){if(isLive)await request('/profiles',p);}
export async function saveRecord(r:RecordItem){if(isLive)await request('/records',r);}
export async function uploadFile(profileId:string,uri:string,name:string,mime:string){
  if(!supabase) return undefined;
  const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in.');
  const bytes=Platform.OS==='web'?await (await fetch(uri)).arrayBuffer():await new File(uri).arrayBuffer();
  const path=`${user.id}/${profileId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9.-]/g,'_')}`;
  const {error}=await supabase.storage.from('medical-records').upload(path,bytes,{contentType:mime,upsert:false});if(error)throw error;return path;
}
export async function liveReply(chat:Chat,text:string,weather:unknown,onStatus:(s:string)=>void):Promise<Reply>{
  // Structured events only: an incomplete model answer can never show a green light.
  const r=await request('/chat',{sessionId:chat.id,profileId:chat.profileId,text,weather});
  const parse=(s:string)=>{let result:Reply|undefined; for(const line of s.split('\n')) if(line.startsWith('data: ')){const event=JSON.parse(line.slice(6));if(event.type==='status')onStatus(event.text);if(event.type==='result')result=event.reply;if(event.type==='error')throw new Error(event.message);}return result;};
  if(!r.body?.getReader){const reply=parse(await r.text());if(!reply)throw new Error('No complete assessment received. Try again.');return reply;}
  const reader=r.body.getReader();const decoder=new TextDecoder();let buffer='';let final:Reply|undefined;
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n\n'))>=0){const part=buffer.slice(0,index);buffer=buffer.slice(index+2);final=parse(part)??final;}}
  final=parse(buffer)??final;if(!final)throw new Error('Connection interrupted. No assessment was completed.');return final;
}
