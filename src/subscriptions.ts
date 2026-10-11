export type StorePlan={period:'monthly'|'annual';price:string};
export const purchasesConfigured=false;
export async function availablePlans():Promise<StorePlan[]>{return [];}
export async function purchasePlan(_period:'monthly'|'annual'):Promise<void>{throw new Error('Purchases are available in the Android app.');}
export async function restorePurchases():Promise<void>{throw new Error('Restore purchases from the Android app.');}
