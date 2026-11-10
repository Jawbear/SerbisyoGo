import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
// Optional offline syntax check using an already installed Babel toolchain.
// This is not a substitute for npm run typecheck/build.
const root=process.argv[2];if(!root)throw new Error('Pass the absolute path of an installed node_modules directory containing @babel/parser.');
const require=createRequire(resolve(root,'../package.json'));
const parser=require('@babel/parser');const generate=require('@babel/generator').default;
const files=[];function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())walk(path);else if(/\.(tsx?|mjs)$/.test(path))files.push(path);}}
for(const dir of ['src','tests','scripts','supabase/functions'])walk(dir);
for(const file of readdirSync('.'))if(/\.(tsx?|mjs)$/.test(file))files.push(file);
for(const file of files){const text=readFileSync(file,'utf8');const ast=parser.parse(text,{sourceType:'module',plugins:['typescript','jsx'],errorRecovery:false});if(process.argv.includes('--format')&&file.startsWith('src/'))writeFileSync(file,generate(ast,{comments:true,compact:false,jsescOption:{minimal:true}}).code+'\n');}
console.log(`Parsed ${files.length} TypeScript/TSX/JS source files successfully.`);
