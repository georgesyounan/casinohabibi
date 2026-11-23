import {spawn,execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const fixtures=JSON.parse(await readFile(join(root,'scripts/shared-fixtures.json'),'utf8'));
const [command,argument]=process.argv.slice(2);
if(!argument || !['init','start'].includes(command))throw Error('Usage: npm run demo:workspace -- init|start <workspace-directory>');
const workspace=resolve(argument), backup=join(workspace,'baseline.sqlite'), access=join(workspace,'access.json');
if(process.env.APP_ENV && process.env.APP_ENV!=='development')throw Error('The shared workspace runs in development only.');
const temp=await mkdtemp(join(tmpdir(),'habibi-shared-'));
let child,exited,interrupted=false;
function stop(){if(child && child.exitCode===null && !child.signalCode)child.kill();}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;stop();});
const freshSecret=()=>randomBytes(24).toString('base64url');
function environment(dir,config,port) {
  return {PATH:process.env.PATH,SystemRoot:process.env.SystemRoot||'',APP_ENV:'development',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,
    APP_BASE_PATH:'/casinohabibi',BOOTSTRAP_ADMIN_EMAIL:config.accounts.publisher.email,BOOTSTRAP_ADMIN_PASSWORD:config.accounts.publisher.password,
    PROVIDER_KEY_ENCRYPTION:config.key,SECURE_COOKIES:'0'};
}
async function launch(env) {
  if(interrupted)throw Error('Interrupted');
  child=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:['ignore','pipe','inherit']});
  const lines=createInterface({input:child.stdout});
  exited=once(child,'exit');
  const first=await Promise.race([once(lines,'line').then(([line])=>JSON.parse(line)),exited.then(()=>{throw Error('The local service stopped before it was ready.');})]);
  if(first.event!=='server_started'||!first.port)throw Error('Invalid local service response');
  return 'http://127.0.0.1:'+first.port+'/casinohabibi';
}
async function seed(url,accounts) {
  const cookies=new Map();
  async function post(path,body) {
    const res=await fetch(url+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(url).origin,
      Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});
    for(const header of res.headers.getSetCookie()){const [k,v]=header.split(';')[0].split('=');if(v)cookies.set(k,v);}
    const data=await res.json();if(!res.ok)throw Error(path+' '+res.status+' '+data.error);return data;
  }
  await post('admin/login',accounts.publisher);
  await post('admin/staff',{...accounts.editor,role:'operator_content'});
  for(const card of fixtures.cards){
    const {title}=await post('admin/coming-soon',{action:'save',version:0,slug:card.slug,titleEn:card.titleEn,titleFr:card.titleFr,category:'table',studio:'Habibi Studio',featuredRank:1,descriptionEn:'',descriptionFr:'',artwork:'',altEn:'',altFr:''});
    if(card.state==='published')await post('admin/coming-soon',{action:'publish',slug:card.slug,version:title.version});
  }
  const pending=await post('signup',accounts.player);
  await post('email-verification/complete',{token:new URL(pending.verifyUrl).searchParams.get('verify')});
}
function dbOp(env,...args) {
  execFileSync(process.execPath,['scripts/db-ops.js',...args],{cwd:root,env,stdio:['ignore','ignore','inherit']});
}
try{
  if(command==='init'){
    await mkdir(workspace,{mode:0o700});
    const accounts=Object.fromEntries(Object.entries(fixtures.accounts).map(([name,user])=>[name,{email:user.email,password:freshSecret()}]));
    const config={version:fixtures.version,accounts,key:randomBytes(32).toString('hex')}, env=environment(temp,config,0);
    await seed(await launch(env),accounts);stop();await exited;
    const db=new DatabaseSync(join(temp,'northplay.sqlite'));
    try{
      db.exec(`PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;
        INSERT INTO tenants(id,slug,name,status,created_at) VALUES ('fixture-partner','fixture-partner','Habibi Partner Demo','active',1);
        UPDATE tenant_domains SET tenant_id='fixture-partner' WHERE host='localhost';
        INSERT INTO tenant_config_versions(tenant_id,version,config,status,created_at)
          SELECT 'fixture-partner',1,json_set(config,'$.brandName','Habibi Partner Demo'),'published',1 FROM tenant_config_versions
          WHERE tenant_id='sandbox' AND status='published' ORDER BY version DESC LIMIT 1;
        DELETE FROM staff_sessions; DELETE FROM sessions; COMMIT;`);
    }finally{db.close();}
    dbOp(env,'backup',backup);
    await writeFile(access,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
    console.log('Fixture workspace ready. Local accounts: '+access);
  }else{
    const config=JSON.parse(await readFile(access,'utf8'));
    if(config.version!==fixtures.version)throw Error('Create a new workspace for fixture version '+fixtures.version);
    const port=Number(process.env.PORT??3000);
    if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port');
    const dir=join(temp,'session'),env=environment(dir,config,port);
    dbOp(environment(join(temp,'unused'),config,0),'prepare-restore',backup,dir);
    const url=await launch(env);
    console.log(JSON.stringify({event:'workspace_ready',url,partner:url.replace('127.0.0.1','localhost'),credentials:access,version:fixtures.version}));
    const [code]=await exited;if(!interrupted && code!==0)process.exitCode=1;
  }
}finally{
  stop();if(exited)await exited;await rm(temp,{recursive:true,force:true});
}
