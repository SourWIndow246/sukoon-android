// Native OCR runs in our authenticated API; browser-only workers never enter the Android bundle.
export async function extractLocalText(_uri:string):Promise<string>{throw new Error('Use the authenticated OCR API on Android.');}
