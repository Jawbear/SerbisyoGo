import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const content=readFileSync('src/content/public-information.json','utf8');
JSON.parse(content);
mkdirSync('mobile/src/content',{recursive:true});
writeFileSync('mobile/src/content/public-information.json',content);
console.log('Web and mobile public information synchronized.');
