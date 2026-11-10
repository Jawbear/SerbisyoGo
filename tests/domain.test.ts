import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canTransition,calculatePrice,normalizePhone,safeRedirect,validateUpload,eligibleReview,overlap,pesosToCentavos,escapeCsv} from '../src/lib/domain.ts';
import {readAndroidManifest} from '../src/lib/apk.ts';
import {checkoutRequest,settlementLabel} from '../src/features/payments/adapter.ts';
test('money uses integer centavos and deterministic half-up commission rounding',()=>{
 assert.deepEqual(calculatePrice(45000,5000,1000),{labor_centavos:45000,fee_centavos:5000,commission_centavos:4500,total_centavos:50000,provider_net_centavos:40500});
 assert.equal(calculatePrice(101,0,5000).commission_centavos,51);
 assert.equal(pesosToCentavos('123.45'),12345);assert.equal(pesosToCentavos('1.2'),120);
 for(const bad of ['1.234','-1','1e3','Infinity','NaN'])assert.throws(()=>pesosToCentavos(bad));
 assert.throws(()=>calculatePrice(0.1,0,0));assert.throws(()=>calculatePrice(-1,0,0));assert.throws(()=>calculatePrice(1,1,10001));
});
test('booking transitions enforce actor and source state',()=>{
 assert.equal(canTransition('customer','requested','confirmed'),false);
 assert.equal(canTransition('provider','requested','confirmed'),true);
 assert.equal(canTransition('provider','requested','completed'),false);
 assert.equal(canTransition('provider','confirmed','en_route'),true);
 assert.equal(canTransition('provider','en_route','in_progress'),true);
 assert.equal(canTransition('provider','in_progress','completed'),true);
 assert.equal(canTransition('customer','in_progress','cancelled'),false);
 assert.equal(canTransition('admin','in_progress','cancelled'),true);
 assert.equal(canTransition('admin','completed','cancelled'),false);
});
test('Philippine phone numbers normalize without accepting arbitrary international numbers',()=>{
 assert.equal(normalizePhone('0917 123 4567'),'+639171234567');assert.equal(normalizePhone('+63 917 123 4567'),'+639171234567');
 for(const bad of ['+14155552671','0917123','+6391712345678','hello'])assert.throws(()=>normalizePhone(bad));
});
test('redirects stay on the app origin',()=>{
 for(const bad of ['https://evil.example','//evil.example','/\\evil.example','/\r\nLocation: evil'])assert.equal(safeRedirect(bad),'/dashboard/');
 assert.equal(safeRedirect('/book/?provider=example'),'/book/?provider=example');
});
test('file validators reject type spoofing by extension, empty uploads and excess size',()=>{
 assert.doesNotThrow(()=>validateUpload('verification',100,'application/pdf','identity.pdf'));
 assert.throws(()=>validateUpload('verification',100,'image/svg+xml','identity.svg'));
 assert.throws(()=>validateUpload('booking',100,'image/jpeg','payload.exe'));
 assert.throws(()=>validateUpload('avatar',100,'application/pdf','identity.pdf'));
 assert.throws(()=>validateUpload('apk',100,'application/octet-stream','something.zip'));
 assert.throws(()=>validateUpload('apk',0,'application/octet-stream','app.apk'));
 assert.throws(()=>validateUpload('verification',10485761,'application/pdf','identity.pdf'));
});
test('review eligibility requires the completed booking customer and no previous review',()=>{
 assert.equal(eligibleReview({status:'completed',customer_id:'customer-a'},'customer-b',false),false);
 assert.equal(eligibleReview({status:'requested',customer_id:'customer-a'},'customer-a',false),false);
 assert.equal(eligibleReview({status:'completed',customer_id:'customer-a'},'customer-a',true),false);
 assert.equal(eligibleReview({status:'completed',customer_id:'customer-a'},'customer-a',false),true);
});
test('adjacent appointments do not overlap; intersecting appointments do',()=>{
 assert.equal(overlap('2026-11-11T01:00Z','2026-11-11T02:00Z','2026-11-11T02:00Z','2026-11-11T03:00Z'),false);
 assert.equal(overlap('2026-11-11T01:00Z','2026-11-11T02:00Z','2026-11-11T01:30Z','2026-11-11T03:00Z'),true);
});
test('CSV exports neutralize spreadsheet formulas and quote text',()=>{
 assert.equal(escapeCsv('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
 assert.equal(escapeCsv('a,b'),'"a,b"');
});
test('APK manifest parser rejects arbitrary ZIP contents and malformed chunks',()=>{
 assert.throws(()=>readAndroidManifest(new Uint8Array([80,75,3,4])));
 const bytes=new Uint8Array(16);const view=new DataView(bytes.buffer);view.setUint16(0,3,true);view.setUint16(2,8,true);view.setUint32(4,16,true);view.setUint16(8,1,true);view.setUint16(10,8,true);view.setUint32(12,0,true);assert.throws(()=>readAndroidManifest(bytes));
});
test('checkout never treats a browser request as a paid transaction',()=>{assert.deepEqual(checkoutRequest(),{method:'cash',status:'pending',charges_online:false});assert.equal(settlementLabel('paid'),'Authorized settlement recorded');assert.equal(settlementLabel('refunded'),'Refund recorded');});
test('APK binary manifest reader extracts literal version and minimum SDK',()=>{
 const strings=['manifest','versionName','1.0.0','versionCode','uses-sdk','minSdkVersion'];const encoder=new TextEncoder();const encoded=strings.map(s=>{const x=encoder.encode(s);return new Uint8Array([s.length,x.length,...x,0]);});const poolSize=Math.ceil((28+strings.length*4+encoded.reduce((n,s)=>n+s.length,0))/4)*4;const pool=new Uint8Array(poolSize);const pv=new DataView(pool.buffer);pv.setUint16(0,1,true);pv.setUint16(2,28,true);pv.setUint32(4,poolSize,true);pv.setUint32(8,strings.length,true);pv.setUint32(16,256,true);const dataStart=28+strings.length*4;pv.setUint32(20,dataStart,true);let offset=0;encoded.forEach((s,i)=>{pv.setUint32(28+i*4,offset,true);pool.set(s,dataStart+offset);offset+=s.length;});
 function tag(name:number,attributes:{name:number;type:number;value:number}[]){const result=new Uint8Array(36+attributes.length*20);const v=new DataView(result.buffer);v.setUint16(0,258,true);v.setUint16(2,16,true);v.setUint32(4,result.length,true);v.setUint32(20,name,true);v.setUint16(24,20,true);v.setUint16(26,20,true);v.setUint16(28,attributes.length,true);attributes.forEach((a,i)=>{const p=36+i*20;v.setUint32(p,0xffffffff,true);v.setUint32(p+4,a.name,true);v.setUint32(p+8,0xffffffff,true);v.setUint16(p+12,8,true);result[p+15]=a.type;v.setUint32(p+16,a.value,true);});return result;}
 const manifest=tag(0,[{name:1,type:3,value:2},{name:3,type:16,value:7}]),sdk=tag(4,[{name:5,type:16,value:26}]);const bytes=new Uint8Array(8+pool.length+manifest.length+sdk.length);const v=new DataView(bytes.buffer);v.setUint16(0,3,true);v.setUint16(2,8,true);v.setUint32(4,bytes.length,true);bytes.set(pool,8);bytes.set(manifest,8+pool.length);bytes.set(sdk,8+pool.length+manifest.length);assert.deepEqual(readAndroidManifest(bytes),{version_name:'1.0.0',version_code:7,min_sdk:26});
});
