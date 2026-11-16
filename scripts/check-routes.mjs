import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {dirname,sep} from 'node:path';
const routes=JSON.parse(readFileSync('docs/routes.json','utf8'));
const missing=Object.keys(routes).filter(route=>!existsSync(`src/app/${route}/page.tsx`));
if(missing.length)throw new Error('Missing routes: '+missing.join(', '));
const pages=readdirSync('src/app',{recursive:true}).filter(path=>path.endsWith('page.tsx'))
 .map(path=>dirname(path)==='.'?'':dirname(path).split(sep).join('/'));
const undocumented=pages.filter(route=>!(route in routes));
if(undocumented.length)throw new Error('Undocumented routes: '+undocumented.join(', '));
console.log(`${Object.keys(routes).length} static route entrypoints verified.`);
