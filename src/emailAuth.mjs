export function emailAddress(value) {
  const email=value.trim().toLowerCase();
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
  return email;
}
export async function sendEmailCode(auth,value) {
  const email=emailAddress(value);
  const {error}=await auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(error)throw error;
  return email;
}
export async function verifyEmailCode(auth,email,value) {
  const token=value.trim();
  if(!/^\d{6,10}$/.test(token))throw new Error('Enter the full code from your email.');
  const {data,error}=await auth.verifyOtp({email:emailAddress(email),token,type:'email'});
  if(error)throw error;
  if(!data?.session)throw new Error('Sign-in did not finish. Please request a new code.');
}
