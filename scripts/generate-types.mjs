import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
// Run after supabase start/reset. Never substitute generated output from a different project.
const command=process.platform==='win32'?'npx.cmd':'npx';
const output=execFileSync(command,['supabase','gen','types','typescript','--local','--schema','public'],{encoding:'utf8',shell:process.platform==='win32'});
writeFileSync('src/lib/database.types.ts',output);
console.log('Generated src/lib/database.types.ts from the running local schema.');
