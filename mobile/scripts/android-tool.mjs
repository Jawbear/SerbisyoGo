import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

export function androidTool(directory,name,args) {
  if(name==='apksigner'&&process.platform==='win32') {
    const java=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin','java.exe'):'java.exe';
    return execFileSync(java,['-jar',join(directory,'lib','apksigner.jar'),...args],{encoding:'utf8'});
  }
  return execFileSync(join(directory,process.platform==='win32'?`${name}.exe`:name),args,{encoding:'utf8'});
}
