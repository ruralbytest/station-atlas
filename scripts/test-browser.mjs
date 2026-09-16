import {preview} from 'vite';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Own the preview server in this process so Windows needs no process-tree kill.
const server=await preview({preview:{host:'127.0.0.1',port:3017,strictPort:true}});
try{
 const cli=fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url));
 const child=spawn(process.execPath,[cli,'test',...process.argv.slice(2)],{stdio:'inherit'});
 process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
}finally{
 server.httpServer.closeAllConnections();await new Promise(resolve=>server.httpServer.close(resolve));
}
