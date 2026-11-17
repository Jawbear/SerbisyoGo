import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('website and bundled mobile guides cannot drift apart',()=>{
 const web=JSON.parse(readFileSync('src/content/public-information.json','utf8'));
 const mobile=JSON.parse(readFileSync('mobile/src/content/public-information.json','utf8'));
 assert.deepEqual(mobile,web);
 assert.deepEqual(Object.keys(web.pages).sort(),['contact','faq','for-clients','for-workers','how-it-works']);
 assert.ok(web.faq.length>=10);
 assert.equal(new Set(web.faq.map(item=>item.question)).size,web.faq.length);
});
