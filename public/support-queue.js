export function createSupportQueue({ api, t, element, action, renderCase, formatDate }) {
  const byId = id => document.getElementById(id);
  const list = byId('support-tickets');
  const status = byId('support-inbox-status');
  const search = byId('support-search');
  const filters = {status:'support-filter', type:'support-complaint-filter', topic:'support-topic-filter',
    priority:'support-priority-filter', assignee:'support-assignee-filter'};
  let page = 1;
  let version = 0;
  let result;
  let timer;
  let selected;
  const drafts = new Map();
  const params = new URLSearchParams(location.search);
  const direct = params.get('case');
  const player = params.get('supportPlayer');
  if (/^[1-9]\d*$/.test(direct)) { selected=Number(direct); search.value='case-'+direct; }
  else if (/^[1-9]\d*$/.test(player)) search.value='player-'+player;

  function resetSelection() {
    selected=undefined;
    if (location.search.match(/[?&](case|supportPlayer)=/)) {
      const url=new URL(location.href);
      url.searchParams.delete('case');
      url.searchParams.delete('supportPlayer');
      history.replaceState(history.state,'',url);
    }
  }
  function remember(article,id) {
    const reply=article.querySelector('[name=reply]');
    if (!reply) return;
    const note=article.querySelector('[name=note]');
    if (reply.value || note?.value) drafts.set(id,{reply:reply.value,note:note?.value || ''});
    else drafts.delete(id);
  }
  function clearFilters() {
    search.value='';
    for (const id of Object.values(filters)) byId(id).value='all';
    changeFilters();
  }
  function row(ticket) {
    const details=element('details','','support-ticket');
    details.dataset.ticketId=String(ticket.id);
    details.name='admin-support-ticket';
    const summary=element('summary');
    const brief=element('span','','support-ticket-summary');
    const identity=ticket.displayName ? `${ticket.displayName} (${ticket.email})` : ticket.email;
    brief.append(element('strong',`#${ticket.id} · ${identity}`),
      element('span',ticket.subject),
      element('small',[t(ticket.isComplaint?'supportCategoryComplaint':'supportCategory'+({account:'Account',game:'Game',responsible_play:'Responsible',other:'Other'})[ticket.category]),
        t('supportStatus'+title(ticket.status)),t('supportPriority'+title(ticket.priority)),ticket.reference, formatDate(ticket.updatedAt)].filter(Boolean).join(' · ')));
    summary.append(brief);
    const article=element('div','','support-ticket-body');
    details.append(summary,article);
    let load=0;
    details.addEventListener('toggle', async () => {
      const request=++load;
      if (!details.open) {
        remember(article,ticket.id);
        article.replaceChildren();
        if (selected===ticket.id) selected=undefined;
        return;
      }
      selected=ticket.id;
      article.textContent=t('loading');
      const current=version;
      try {
        const [full,team]=await Promise.all([api('admin/support/case/'+ticket.id,undefined,'GET'),api('admin/support/team',undefined,'GET')]);
        if (request!==load || current!==version || !details.isConnected || !details.open) return;
        article.replaceChildren();
        renderCase(article,full,team,status);
        for (const [name,value] of Object.entries(drafts.get(ticket.id)||{})) {
          const input=article.querySelector('[name='+name+']');
          if (input) input.value=value;
        }
      } catch (error) {
        if (request===load && current===version && details.isConnected) {
          article.replaceChildren(element('p',t(error.message)),action(t('supportRefresh'),()=>refresh(),'ghost'));
        }
      }
    });
    details.open=selected===ticket.id;
    return details;
  }
  function title(word) { return word[0].toUpperCase()+word.slice(1); }
  function render() {
    if (!result) return;
    for (const d of list.querySelectorAll('details[data-ticket-id][open]')) remember(d,Number(d.dataset.ticketId));
    const {total,page,size,pages,tickets}=result;
    byId('support-summary').textContent=total
      ? t('supportResultRange').replace('{start}',(page-1)*size+1).replace('{end}',(page-1)*size+tickets.length).replace('{total}',total)
      : t(Object.values(result.counts).some(Boolean)?'supportNoMatches':'supportNoInbox');
    const counts=result.counts;
    byId('support-totals').textContent=t('supportStatusTotals').replace('{open}',counts.open).replace('{answered}',counts.answered).replace('{closed}',counts.closed);
    byId('support-pages').hidden=pages<2;
    byId('support-previous').disabled=page<=1;
    byId('support-next').disabled=page>=pages;
    byId('support-page').textContent=`${page} / ${pages}`;
    list.replaceChildren(...tickets.map(row));
    if (!tickets.length && (search.value || Object.values(filters).some(id=>byId(id).value!=='all')))
      list.append(action(t('supportClearFilters'),clearFilters,'ghost'));
  }
  async function refresh() {
    clearTimeout(timer);
    const request=++version;
    const params=new URLSearchParams({page:String(page),q:search.value.trim()});
    for (const [key,id] of Object.entries(filters)) params.set(key,byId(id).value);
    status.textContent=t('loading');
    list.setAttribute('aria-busy','true');
    try {
      const response=await api('admin/support/queue?'+params,undefined,'GET');
      if (request!==version) return false;
      result=response;
      page=result.page;
      render();
      status.textContent='';
      return true;
    } catch (error) {
      if (request===version) {
        result=undefined;
        list.replaceChildren();
        byId('support-summary').textContent='';
        byId('support-totals').textContent='';
        byId('support-pages').hidden=true;
        status.textContent=t(error.message);
      }
      return false;
    } finally { if (request===version) list.removeAttribute('aria-busy'); }
  }
  function changeFilters(delay=0) {
    resetSelection();
    page=1;
    ++version;
    clearTimeout(timer);
    if (delay) timer=setTimeout(refresh,delay);
    else void refresh();
  }
  search.addEventListener('input',()=>changeFilters(180));
  for (const id of Object.values(filters)) byId(id).addEventListener('change',()=>changeFilters());
  byId('support-inbox-refresh').addEventListener('click',()=>refresh());
  byId('support-previous').addEventListener('click',()=>{if(page>1){page--;resetSelection();void refresh();}});
  byId('support-next').addEventListener('click',()=>{if(page<result?.pages){page++;resetSelection();void refresh();}});
  function clear() {
    ++version;
    clearTimeout(timer);
    result=undefined;
    page=1;
    drafts.clear();
    resetSelection();
    search.value='';
    for (const id of Object.values(filters)) byId(id).value='all';
    list.replaceChildren();
    byId('support-totals').textContent='';
    byId('support-summary').textContent='';
    byId('support-pages').hidden=true;
    status.textContent='';
  }
  return {refresh,render,clear};
}
