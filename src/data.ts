import { AppData, Profile } from './types';
const date = new Date().toISOString();
const base = { weight: '', blood: 'Not sure', allergies: [], conditions: [], medications: [], vaccines: '', hereditary: [], parentIds: [], createdAt: date };
export const seedProfiles: Profile[] = [
 { ...base, id:'meera', name:'Meera', age:36, gender:'Female', type:'Adult', avatar:0, relation:'Mum', weight:'62', blood:'B+', allergies:['Penicillin'], hereditary:['Thyroid'] },
 { ...base, id:'arjun', name:'Arjun', age:39, gender:'Male', type:'Adult', avatar:1, relation:'Dad', weight:'76', blood:'O+', hereditary:['Diabetes'] },
 { ...base, id:'kabir', name:'Kabir', age:9, gender:'Male', type:'Child', avatar:2, relation:'Son', weight:'28', blood:'B+', parentIds:['meera','arjun'], allergies:['Dust'] },
 { ...base, id:'tara', name:'Tara', age:5, gender:'Female', type:'Child', avatar:3, relation:'Daughter', weight:'18', blood:'O+', parentIds:['meera','arjun'] }
];
export const demoData: AppData = {profiles:seedProfiles, records:[], chats:[], premium:false, language:'Hinglish', consent:false};
export const emptyData: AppData = {profiles:[],records:[],chats:[],premium:false,language:'Hinglish',consent:false};
export const disclaimer = 'Sukoon is not a medical device and does not provide diagnoses. Always consult a qualified doctor.';
export const uid = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
export const relativeTime = (date: string) => { const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000)); return days===0?'Today':days===1?'Yesterday':`${days} days ago`; };
