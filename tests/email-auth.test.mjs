import test from 'node:test';
import assert from 'node:assert/strict';
import { emailAddress, sendEmailCode, verifyEmailCode } from '../src/emailAuth.mjs';

test('email sign-in normalizes pasted addresses and rejects invalid input before sending',async()=>{
 let calls=0;const auth={signInWithOtp:async()=>{calls++;return {error:null}}};
 assert.equal(emailAddress(' Tester+phone@EXAMPLE.COM '),'tester+phone@example.com');
 for(const email of ['','tester','tester@example','tester @example.com','a@@example.com'])await assert.rejects(sendEmailCode(auth,email),/valid email/);
 assert.equal(calls,0);
});
test('requesting an email code permits signup without attempting SMS or creating a session',async()=>{
 let request;const auth={signInWithOtp:async body=>{request=body;return {data:{user:null,session:null},error:null}}};
 assert.equal(await sendEmailCode(auth,' Tester@EXAMPLE.COM '),'tester@example.com');
 assert.deepEqual(request,{email:'tester@example.com',options:{shouldCreateUser:true}});
});
test('verification requires the same email and a real authenticated session',async()=>{
 let request;const auth={verifyOtp:async body=>{request=body;return {data:{session:{access_token:'test-token'}},error:null}}};
 await verifyEmailCode(auth,'tester@example.com',' 123456 ');
 assert.deepEqual(request,{email:'tester@example.com',token:'123456',type:'email'});
 await assert.rejects(verifyEmailCode({verifyOtp:async()=>({data:{session:null},error:null})},'tester@example.com','123456'),/did not finish/);
 let calls=0;for(const code of ['','123','12345x','12345678901'])await assert.rejects(verifyEmailCode({verifyOtp:async()=>{calls++}},'tester@example.com',code),/full code/);
 assert.equal(calls,0);
});
test('delivery and verification errors remain failures so the UI can retry',async()=>{
 const error=new Error('Email delivery unavailable');
 await assert.rejects(sendEmailCode({signInWithOtp:async()=>({error})},'tester@example.com'),e=>e===error);
 const invalid=new Error('Code expired');
 await assert.rejects(verifyEmailCode({verifyOtp:async()=>({error:invalid})},'tester@example.com','123456'),e=>e===invalid);
});
