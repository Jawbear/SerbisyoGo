import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(resolve(process.argv[2],'../package.json'));const parser=require('@babel/parser');const traverse=require('@babel/traverse').default;
let total=0;function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())walk(path);else if(/\.tsx?$/.test(path)&&!path.includes('database.types')){const ast=parser.parse(readFileSync(path,'utf8'),{sourceType:'module',plugins:['typescript','jsx']});traverse(ast,{Program(p){for(const [name,b]of Object.entries(p.scope.bindings)){if(!b.referenced&&b.kind==='module'){console.log(path+': unused import '+name);total++;}}}});}}}walk('src');console.log(total+' unused imports found.');
