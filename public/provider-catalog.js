import { uiKit } from './discovery.js';
import { matchesCatalogue, providerCatalogIssue } from './catalog.js';

export const providerCatalogCopy={
  providerPages:['Provider listing pages','Pages des fiches fournisseurs'],
  catalogHistory:['Import history','Historique des imports'],
  catalogFileSize:['The file must be 256 KB or smaller.','Le fichier doit faire au plus 256 Ko.'],
  catalogFileCount:['Include between 1 and 500 listings.','Incluez de 1 à 500 fiches.'],
  catalogInvalidJson:['Check the JSON syntax or select another file.','Vérifiez la syntaxe JSON ou choisissez un autre fichier.'],
  catalogGameId:['Use a game ID of 1–128 letters, digits, periods, underscores or hyphens.','Utilisez un identifiant de 1 à 128 lettres, chiffres, points, tirets bas ou traits d’union.'],
  catalogGameDuplicate:['This game ID appears twice.','Cet identifiant de jeu apparaît deux fois.'],
  catalogGameTitles:['Enter both titles, in English and French, with up to 120 characters each.','Entrez les deux titres, en français et en anglais, avec au plus 120 caractères chacun.'],
  catalogGameCategory:['Use slots, table or live as the category.','Utilisez slots, table ou live comme catégorie.'],
  catalogSource:['Catalog file or JSON','Fichier du catalogue ou JSON'],
  catalogImportMissing:['Import not found.','Import introuvable.'],
  catalogSourceMissing:['This title must return in a provider import before it can appear in the lobby.','Ce titre doit revenir dans un import du fournisseur pour être affiché dans le hall.'],
  catalogListingChanged:['This listing changed. Check its latest status.','Cette fiche a changé. Vérifiez son statut actuel.'],
  catalogProviderMissing:['Choose a registered provider or prepare the sample catalog.','Choisissez un fournisseur enregistré ou préparez le catalogue fictif.'],
  sample_catalog_created:['Sample catalog created','Catalogue fictif créé']
};

export function createProviderCatalogUi({api,t,french,canPublish,openPanel,appPath}) {
  const ui=uiKit(french),{el,l,field,button,pages,date}=ui;
  const by=id=>document.getElementById(id);
  const get=path=>api('providers/catalog/'+path,undefined,'GET');
  const post=(action,data)=>api('providers/catalog'+(action?'/'+action:''),data);
  const form=by('catalog-sync'),reviewButton=by('catalog-review'),applyButton=form.querySelector('button[type=submit]');
  const detail=by('catalog-change-detail'),note=by('catalog-status'),previewNote=by('catalog-preview');
  const listState={q:'',provider:'',category:'',filter:'all',page:1},historyState={q:'',provider:'',page:1};
  let selectedImport=null,review=null,sampleName='',generation=0,busy=false,receiptLink=null,previewKey='',sampleOpened=false;
  const label=()=>({added:l('Added','Ajouts'),updated:l('Updated','Modifications'),returned:l('Returned','Retours au catalogue'),
    removed:l('Removed from source','Retraits du fournisseur'),unchanged:l('Unchanged','Fiches identiques'),held:l('Kept hidden','Maintenues masquées')});
  const stateName=row=>!row.inFeed?l('Missing from provider catalog','Retirée par le fournisseur'):row.hidden?l('Hidden by staff','Masquée par l’équipe'):l('Visible in lobby','Visible dans le hall');
  const kinds=['added','updated','returned','removed','unchanged','held'];
  const categories=['slots','table','live'];
  function countsText(counts){
    return kinds.filter(k=>counts[k]).map(k=>label()[k]+' · '+counts[k]).join(' / ');
  }
  function changes(root,data) {
    const filters=el('div','','discovery-filters'),cards=el('div','','contact-list');
    const group=field(filters,'change',l('Show listings','Afficher les fiches'),{items:[
      ['changes',l('All changes','Tous les changements')],...kinds.filter(k=>data.counts[k]).map(k=>[k,label()[k]+' ('+data.counts[k]+')'])]});
    if(!data.counts.added&&!data.counts.updated&&!data.counts.returned&&!data.counts.removed)group.value='unchanged';
    const query=field(filters,'find',l('Find a title or ID','Rechercher un titre ou un identifiant'),{type:'search',maxLength:160});
    root.replaceChildren(filters,cards);
    function render(){
      const entries=data.entries.filter(e=>(group.value==='changes'?e.kind!=='unchanged':group.value==='held'?e.after.inFeed&&e.after.hidden:e.kind===group.value)&&
        matchesCatalogue(query.value,[e.externalId,e.before?.titleEn,e.before?.titleFr,e.after.titleEn,e.after.titleFr],e.after.category));
      pages(cards,entries,e=>{
        const card=el('article','','discovery-card');
        card.append(el('strong',french()?e.after.titleFr:e.after.titleEn),el('small',e.externalId+' · '+label()[e.kind]));
        const versions=el('dl','','catalog-comparison');
        function add(title,v){
          versions.append(el('dt',title),el('dd',[v.titleEn,v.titleFr,t(v.category),stateName(v)].join(' · ')));
        }
        if(e.before&&e.kind!=='unchanged')add(l('Before','Avant'),e.before);
        add(e.kind==='unchanged'?l('Listing','Fiche'):l('After','Après'),e.after);
        card.append(versions);return card;
      },l('No matching listings.','Aucune fiche correspondante.'),5);
    }
    group.onchange=render;query.oninput=render;render();
  }
  function openReceipt(id){selectedImport=id;openPanel('catalog-history');}
  function index(mode) {
    const isHistory=mode==='history',state=isHistory?historyState:listState;
    const root=by(isHistory?'catalog-history-body':'managed-catalog');
    const filters=el('form','','discovery-filters provider-filters'),status=el('p','','discovery-feedback'),list=el('div','','contact-list'),nav=el('div','','case-pager');
    status.setAttribute('role','status');
    const q=field(filters,'q',isHistory?l('Provider, operator or import reference','Fournisseur, opérateur ou référence d’import'):l('Title, provider or game ID','Titre, fournisseur ou identifiant du jeu'),{type:'search',maxLength:160,value:state.q});
    const any=l('All providers','Tous les fournisseurs');
    const provider=field(filters,'provider',l('Provider','Fournisseur'),{items:[['',any],...(state.provider?[[state.provider,state.provider]]:[])],value:state.provider});
    const category=isHistory?null:field(filters,'category',l('Category','Catégorie'),{items:[['',l('All categories','Toutes les catégories')],...categories.map(k=>[k,t(k)])],value:state.category});
    const visibility=isHistory?null:field(filters,'filter',l('Lobby visibility','Visibilité dans le hall'),{items:[
      ['all',l('All listings','Toutes les fiches')],['visible',l('Visible in lobby','Visibles dans le hall')],['hidden',l('Hidden by staff','Masquées par l’équipe')],['missing',l('Missing from provider catalog','Retirées par le fournisseur')]],value:state.filter});
    const position=el('span'),previous=button(l('Previous','Précédent'),()=>{state.page--;void refresh();},true),next=button(l('Next','Suivant'),()=>{state.page++;void refresh();},true);
    nav.hidden=true;nav.append(previous,position,next);root.replaceChildren(filters,status,list,nav);
    let request=0,timer;
    function changed(delay=0){
      clearTimeout(timer);++request;state.page=1;state.q=q.value.trim();state.provider=provider.value;
      if(!isHistory){state.category=category.value;state.filter=visibility.value;}
      if(delay)timer=setTimeout(()=>{if(filters.isConnected)void refresh();},delay);else void refresh();
    }
    function item(row){
      const card=el('article','','discovery-card provider-record');
      if(isHistory){
        card.append(el('h4',row.name),el('small',['import-'+row.id,date(row.at),row.actor].filter(Boolean).join(' · ')));
        if(row.counts)card.append(el('p',countsText(row.counts)));
        card.append(button(l('View import','Consulter l’import'),()=>{selectedImport=row.id;void history();},true));
      }else{
        card.append(el('h4',french()?row.titleFr:row.titleEn),el('p',[row.name,t(row.category),stateName(row)].join(' · ')),el('small',row.externalId));
        if(row.enabled){
          const link=el('a',l('View in lobby','Voir dans le hall'),'discovery-link');
          link.href=appPath('/?'+new URLSearchParams({lang:french()?'fr':'en',q:row.externalId.slice(0,120)})+'#provider-game-'+row.id);
          card.append(link);
        }
        if(row.inFeed&&canPublish()){
          const artBox=el('details');artBox.append(el('summary',l('Editorial artwork','Illustration éditoriale')));card.append(artBox);
          const art=field(artBox,'art',l('Artwork','Illustration'),{items:['','game-gold.webp','game-aurora.webp','game-blackjack.webp','game-roulette.webp','campaign-casino.webp','campaign-reels.webp','campaign-match.webp'].map(a=>[a,a||l('Supplier artwork','Illustration du fournisseur')]),value:row.editorArt||''});
          artBox.append(button(l('Save artwork','Enregistrer le visuel'),async()=>{try{await api('admin/shelves/distribution',{action:'art',id:row.id,art:art.value});await refresh(t('catalogListingUpdated'));}catch(err){if(card.isConnected)status.textContent=t(err.message);}},true));
          const toggle=button(t(row.hidden?'catalogListingShow':'catalogListingHide'),async()=>{
            if(toggle.disabled)return;toggle.disabled=true;
            try{
              await post('status',{name:row.name,externalId:row.externalId,enabled:Boolean(row.hidden),version:row.version});
              if(card.isConnected)await refresh(t('catalogListingUpdated'));
            }catch(e){if(card.isConnected)await refresh(t(e.message));}
            finally{toggle.disabled=false;}
          },true);
          card.append(toggle);
        }
      }
      return card;
    }
    async function refresh(message=''){
      const current=++request;
      const params=new URLSearchParams(state);
      status.textContent=t('loading');previous.disabled=true;next.disabled=true;
      try{
        const page=await get((isHistory?'imports':'listings')+'?'+params);
        if(current!==request||!filters.isConnected)return;
        provider.replaceChildren(...['',...page.providers].map(name=>{const o=el('option',name||any);o.value=name;return o;}));
        provider.value=state.provider;
        state.page=page.page;status.textContent=[message,(isHistory?l('Imports','Imports'):l('Listings','Fiches'))+' · '+page.total].filter(Boolean).join('　');
        list.replaceChildren(...page.items.map(item));
        if(!page.total){
          list.append(el('p',isHistory?l('No matching import.','Aucun import correspondant.'):l('No matching listing.','Aucune fiche correspondante.')));
          if(state.q||state.provider||state.category||(state.filter&&state.filter!=='all')){
            list.append(button(l('Clear filters','Effacer les filtres'),()=>{
              Object.assign(state,{q:'',provider:'',page:1});if(!isHistory)Object.assign(state,{category:'',filter:'all'});index(mode);
            },true));
          }else list.append(button(l('Prepare sample catalog','Préparer le catalogue fictif'),()=>{
            openPanel('catalog-import');void reviewSource(true);
          },true));
        }
        nav.hidden=page.pages<2;previous.disabled=page.page<=1;next.disabled=page.page>=page.pages;position.textContent=page.page+' / '+page.pages;
      }catch(e){
        if(current!==request||!filters.isConnected)return;
        status.textContent=t(e.message);list.replaceChildren(button(l('Try again','Réessayer'),()=>refresh(),true));nav.hidden=true;
      }
    }
    q.oninput=()=>changed(160);
    for(const f of [provider,category,visibility])if(f)f.onchange=()=>changed();
    filters.onsubmit=e=>{e.preventDefault();changed();};void refresh();
  }
  async function history(){
    if(!selectedImport){index('history');return;}
    const id=selectedImport,root=by('catalog-history-body'),panel=el('div');
    root.replaceChildren(button(l('All imports','Tous les imports'),()=>{selectedImport=null;index('history');},true),panel);
    panel.textContent=t('loading');
    try{
      const data=await get('imports/'+id);
      if(!panel.isConnected)return;
      panel.replaceChildren(el('h4',data.name),el('small',['import-'+data.id,date(data.at),data.actor].filter(Boolean).join(' · ')));
      if(data.counts){
        const group=el('div');panel.append(el('p',countsText(data.counts)),group);changes(group,data);
      }else panel.append(el('p',l('The original log records the provider and import date.','Le journal de cet import conserve le fournisseur et la date.')));
      panel.append(button(l('View provider listings','Voir les fiches du fournisseur'),()=>{
        Object.assign(listState,{provider:data.name,q:'',category:'',filter:'all',page:1});openPanel('catalog-management');
      },true));
    }catch(e){if(panel.isConnected)panel.replaceChildren(el('p',t(e.message)),button(l('Try again','Réessayer'),history,true));}
  }
  function inputs(){
    const raw=form.elements.games.value;
    if(new TextEncoder().encode(raw).length>256*1024)throw Error('catalogFileSize');
    let games;
    try{games=JSON.parse(raw);}catch{throw Error('catalogInvalidJson');}
    const issue=providerCatalogIssue(games,true);
    if(issue)throw Object.assign(Error(issue.key),{row:issue.row});
    const name=form.elements.name.value.trim();
    return {name,games,reviewUnknown:true,sample:Boolean(name&&name===sampleName)};
  }
  function renderImport(){
    const sampleButton=by('load-sample-catalog');sampleButton.disabled=busy;
    let data;
    try{data=inputs();}catch(e){
      review=null;previewNote.textContent=form.elements.games.value.trim()?[(e.row?l('Row','Fiche')+' '+e.row:''),t(e.message)].filter(Boolean).join(' · '):'';
    }
    if(!data||JSON.stringify(data)!==review?.signature)review=null;
    reviewButton.disabled=busy||!data?.name;
    const c=review?.result.counts;
    applyButton.disabled=busy||!canPublish()||!c||!(c.added+c.updated+c.returned+c.removed);
    if(!review){
      previewKey='';detail.replaceChildren();detail.hidden=true;
      if(data&&receiptLink)previewNote.textContent='';
      else if(data)previewNote.textContent=t('catalogNeedReview').replace('{count}',data.games.length);
      return;
    }
    previewNote.textContent=countsText(c)+(review.result.review?.length?' · '+review.result.review.length+' '+l('supplier types to review','types fournisseur à réviser'):'');
    const key=review.result.revision+french();
    if(previewKey!==key){changes(detail,review.result);previewKey=key;}
    detail.hidden=false;
  }
  function edited(){
    generation++;busy=false;receiptLink=null;note.replaceChildren();by('sample-catalog-status').textContent='';renderImport();
  }
  form.elements.name.oninput=edited;form.elements.games.oninput=edited;
  by('catalog-file').onchange=async e=>{
    const input=e.currentTarget,file=input.files[0];if(!file)return;
    edited();const serial=generation;
    try{
      if(file.size>256*1024)throw Error('catalogFileSize');
      const value=await file.text();
      if(serial!==generation)return;
      form.elements.games.value=value;edited();
    }catch(err){if(serial===generation){form.elements.games.value='';edited();previewNote.textContent=t(err.message==='catalogFileSize'?'catalogFileSize':'catalogInvalidJson');}}
    input.value='';
  };
  async function reviewSource(sample){
    if(busy)return;
    const current=++generation;busy=true;receiptLink=null;note.replaceChildren();renderImport();previewNote.textContent=t('loading');
    try{
      let data,result;
      if(sample){
        const demo=await get('sample');
        if(current!==generation)return;
        sampleName=demo.name;form.elements.name.value=demo.name;form.elements.games.value=JSON.stringify(demo.games,null,2);
        data=inputs();result=demo.preview;
      }else{data=inputs();result=await post('preview',data);}
      if(current!==generation)return;
      review={signature:JSON.stringify(data),result};by('catalog-source').open=false;
      if(sample)by('sample-catalog-status').textContent=t('sampleCatalogPrepared');
    }catch(e){if(current===generation){review=null;note.textContent=t(e.message);}}
    finally{if(current===generation){busy=false;renderImport();}}
  }
  reviewButton.onclick=()=>reviewSource(false);
  by('load-sample-catalog').onclick=()=>reviewSource(true);
  function showSaved(){
    if(!receiptLink)return;
    note.replaceChildren(el('span',t('synced')+' · '+receiptLink.imported),button(l('View import','Consulter l’import')+' · import-'+receiptLink.auditId,()=>openReceipt(receiptLink.auditId),true));
  }
  form.onsubmit=async e=>{
    e.preventDefault();if(busy||!review||!canPublish())return;
    const data=inputs();if(JSON.stringify(data)!==review.signature){edited();return;}
    const current=++generation;busy=true;const expectedRevision=review.result.revision;renderImport();
    try{
      const saved=await post('',{...data,expectedRevision});
      if(current!==generation)return;
      receiptLink=saved;review=null;showSaved();
    }catch(err){if(current===generation){note.textContent=t(err.message);review=null;}}
    finally{if(current===generation){busy=false;renderImport();if(receiptLink)previewNote.textContent='';}}
  };
  by('catalog-list-refresh').onclick=()=>index('list');
  async function openImport(){
    const list=by('catalog-provider-options');
    try{
      const known=await api('providers/list',{});
      list.replaceChildren(...known.map(p=>{const o=el('option');o.value=p.name;return o;}));
    }catch{list.replaceChildren();}
    renderImport();showSaved();
    if(!sampleOpened&&!busy&&!form.elements.games.value.trim()&&new URLSearchParams(location.search).get('exemple')==='catalogue'){
      sampleOpened=true;await reviewSource(true);
    }
  }
  function clear(){
    ++generation;busy=false;review=null;receiptLink=null;selectedImport=null;sampleName='';previewKey='';sampleOpened=false;
    Object.assign(listState,{q:'',provider:'',category:'',filter:'all',page:1});Object.assign(historyState,{q:'',provider:'',page:1});
    for(const id of ['catalog-history-body','managed-catalog','catalog-status','sample-catalog-status','catalog-provider-options','catalog-change-detail'])by(id).replaceChildren();
    form.reset();renderImport();
  }
  return {directory:()=>index('list'),history,openImport,renderImport,showSaved,clear};
}
