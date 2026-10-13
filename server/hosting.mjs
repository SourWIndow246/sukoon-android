export function configureHosting(app,env=process.env) {
  // A fixed hop count avoids trusting arbitrary client-supplied forwarding chains.
  const hops=Number(env.TRUST_PROXY_HOPS??0);
  if(!Number.isInteger(hops)||hops<0||hops>8)throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 8.');
  app.set('trust proxy',hops);
  if(env.NODE_ENV==='production') {
    const provider=(env.AI_PROVIDER||(env.GEMINI_API_KEY?'gemini':'anthropic')).trim().toLowerCase();
    for(const name of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',provider==='gemini'?'GEMINI_API_KEY':'ANTHROPIC_API_KEY']) {
      if(!env[name]?.trim())throw new Error(`Missing server setting: ${name}`);
    }
  }
}
