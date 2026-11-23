import {blockTypes,pictures,destinations,newLayout,pageRoles} from '../public/page-blocks.js';
export function createPageLayouts(db,{fail,audit}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS page_layout_revisions(tenant TEXT NOT NULL,role TEXT NOT NULL,version INTEGER NOT NULL,content TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(tenant,role,version));
    CREATE TABLE IF NOT EXISTS page_layout_heads(tenant TEXT NOT NULL,role TEXT NOT NULL,draft INTEGER NOT NULL,live INTEGER NOT NULL,PRIMARY KEY(tenant,role));`);
  function read(t,role,v){
    if(v===0)return newLayout();
    const item=q('SELECT content FROM page_layout_revisions WHERE tenant=? AND role=? AND version=?').get(t,role,v);
    if(!item)fail(404,'invalid');
    return JSON.parse(item.content);
  }
  const live=(t,role)=>q('SELECT live,draft FROM page_layout_heads WHERE tenant=? AND role=?').get(t,role)||{live:0,draft:0};
  function clean(data){
    if(!data||!['navy','ice','midnight'].includes(data.theme)||!['system','editorial','compact'].includes(data.font)||!Array.isArray(data.blocks)||data.blocks.length>32)fail(400,'invalid');
    const blocks=data.blocks.map(b=>{
      if(!b||typeof b.type!=='string'||!Object.hasOwn(blockTypes,b.type))fail(400,'invalid');
      const item={type:b.type};
      if(b.type==='space'){if(!['s','m','l'].includes(b.size))fail(400,'invalid');return {...item,size:b.size};}
      for(const lang of ['en','fr']){const s=b[lang]??'';if(typeof s!=='string'||s.length>(b.type==='text'?1500:150))fail(400,'invalid');item[lang]=s.trim();}
      if(!item.en&&!item.fr)fail(400,'invalid');
      if(b.type==='image'){if(!pictures.includes(b.media))fail(400,'invalid');item.media=b.media;}
      if(b.type==='button'){if(typeof b.target!=='string'||!Object.hasOwn(destinations,b.target))fail(400,'invalid');item.target=b.target;}
      if(b.type==='slider'){if(!Array.isArray(b.pictures)||b.pictures.length<2||b.pictures.length>6||b.pictures.some(p=>!pictures.includes(p)))fail(400,'invalid');item.pictures=b.pictures.slice();}
      return item;
    });
    return {theme:data.theme,font:data.font,blocks};
  }
  function state(t,role){
    if(!Object.hasOwn(pageRoles,role))fail(400,'invalid');
    const h=live(t,role);
    return {...h,role,document:read(t,role,h.draft),history:q('SELECT version,at FROM page_layout_revisions WHERE tenant=? AND role=? ORDER BY version DESC LIMIT 100').all(t,role)};
  }
  function change(t,actor,req,i){
    const h=state(t,i.role);
    if(i.version!==h.draft||i.live!==h.live)fail(409,'opStale');
    if(!['save','publish','restore'].includes(i.action))fail(400,'invalid');
    let v=h.draft,publicVersion=h.live;
    if(i.action==='save'){const doc=clean(i.document);
      if(JSON.stringify(doc)===JSON.stringify(h.document))return h;
      v=(q('SELECT max(version) AS v FROM page_layout_revisions WHERE tenant=? AND role=?').get(t,i.role).v||0)+1;
      q('INSERT INTO page_layout_revisions VALUES(?,?,?,?,?)').run(t,i.role,v,JSON.stringify(doc),Date.now());
    }else if(i.action==='publish')publicVersion=v;
    else{if(!Number.isSafeInteger(i.target)||i.target<0)fail(400,'invalid');read(t,i.role,i.target);v=publicVersion=i.target;}
    q('INSERT INTO page_layout_heads VALUES(?,?,?,?) ON CONFLICT(tenant,role) DO UPDATE SET draft=excluded.draft,live=excluded.live').run(t,i.role,v,publicVersion);
    const auditId=audit(t,actor,'page_layout_'+i.action,i.role,req,{revision:v,previous:h.live});
    return {...state(t,i.role),auditId};
  }
  return {state,change,published:(t,role)=>read(t,role,live(t,role).live)};
}
