import test from 'node:test';
import assert from 'node:assert/strict';
import {darkPalette,lightPalette,resolveTheme,savedTheme} from '../src/palette.ts';

test('explicit theme overrides the phone, while System follows it',()=>{
 assert.equal(resolveTheme('dark','light'),'dark');
 assert.equal(resolveTheme('light','dark'),'light');
 assert.equal(resolveTheme('system','dark'),'dark');
 assert.equal(resolveTheme('system','light'),'light');
 assert.equal(resolveTheme('system',null),'light');
});
test('saved appearance survives parsing and unknown values fall back to System',()=>{
 for(const mode of ['light','dark','system'])assert.equal(savedTheme(mode),mode);
 for(const value of [null,'', 'corrupted'])assert.equal(savedTheme(value),'system');
});
const luminance=hex=>{const a=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
const contrast=(a,b)=>{const [l,h]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(h+.05)/(l+.05);};
for(const [name,p]of [['light',lightPalette],['dark',darkPalette]]){
 test(`${name} theme maintains readable body, form, warning, and button text`,()=>{
  for(const [text,surface]of [['ink','bg'],['ink','white'],['ink','input'],['muted','bg'],['muted','white'],['muted','soft'],['muted','yellow'],['green','soft'],['red','errorBg'],['amber','yellow'],['onPrimary','primary'],['onPrimary','danger'],['heroButtonText','heroButton'],['toastText','toast']]){
   assert.ok(contrast(p[text],p[surface])>=4.5,`${text} on ${surface} in ${name}`);
  }
 });
}
