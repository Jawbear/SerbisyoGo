export function uuid(value:unknown):string {
 if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error('A valid account ID is required');return value;
}
export function text(value:unknown,label:string,min:number,max:number):string {
 if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new Error(`${label} must contain ${min}–${max} characters`);return value.trim();
}
export function email(value:unknown):string {
 const result=text(value,'Email address',3,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw new Error('Enter a valid email address');return result;
}
export function phone(value:unknown):string|null {
 if(value===null||value===undefined||value==='')return null;
 let digits=String(value).replace(/[\s()-]/g,'');if(/^09\d{9}$/.test(digits))digits='+63'+digits.slice(1);else if(/^639\d{9}$/.test(digits))digits='+'+digits;
 if(!/^\+639\d{9}$/.test(digits))throw new Error('Enter a valid Philippine mobile number');return digits;
}
export function password(value:unknown):string {
 if(typeof value!=='string'||value.length<12||value.length>128)throw new Error('Use a password with 12–128 characters');return value;
}
