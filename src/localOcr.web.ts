export async function extractLocalText(uri:string):Promise<string>{
 const {createWorker}=await import('tesseract.js');const worker=await createWorker('eng');
 try{return (await worker.recognize(uri)).data.text;}finally{await worker.terminate();}
}
