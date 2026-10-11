import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './api';
export type StorePlan={period:'monthly'|'annual';price:string};
const apiKey=Platform.OS==='android'?process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
export const purchasesConfigured=!!apiKey&&!!supabase;
let configuredUser:string|undefined;
async function init(){if(!apiKey||!supabase)throw new Error('Store purchases are not configured yet.');const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in before managing purchases.');if(!configuredUser){Purchases.configure({apiKey,appUserID:user.id});configuredUser=user.id;}else if(configuredUser!==user.id){await Purchases.logIn(user.id);configuredUser=user.id;}}
export async function availablePlans():Promise<StorePlan[]>{await init();const offering=(await Purchases.getOfferings()).current;return (offering?.availablePackages??[]).filter(p=>['MONTHLY','ANNUAL'].includes(p.packageType)).map(p=>({period:p.packageType==='MONTHLY'?'monthly':'annual',price:p.product.priceString}));}
export async function purchasePlan(period:'monthly'|'annual'){await init();const type=period==='monthly'?'MONTHLY':'ANNUAL';const offering=(await Purchases.getOfferings()).current;const pack=offering?.availablePackages.find(p=>p.packageType===type);if(!pack)throw new Error('This subscription is not available in the store yet.');await Purchases.purchasePackage(pack);}
export async function restorePurchases(){await init();await Purchases.restorePurchases();}
