import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Appearance,StyleSheet,useColorScheme,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {darkPalette,lightPalette,resolveTheme,savedTheme,Palette,ThemeMode} from './palette';
export type {Palette,ThemeMode} from './palette';
const THEME_KEY='sukoon-appearance-v1';
type ThemeValue={C:Palette;s:ReturnType<typeof createCommonStyles>;mode:ThemeMode;dark:boolean;setMode:(mode:ThemeMode)=>void;storageError:string};
const ThemeContext=createContext<ThemeValue|null>(null);
export function ThemeProvider({children}:{children:React.ReactNode}){
 const system=useColorScheme();const [mode,setPreference]=useState<ThemeMode>('system');const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState('');const writes=useRef(Promise.resolve());
 useEffect(()=>{let mounted=true;AsyncStorage.getItem(THEME_KEY).then(value=>{if(mounted)setPreference(savedTheme(value));}).catch(()=>{if(mounted)setStorageError('Could not load your saved appearance.');}).finally(()=>{if(mounted)setReady(true)});return()=>{mounted=false}},[]);
 const dark=resolveTheme(mode,system)==='dark';const C=dark?darkPalette:lightPalette;const s=useMemo(()=>createCommonStyles(C),[C]);
 useEffect(()=>{if(!ready)return;Appearance.setColorScheme?.(mode==='system'?null:mode);SystemUI.setBackgroundColorAsync(C.bg).catch(()=>{});},[mode,C.bg,ready]);
 function setMode(next:ThemeMode){setPreference(next);setStorageError('');writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(THEME_KEY,next)).catch(()=>setStorageError('Appearance changed, but could not be saved. Please try again.'));}
 const value=useMemo(()=>({C,s,mode,dark,setMode,storageError}),[C,s,mode,dark,storageError]);
 return <ThemeContext.Provider value={value}>{ready?children:<View style={{flex:1,backgroundColor:C.bg}}/>}</ThemeContext.Provider>;
}
export function useTheme(){const theme=useContext(ThemeContext);if(!theme)throw new Error('useTheme requires ThemeProvider');return theme;}
function createCommonStyles(C:Palette){return StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:12},h1:{fontSize:36,lineHeight:44,fontWeight:'600',letterSpacing:-1.3,color:C.ink},h2:{fontSize:24,fontWeight:'600',letterSpacing:-.6,color:C.ink},h3:{fontSize:17,fontWeight:'600',color:C.ink},body:{fontSize:15,lineHeight:24,color:C.muted},eyebrow:{fontSize:11,fontWeight:'700',letterSpacing:2,color:C.green,textTransform:'uppercase'},card:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:22,padding:24},label:{fontSize:13,fontWeight:'600',color:C.ink},input:{backgroundColor:C.input,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:15,paddingVertical:13,fontSize:16,color:C.ink,minHeight:49},button:{backgroundColor:C.primary,paddingVertical:16,paddingHorizontal:23,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:14,minHeight:48},buttonText:{fontWeight:'600',fontSize:15,color:C.onPrimary},secondary:{backgroundColor:'transparent',borderWidth:1,borderColor:C.borderStrong},tag:{borderWidth:1,borderColor:C.border,paddingVertical:8,paddingHorizontal:12,borderRadius:30,flexDirection:'row',gap:5,alignItems:'center',minHeight:34},overlay:{flex:1,backgroundColor:C.overlay,alignItems:'center',justifyContent:'center',padding:20},modal:{backgroundColor:C.bg,borderRadius:26,padding:26,width:'100%',maxWidth:560,maxHeight:'92%'},traffic:{backgroundColor:C.subtle,borderWidth:1,borderColor:C.border,borderRadius:15,padding:18,flexDirection:'row',alignItems:'center',gap:16},divider:{height:1,backgroundColor:C.border,marginVertical:22},link:{fontSize:14,fontWeight:'600',color:C.green},tiny:{fontSize:12,lineHeight:19,color:C.muted},empty:{padding:30,alignItems:'center',gap:12},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8}
});}
