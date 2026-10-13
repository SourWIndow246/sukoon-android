// Permission dialogs may resolve before Android reports the app active again.
export function waitForVoiceForeground({signal,getState,subscribe,timeoutMs=5000}) {
  if(signal.aborted)return Promise.reject(new Error('aborted'));
  if(getState()==='active')return Promise.resolve();
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);subscription.remove();signal.removeEventListener('abort',cancel);error?reject(new Error(error)):resolve();};
    const cancel=()=>finish('aborted');
    const subscription=subscribe(state=>{if(state==='active')finish();});
    const timer=setTimeout(()=>finish('aborted'),timeoutMs);
    signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted)cancel();else if(getState()==='active')finish();
  });
}
