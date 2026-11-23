import {pageRoles,blockTypes,pictures,destinations,drawLayout,esc} from './page-blocks.js';
export function createLayoutEditor({api,base,french,canPublish,t}){
  const root=document.getElementById('page-layout-editor');
  let role='home',width=390,model,doc,selected=0;
  const l=(en,fr)=>french()?fr:en;
  const options=(a,value)=>a.map(([id,label])=>'<option value="'+esc(id)+'"'+(id===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
  const local=data=>Object.entries(data).map(([k,p])=>[k,p[french()?1:0]]);
  const select=(name,a,val)=>'<select data-control="'+name+'">'+options(a,val)+'</select>';
  const field=(name,control)=>'<label>'+name+control+'</label>';
  function render(){
    const b=doc.blocks[selected],types=local(blockTypes),pictureItems=pictures.map(p=>[p,p.replace('.webp','')]);
    const key=(label,op,disabled=false)=>'<button type="button" data-do="'+op+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
    let editor='';
    if(b){
      if(b.type!=='space')editor+=['en','fr'].map(k=>field(k.toUpperCase(),'<textarea data-bind="'+k+'" rows="2" maxlength="'+(b.type==='text'?1500:150)+'">'+esc(b[k])+'</textarea>')).join('');
      if(b.type==='image')editor+=field(l('Image','Image'),select('media',pictureItems,b.media));
      if(b.type==='space')editor+=field(l('Spacing','Espacement'),select('size',[['s','S'],['m','M'],['l','L']],b.size));
      if(b.type==='button')editor+=field(l('Destination','Destination'),select('target',local({games:pageRoles.games,club:pageRoles.bonuses,sports:['Sports','Sports'],support:['Support','Soutien'],account:pageRoles.accounts}),b.target));
      if(b.type==='slider')editor+=field(l('Slides','Images du carrousel'),'<select multiple data-control="pictures">'+pictureItems.map(([p,label])=>'<option value="'+p+'"'+(b.pictures.includes(p)?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>');
    }
    root.innerHTML='<div class="layout-options">'+field(l('Page','Page'),select('role',local(pageRoles).filter(([k])=>model.roles.includes(k)),role))+
      field(l('Theme','Thème'),select('theme',[['navy','Navy'],['midnight',l('Midnight','Minuit')],['ice',l('Ice','Glace')]],doc.theme))+
      field(l('Typography','Typographie'),select('font',[['system',l('Standard','Standard')],['editorial',l('Editorial','Éditoriale')],['compact',l('Compact','Compacte')]],doc.font))+'</div>'+
      '<div class="layout-options">'+field(l('Block to add','Bloc à ajouter'),select('newType',types,'section'))+key(l('Add block','Ajouter le bloc'),'add')+'</div>'+
      (doc.blocks.length?'<div class="layout-options">'+field(l('Block to edit','Bloc à modifier'),select('index',doc.blocks.map((x,i)=>[String(i),(i+1)+' · '+blockTypes[x.type][french()?1:0]]),selected))+
      key('↑','up',selected===0)+key('↓','down',selected===doc.blocks.length-1)+key(l('Remove','Retirer'),'remove')+'</div><div class="layout-options">'+editor+'</div>':'')+
      '<div class="layout-options">'+field(l('Preview width','Largeur de l’aperçu'),select('width',[390,768,1024,1440].map(w=>[String(w),w+' px']),width))+key(l('Save draft','Enregistrer le brouillon'),'save')+
      (canPublish()?key(l('Publish saved draft','Publier le brouillon enregistré'),'publish'):'')+'</div>'+
      '<div class="layout-preview-scroll"><div data-preview-width="'+width+'" data-layout-preview></div></div>'+
      (canPublish()?'<div class="layout-options">'+field(l('Previous revision','Révision précédente'),select('history',[[0,l('Original layout','Page d’origine')],...model.history.map(x=>[x.version,'#'+x.version])].map(([id,name])=>[String(id),name]),model.live))+key(l('Restore and publish','Restaurer et publier'),'restore')+'</div>':'')+'<p role="status"></p>';
    preview();
  }
  function preview(){const p=root.querySelector('[data-layout-preview]');p.dataset.previewWidth=String(width);p.innerHTML=drawLayout(doc,base,french());}
  async function load(){
    try{model=await api('admin/website-content/layout?role='+role,undefined,'GET');doc=structuredClone(model.document);selected=0;render();}
    catch(err){root.textContent=t(err.message);}
  }
  root.oninput=e=>{if(e.target.dataset.bind){doc.blocks[selected][e.target.dataset.bind]=e.target.value;preview();}};
  root.onchange=e=>{const c=e.target.dataset.control,v=e.target.value;
    if(c==='role'){role=v;void load();}
    else if(c==='index'){selected=Number(v);render();}
    else if(c==='width'){width=Number(v);preview();}
    else if(c==='theme'||c==='font'){doc[c]=v;preview();}
    else if(['size','media','target','pictures'].includes(c)){doc.blocks[selected][c]=c==='pictures'?Array.from(e.target.selectedOptions,o=>o.value):v;preview();}
  };
  root.onclick=async e=>{
    const op=e.target.closest('button')?.dataset.do;if(!op)return;
    const control=c=>root.querySelector('[data-control="'+c+'"]').value;
    if(op==='add'){const type=control('newType');doc.blocks.push({type,en:'',fr:'',media:pictures[0],pictures:pictures.slice(0,2),size:'m',target:Object.keys(destinations)[0]});selected=doc.blocks.length-1;render();return;}
    if(op==='remove'){doc.blocks.splice(selected,1);selected=Math.max(0,Math.min(selected,doc.blocks.length-1));render();return;}
    if(op==='up'||op==='down'){const i=selected+(op==='up'?-1:1);[doc.blocks[i],doc.blocks[selected]]=[doc.blocks[selected],doc.blocks[i]];selected=i;render();return;}
    const button=e.target;button.disabled=true;
    try{const data={action:op,role,version:model.draft,live:model.live};if(op==='save')data.document=doc;if(op==='restore')data.target=Number(control('history'));
      await api('admin/website-content/layout',data);await load();root.querySelector('[role="status"]').textContent=l('Saved.','Enregistré.');}
    catch(err){root.querySelector('[role="status"]').textContent=t(err.message);button.disabled=false;}
  };
  const details=root.parentElement;details.addEventListener('toggle',()=>{if(details.open)void load();});
  return {load};
}
