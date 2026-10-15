import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Appearance,StyleSheet,useColorScheme,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {darkPalette,lightPalette,resolveTheme,savedTheme,Palette,ThemeMode} from './palette';
export type {Palette,ThemeMode} from './palette';
const THEME_KEY='sukoon-appearance-v1';
const READING_KEY='sukoon-easy-reading-v1';
type ThemeValue={C:Palette;s:ReturnType<typeof createCommonStyles>;mode:ThemeMode;dark:boolean;setMode:(mode:ThemeMode)=>void;storageError:string;easyReading:boolean;setEasyReading:(enabled:boolean)=>void};
const ThemeContext=createContext<ThemeValue|null>(null);
export function ThemeProvider({children}:{children:React.ReactNode}){
 const [easyReading,setReadingPreference]=useState(false);
 const system=useColorScheme();const [mode,setPreference]=useState<ThemeMode>('system');const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState('');const writes=useRef(Promise.resolve());
 useEffect(()=>{let mounted=true;Promise.all([AsyncStorage.getItem(THEME_KEY),AsyncStorage.getItem(READING_KEY)]).then(([value,reading])=>{if(mounted){setPreference(savedTheme(value));setReadingPreference(reading==='true');}}).catch(()=>{if(mounted)setStorageError('Could not load your saved appearance.');}).finally(()=>{if(mounted)setReady(true)});return()=>{mounted=false}},[]);
 const dark=resolveTheme(mode,system)==='dark';const C=dark?darkPalette:lightPalette;const s=useMemo(()=>createCommonStyles(C,easyReading),[C,easyReading]);
 useEffect(()=>{if(!ready)return;Appearance.setColorScheme?.(mode==='system'?null:mode);SystemUI.setBackgroundColorAsync(C.bg).catch(()=>{});},[mode,C.bg,ready]);
 function setMode(next:ThemeMode){setPreference(next);setStorageError('');writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(THEME_KEY,next)).catch(()=>setStorageError('Appearance changed, but could not be saved. Please try again.'));}
 function setEasyReading(enabled:boolean){setReadingPreference(enabled);setStorageError('');writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(READING_KEY,String(enabled))).catch(()=>setStorageError('Easy reading changed, but could not be saved. Please try again.'));}
 const value=useMemo(()=>({C,s,mode,dark,setMode,storageError,easyReading,setEasyReading}),[C,s,mode,dark,storageError,easyReading]);
 return <ThemeContext.Provider value={value}>{ready?children:<View style={{flex:1,backgroundColor:C.bg}}/>}</ThemeContext.Provider>;
}
export function useTheme(){const theme=useContext(ThemeContext);if(!theme)throw new Error('useTheme requires ThemeProvider');return theme;}
function createCommonStyles(C:Palette,easyReading=false){return StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:12},
 h1:{fontSize:34,lineHeight:42,fontWeight:'600',letterSpacing:-.8,color:C.ink},
 h2:{fontSize:24,lineHeight:32,fontWeight:'600',letterSpacing:-.4,color:C.ink},
 h3:{fontSize:17,lineHeight:24,fontWeight:'600',color:C.ink,flexShrink:1},
 body:{fontSize:easyReading?18:15,lineHeight:easyReading?29:24,color:C.muted,flexShrink:1},
 eyebrow:{fontSize:12,lineHeight:18,fontWeight:'700',letterSpacing:1.2,color:C.green,textTransform:'uppercase',flexShrink:1},
 card:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:20,padding:20},
 label:{fontSize:easyReading?17:14,lineHeight:easyReading?26:20,fontWeight:'500',color:C.ink,flexShrink:1},
 input:{backgroundColor:C.input,borderWidth:1,borderColor:C.borderStrong,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:easyReading?18:16,lineHeight:easyReading?28:24,color:C.ink,minHeight:easyReading?60:52},
 inputFocused:{borderColor:C.green,backgroundColor:C.white},
 button:{backgroundColor:C.primary,paddingVertical:14,paddingHorizontal:20,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,minHeight:easyReading?60:52},
 buttonText:{fontWeight:'600',fontSize:easyReading?18:15,lineHeight:easyReading?27:22,color:C.onPrimary,textAlign:'center',flexShrink:1},
 secondary:{backgroundColor:'transparent',borderWidth:1,borderColor:C.borderStrong},
 tag:{borderWidth:1,borderColor:C.border,paddingVertical:10,paddingHorizontal:14,borderRadius:22,flexDirection:'row',alignItems:'center',gap:6,minHeight:48,maxWidth:'100%'},
 overlay:{flex:1,backgroundColor:C.overlay,alignItems:'center',justifyContent:'center',padding:20},
 modal:{backgroundColor:C.bg,borderRadius:24,padding:24,width:'100%',maxWidth:560,maxHeight:'94%',borderWidth:1,borderColor:C.border},
 traffic:{backgroundColor:C.subtle,borderWidth:1,borderColor:C.border,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:16},
 divider:{height:1,backgroundColor:C.border,marginVertical:24},
 link:{fontSize:easyReading?17:14,lineHeight:easyReading?26:21,fontWeight:'500',color:C.green,flexShrink:1},
 tiny:{fontSize:easyReading?16:12,lineHeight:easyReading?25:19,color:C.muted,flexShrink:1},
 empty:{paddingVertical:28,paddingHorizontal:16,alignItems:'center',gap:12},
 sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:16},
 wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
 notice:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:14,borderRadius:14,backgroundColor:C.errorBg,marginBottom:16},
 iconControl:{minWidth:48,minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center'},
});}
