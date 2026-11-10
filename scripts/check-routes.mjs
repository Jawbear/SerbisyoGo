import {readFileSync,existsSync} from 'node:fs';
const routes=JSON.parse(readFileSync('docs/routes.json','utf8'));
const missing=Object.keys(routes).filter(route=>!existsSync(`src/app/${route}/page.tsx`));
if(missing.length)throw new Error('Missing routes: '+missing.join(', '));
console.log(`${Object.keys(routes).length} static route entrypoints verified.`);
