const HOME = 'https://www.google.com/';
const SEARCH = 'https://www.google.com/search?q=';
const STORAGE = 'chromium-iwa-v3-';
const initialParams = new URLSearchParams(location.search);
const initialUrl = initialParams.get('url') ? decodeURIComponent(initialParams.get('url')) : HOME;
const state = {
  tabs: [], active: 0, nextId: 1,
  incognito: initialParams.get('incognito') === '1',
  closed: JSON.parse(localStorage.getItem(STORAGE+'closed') || '[]'),
  bookmarks: JSON.parse(localStorage.getItem(STORAGE+'bookmarks') || '[]'),
  history: JSON.parse(localStorage.getItem(STORAGE+'history') || '[]'),
  downloads: JSON.parse(localStorage.getItem(STORAGE+'downloads') || '[]'),
  omniboxIndex: -1,
  menuPage: 'main',
  windowMaximized: false,
};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = n => `<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#${n}"></use></svg>`;
const persist = (k,v) => localStorage.setItem(STORAGE+k, JSON.stringify(v));
const current = () => state.tabs[state.active];
function domain(u){try{return new URL(u).hostname}catch{return ''}}
function origin(u){try{return new URL(u).origin}catch{return ''}}
function normalize(value){
  let v=String(value??'').trim();
  if(!v) return HOME;
  // Accept the URL forms users normally type into Chrome's omnibox.
  if(/^https?:\/\//i.test(v) || /^data:/i.test(v)) return v;
  if(/^localhost(?::\d+)?(?:[/?#].*)?$/i.test(v) || /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/.test(v)) return 'http://'+v;
  if(/^[a-z][a-z0-9+.-]*:/i.test(v)) {
    // Controlled Frame is a web-content surface; unsupported browser schemes
    // are treated as searches instead of producing a dead page.
    const scheme=v.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    if(scheme==='http'||scheme==='https'||scheme==='data') return v;
    return SEARCH+encodeURIComponent(v);
  }
  if(/^(?:www\.)?[\w.-]+\.[a-z]{2,}(?::\d+)?(?:[/:?#].*)?$/i.test(v)) return 'https://'+v;
  if(/^\[[0-9a-f:]+\](?::\d+)?(?:[/?#].*)?$/i.test(v)) return 'http://'+v;
  return SEARCH+encodeURIComponent(v);
}
function filename(u){try{return decodeURIComponent(new URL(u).pathname.split('/').pop())||new URL(u).hostname}catch{return 'download'}}
function closePopups(){['menu','ctx','bubble','suggestions'].forEach(id=>$('#'+id).classList.remove('open'));state.menuPage='main'}
function setModal(open){$('#modal').style.display=open?'flex':'none'}
function showModal(title,html,handler){$('#mt').textContent=title;$('#mb').innerHTML=html;$('#mb').onclick=handler||null;setModal(true)}
function simpleInfo(title,text){showModal(title,`<div style="white-space:pre-wrap;line-height:1.55;color:#d7d9dc">${esc(text)}</div>`)}

function createTab(url=HOME,activate=true){
  const t={id:state.nextId++,url,title:'New Tab',frame:null,loading:false,pinned:false,muted:false};
  state.tabs.push(t);
  if(activate) state.active=state.tabs.length-1;
  renderTabs(); mountFrame(t);
  if(activate) activateTab(state.tabs.length-1);
  return t;
}
function mountFrame(t){
  const f=document.createElement('controlledframe');
  f.className='frame'+(state.tabs[state.active]===t?' active':'');
  f.setAttribute('allowfullscreen','');
  f.setAttribute('allowpopups','');
  if(!state.incognito) f.partition='persist:chromium';
  // Set both the property and content attribute. This makes navigation work
  // across Controlled Frame implementations that initialize one before the other.
  f.src=t.url;
  f.setAttribute('src',t.url);
  f.addEventListener('loadstart',e=>{
    t.loading=true;
    if(e?.url && /^https?:/i.test(e.url)) t.url=e.url;
    updateToolbar();renderTabs();
  });
  f.addEventListener('loadcommit',e=>{
    if(e?.url) t.url=e.url;
    syncFrame(t,f);
  });
  f.addEventListener('loadstop',e=>{
    if(e?.url) t.url=e.url;
    syncFrame(t,f);
  });
  f.addEventListener('loadabort',e=>{
    t.loading=false;
    if(e?.url)t.url=e.url;
    updateToolbar();renderTabs();
  });
  f.addEventListener('newwindow',e=>handleNewWindow(t,e));
  f.addEventListener('permissionrequest',e=>handlePermission(t,e));
  f.addEventListener('dialog',e=>handleDialog(e));
  f.addEventListener('consolemessage',()=>{});
  $('#frames').appendChild(f);t.frame=f;
}
function handleNewWindow(parent,e){
  const url=e.targetUrl||HOME;
  e.preventDefault();
  const t=createTab(url,true);
  try{ if(e.window?.attach && t.frame) e.window.attach(t.frame); }catch{}
  return t;
}
async function syncFrame(t,f){
  t.url=f.src||t.url;t.loading=false;
  try{
    const result=await f.executeScript({code:'document.title || location.hostname || location.href'});
    const title=Array.isArray(result)?result[0]:result;
    if(title) t.title=title;
  }catch{t.title=domain(t.url)||'New Tab'}
  if(/^https?:/i.test(t.url)) recordHistory(t);
  updateToolbar();renderTabs();
}
function recordHistory(t){
  if(!t.url||!domain(t.url))return;
  const item={url:t.url,title:t.title||domain(t.url),time:Date.now()};
  if(state.history[0]?.url===item.url)return;
  state.history.unshift(item);state.history=state.history.slice(0,500);persist('history',state.history);
}
function renderTabs(){
  const host=$('#tabs');host.innerHTML='';
  state.tabs.forEach((t,i)=>{
    const d=document.createElement('div');d.className='tab'+(i===state.active?' active':'')+(t.pinned?' pinned':'');d.draggable=true;d.dataset.index=i;
    const fav=domain(t.url)?`<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain(t.url))}&sz=32" alt="">`:'<span>●</span>';
    d.innerHTML=`<span class="favicon">${fav}</span><span class="title">${esc(t.title||'New Tab')}</span><button class="tabclose" aria-label="Close tab">${icon('close')}</button>`;
    d.addEventListener('click',e=>{if(!e.target.closest('.tabclose'))activateTab(i)});
    d.addEventListener('dblclick',e=>{if(!e.target.closest('.tabclose'))togglePin(i)});
    d.querySelector('.tabclose').addEventListener('click',e=>{e.stopPropagation();closeTab(i)});
    d.addEventListener('contextmenu',e=>{e.preventDefault();showTabContext(i,e.clientX,e.clientY)});
    d.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/tab-index',String(i));d.classList.add('dragging')});
    d.addEventListener('dragend',()=>{$$('.tab').forEach(x=>x.classList.remove('dragging','drop-target'))});
    d.addEventListener('dragover',e=>{e.preventDefault();d.classList.add('drop-target')});
    d.addEventListener('dragleave',()=>d.classList.remove('drop-target'));
    d.addEventListener('drop',e=>{e.preventDefault();d.classList.remove('drop-target');const from=Number(e.dataTransfer.getData('text/tab-index'));if(Number.isInteger(from)&&from!==i)moveTab(from,i)});
    host.appendChild(d);
  });
}
function moveTab(from,to){
  const [t]=state.tabs.splice(from,1);state.tabs.splice(to,0,t);if(state.active===from)state.active=to;else if(from<state.active&&to>=state.active)state.active--;else if(from>state.active&&to<=state.active)state.active++;renderTabs();activateTab(state.active)}
function activateTab(i){if(!state.tabs[i])return;state.active=i;state.tabs.forEach((t,n)=>t.frame?.classList.toggle('active',n===i));renderTabs();updateToolbar();closePopups();}
function closeTab(i){
  const t=state.tabs[i];if(!t)return;
  state.closed.unshift({url:t.url,title:t.title,time:Date.now()});state.closed=state.closed.slice(0,25);persist('closed',state.closed);
  t.frame?.remove();state.tabs.splice(i,1);
  if(!state.tabs.length){createTab(HOME,true);return}
  if(state.active>i)state.active--;else if(state.active===i)state.active=Math.min(i,state.tabs.length-1);
  activateTab(state.active);
}
function reopenClosed(){const x=state.closed.shift();persist('closed',state.closed);if(x)createTab(x.url,true)}
function updateToolbar(){
  const t=current();if(!t)return;
  if(document.activeElement!==$('#addr'))$('#addr').value=t.url;
  $('#reload').innerHTML=icon(t.loading?'close':'refresh');
  $('#star').classList.toggle('saved',state.bookmarks.some(x=>x.url===t.url));
  $('#back').disabled=false;$('#forward').disabled=false;
}
async function go(method){try{await current()?.frame?.[method]();}catch{}}
function navigate(value){
  const u=normalize(value);
  const t=current();
  if(!t || !t.frame) return;
  t.url=u;
  t.loading=true;
  try {
    t.frame.src=u;
    t.frame.setAttribute('src',u);
  } catch {
    t.loading=false;
    bubble('Unable to open this address',u);
  }
  $('#addr').value=u;
  state.omniboxIndex=-1;
  $('#suggestions').classList.remove('open');
  updateToolbar();
  renderTabs();
}

function menuButton(label,ic,fn,key='',disabled=false){
  const b=document.createElement('button');b.className='mi';b.disabled=disabled;b.innerHTML=`${icon(ic)}<span>${esc(label)}</span>${key?`<span class="shortcut">${esc(key)}</span>`:''}`;b.onclick=()=>{if(!disabled)fn?.()};return b;
}
function menuSep(){const d=document.createElement('div');d.className='sep';return d}
function showMainMenu(){
  const p=$('#menu');state.menuPage='main';p.innerHTML=`
    <div class="glow-header"><div class="glow-avatar"><img src="/icon.png" alt="Chromium"></div><div><div class="glow-title">${state.incognito?'Incognito':'Chromium'}</div><div class="glow-sub">${state.incognito?'Private browsing · this window':'Chromium IWA · WebUI toolbar'}</div></div></div>
    <div class="menu-grid">
      <div class="menu-card" id="menuNewTab">${icon('add')}<b>New tab</b><span>Ctrl+T</span></div>
      <div class="menu-card" id="menuIncognito">${icon('incognito')}<b>New Incognito window</b><span>Ctrl+Shift+N</span></div>
      <div class="menu-card" id="menuHistory">${icon('history')}<b>History</b><span>Ctrl+H</span></div>
      <div class="menu-card" id="menuDownloads">${icon('download')}<b>Downloads</b><span>Ctrl+J</span></div>
      <div class="menu-card" id="menuBookmarks">${icon('bookmark')}<b>Bookmarks and lists</b><span>Ctrl+Shift+O</span></div>
      <div class="menu-card" id="menuExtensions">${icon('extensions')}<b>Extensions</b><span>Manage</span></div>
    </div>`;
  p.append(menuSep(),menuButton('New window','browser_tools',()=>window.open('/unframed/window.html','_blank'),'Ctrl+N'));
  p.append(menuButton('Save and share','share',saveAndShare,'Ctrl+S'),menuButton('Find…','search',findInPage,'Ctrl+F'),menuButton('Print…','print',printPage,'Ctrl+P'),menuButton('Create QR code for this page','qr',showQR));
  p.append(menuSep(),menuButton('More tools','settings',showMoreTools),menuButton('Settings','settings',showSettings),menuButton('Help','search',()=>simpleInfo('Help','Ctrl+L address bar\nCtrl+T new tab\nCtrl+W close tab\nCtrl+Shift+T reopen closed tab\nCtrl+D bookmark\nCtrl+F find\nCtrl+J downloads\nCtrl+H history\nCtrl+P print')),menuButton('About Chromium','security',()=>simpleInfo('About Chromium','Chromium IWA 1.2.0\n\nA borderless IWA browser shell using Chromium WebUI concepts and Controlled Frame.')));
  $('#menuNewTab').onclick=()=>{createTab(HOME,true);closePopups()};$('#menuIncognito').onclick=()=>window.open('/unframed/window.html?incognito=1','_blank');$('#menuHistory').onclick=showHistory;$('#menuDownloads').onclick=showDownloads;$('#menuBookmarks').onclick=showBookmarks;$('#menuExtensions').onclick=showExtensions;
  p.classList.add('open');
}
function showMoreTools(){
  const p=$('#menu');p.innerHTML='';p.append(menuButton('Extensions','extensions',showExtensions),menuButton('Task manager','search',()=>simpleInfo('Task manager','Native Chromium process metrics require privileged browser APIs.')),menuButton('Developer tools','settings',()=>simpleInfo('Developer tools','DevTools is a privileged Chromium surface and cannot be embedded as a normal IWA page.')),menuSep(),menuButton('Clear browsing data…','settings',clearData),menuButton('Tab search','tabsearch',showTabSearch,'Ctrl+Shift+A'),menuButton('Create shortcut','add',()=>simpleInfo('Create shortcut','Installable shortcut metadata is supplied by the IWA manifest.')));p.classList.add('open');
}
function showTabContext(i,x,y){
  const p=$('#ctx'),t=state.tabs[i];p.innerHTML=`<div class="ctx-title">${esc(t.title||t.url)}</div>`;
  p.append(menuButton('New tab','add',()=>createTab(HOME,true)),menuButton('Reload','refresh',()=>t.frame?.reload()),menuButton('Duplicate','copy',()=>createTab(t.url,true)),menuButton(t.pinned?'Unpin tab':'Pin tab','bookmark',()=>togglePin(i)),menuButton(t.muted?'Unmute site':'Mute site','security',()=>{t.muted=!t.muted;renderTabs()}),menuSep(),menuButton('Move tab to new window','browser_tools',()=>window.open('/unframed/window.html?url='+encodeURIComponent(t.url),'_blank')),menuButton('Close tab','close',()=>closeTab(i),'Ctrl+W'),menuButton('Close other tabs','close',()=>closeOtherTabs(i)),menuButton('Reopen closed tab','history',reopenClosed,'Ctrl+Shift+T'));
  p.style.left=Math.min(innerWidth-290,Math.max(5,x))+'px';p.style.top=Math.min(innerHeight-410,Math.max(38,y))+'px';p.classList.add('open');
}
function togglePin(i){const t=state.tabs[i];if(!t)return;t.pinned=!t.pinned;state.tabs.sort((a,b)=>Number(b.pinned)-Number(a.pinned));state.active=state.tabs.indexOf(t);renderTabs();updateToolbar()}
function closeOtherTabs(i){const keep=state.tabs[i];state.tabs.forEach((t,n)=>{if(n!==i)t.frame?.remove()});state.tabs=[keep];state.active=0;activateTab(0)}

function buildSuggestions(){
  const q=$('#addr').value.trim().toLowerCase();if(!q){$('#suggestions').classList.remove('open');return}
  const out=[],seen=new Set();const add=(text,url,ic,sub='')=>{if(!url||seen.has(url))return;seen.add(url);out.push({text,url,ic,sub})};
  state.bookmarks.filter(x=>(x.title+' '+x.url).toLowerCase().includes(q)).slice(0,4).forEach(x=>add(x.title,x.url,'bookmark','Bookmark'));
  state.history.filter(x=>(x.title+' '+x.url).toLowerCase().includes(q)).slice(0,5).forEach(x=>add(x.title,x.url,'history',x.url));
  add($('#addr').value,normalize($('#addr').value),'search',/\s/.test(q)?'Search Google':'Go to '+normalize($('#addr').value));
  const host=$('#suggestions');host.innerHTML=out.slice(0,8).map((x,i)=>`<div class="sug" data-index="${i}" data-url="${esc(x.url)}">${icon(x.ic)}<span class="sugmain">${esc(x.text)}</span><span class="sugsub">${esc(x.sub)}</span></div>`).join('');
  $$('.sug').forEach(s=>s.onclick=()=>navigate(s.dataset.url));state.omniboxIndex=-1;host.classList.add('open');
}
function selectSuggestion(delta){const items=$$('.sug');if(!items.length)return;state.omniboxIndex=Math.max(-1,Math.min(items.length-1,state.omniboxIndex+delta));items.forEach((x,i)=>x.classList.toggle('selected',i===state.omniboxIndex));if(state.omniboxIndex>=0)$('#addr').value=items[state.omniboxIndex].dataset.url}

function bookmark(){const t=current();if(!t)return;const i=state.bookmarks.findIndex(x=>x.url===t.url);if(i>=0){state.bookmarks.splice(i,1);bubble('Removed from bookmarks',t.title)}else{state.bookmarks.unshift({url:t.url,title:t.title});bubble('Bookmark added',t.title)}persist('bookmarks',state.bookmarks);updateToolbar()}
function showSecurity(){const u=current().url;const secure=/^https:/i.test(u);$('#bubble').innerHTML=`<div class="bt">${icon('security')} ${secure?'Connection is secure':'Connection is not secure'}</div><div class="bx"><b>${esc(domain(u)||'This page')}</b><br><br>${secure?'The connection uses HTTPS.':'This page is not using HTTPS.'}<br><br>Controlled Frame keeps this site in its own browsing partition.</div><div class="ba"><button class="secondary" id="siteSettings">Site settings</button><button id="bubbleDone">Done</button></div>`;$('#bubble').style.right='155px';$('#bubble').style.top='82px';$('#bubble').classList.add('open');$('#bubbleDone').onclick=closePopups;$('#siteSettings').onclick=()=>simpleInfo('Site settings',domain(u)||u)}
function bubble(title,text){$('#bubble').innerHTML=`<div class="bt">${esc(title)}</div><div class="bx">${esc(text)}</div><div class="ba"><button id="bubbleDone">Done</button></div>`;$('#bubble').style.right='155px';$('#bubble').style.top='82px';$('#bubble').classList.add('open');$('#bubbleDone').onclick=closePopups}
function showBookmarks(){const html=state.bookmarks.map((b,i)=>`<div class="row" data-i="${i}">${icon('bookmark')}<div class="rm"><div class="rt">${esc(b.title)}</div><div class="rs">${esc(b.url)}</div></div></div>`).join('')||'<div class="empty">No bookmarks yet.</div>';showModal('Bookmarks and lists',html,e=>{const i=e.target.closest('[data-i]')?.dataset.i;if(i!=null){navigate(state.bookmarks[i].url);setModal(false)}})}
function showHistory(){const html=state.history.map((h,i)=>`<div class="row" data-i="${i}">${icon('history')}<div class="rm"><div class="rt">${esc(h.title)}</div><div class="rs">${esc(h.url)}</div></div></div>`).join('')||'<div class="empty">No history yet.</div>';showModal('History',html,e=>{const i=e.target.closest('[data-i]')?.dataset.i;if(i!=null){navigate(state.history[i].url);setModal(false)}})}
function showDownloads(){const html=state.downloads.map((d,i)=>`<div class="row" data-i="${i}">${icon('download')}<div class="rm"><div class="rt">${esc(d.name||filename(d.url))}</div><div class="rs">${esc(d.url)} · ${new Date(d.time).toLocaleString()}</div></div></div>`).join('')||'<div class="empty">No downloads yet.</div>';showModal('Downloads',html)}
function showExtensions(){showModal('Extensions',`<div class="row">${icon('extensions')}<div class="rm"><div class="rt">IWA browser tools</div><div class="rs">Chromium-style extension container surface</div></div></div><div class="row">${icon('settings')}<div class="rm"><div class="rt">Manage extensions</div><div class="rs">Native Chrome extension installation and service-worker APIs require privileged Chromium extension support.</div></div></div>`)}
function showSettings(){showModal('Settings',`<div class="row">${icon('person')}<div class="rm"><div class="rt">You and Chromium</div><div class="rs">Profile and personalization</div></div></div><div class="row">${icon('security')}<div class="rm"><div class="rt">Privacy and security</div><div class="rs">Clear browsing data, permissions, and site information</div></div></div><div class="row">${icon('settings')}<div class="rm"><div class="rt">Appearance</div><div class="rs">Toolbar Glow Up · WebUI Refresh 2026 · Rounded icons</div></div></div>`)}
function showTabSearch(){showModal('Search tabs',`<input id="tabQuery" class="modal-input" placeholder="Search tabs"><div id="tabResults" style="margin-top:10px"></div>`);const render=()=>{$('#tabResults').innerHTML=state.tabs.map((t,i)=>({t,i})).filter(x=>{const q=$('#tabQuery').value.toLowerCase();return !q||(x.t.title+' '+x.t.url).toLowerCase().includes(q)}).map(x=>`<div class="row" data-i="${x.i}">${icon('search')}<div class="rm"><div class="rt">${esc(x.t.title)}</div><div class="rs">${esc(x.t.url)}</div></div></div>`).join('');$$('#tabResults [data-i]').forEach(r=>r.onclick=()=>{activateTab(+r.dataset.i);setModal(false)})};$('#tabQuery').oninput=render;render();$('#tabQuery').focus()}
function showQR(){simpleInfo('Create QR code for this page',current().url)}
function saveAndShare(){state.downloads.unshift({name:(current().title||'page')+'.html',url:current().url,time:Date.now(),state:'recorded'});state.downloads=state.downloads.slice(0,100);persist('downloads',state.downloads);showDownloads()}
async function clearData(){try{await current()?.frame?.clearData()}catch{}state.history=[];persist('history',[]);state.downloads=[];persist('downloads',[]);simpleInfo('Clear browsing data','Controlled Frame storage and this IWA shell history were cleared.')}
async function findInPage(){const q=await customPrompt('Find in page','Search this page');if(q)try{await current().frame.executeScript({code:`window.find(${JSON.stringify(q)})`})}catch{}}
function printPage(){try{current().frame.executeScript({code:'window.print()'})}catch{}}
async function customPrompt(title,label){return new Promise(resolve=>{showModal(title,`<div style="color:#bdc1c6;margin-bottom:8px">${esc(label)}</div><input id="promptInput" class="modal-input" autofocus><div class="ba"><button class="secondary" id="promptCancel">Cancel</button><button id="promptOk">OK</button></div>`);const finish=v=>{setModal(false);resolve(v)};$('#promptCancel').onclick=()=>finish('');$('#promptOk').onclick=()=>finish($('#promptInput').value);$('#promptInput').onkeydown=e=>{if(e.key==='Enter')finish(e.target.value);if(e.key==='Escape')finish('')}})}
function handleDialog(e){const msg=e.messageText||'The page requested a dialog.';showModal('Page dialog',`<div style="white-space:pre-wrap;line-height:1.5">${esc(msg)}</div><div class="ba"><button id="dialogCancel" class="secondary">Cancel</button><button id="dialogOk">OK</button></div>`);$('#dialogCancel').onclick=()=>{e.dialog?.cancel();setModal(false)};$('#dialogOk').onclick=()=>{e.dialog?.ok();setModal(false)}}
function handlePermission(t,e){
  const p=document.createElement('div');p.className='perm';const permission=e.permission||'permission';
  const isDownload=permission==='download';
  p.innerHTML=`<div class="permhead">${icon(isDownload?'download':'security')}<b>${esc(isDownload?'Allow this site to download a file?':'Allow '+permission+'?')}</b></div><div class="permsub">${esc(domain(t.url))}${e.request?.url?' · '+esc(e.request.url):''}</div><div class="actions"><button class="deny">Block</button><button class="allow">Allow</button></div>`;
  $('#perms').appendChild(p);p.querySelector('.deny').onclick=()=>{try{e.request?.deny()}catch{}p.remove()};p.querySelector('.allow').onclick=()=>{try{e.request?.allow()}catch{}if(isDownload){state.downloads.unshift({name:filename(e.request?.url||t.url),url:e.request?.url||t.url,time:Date.now(),state:'requested'});persist('downloads',state.downloads)}p.remove()};
}

/* Best-effort native window control compatibility. IWAs expose unframed drag regions but not a standard current-window maximize/minimize API. */
async function toggleWindowState(){
  state.windowMaximized=!state.windowMaximized;
  const drag=$('.drag-square');
  const restore=icon('restore'), max=icon('maximize');
  drag.innerHTML=state.windowMaximized?restore:max;
  try{
    if(state.windowMaximized){window.resizeTo(screen.availWidth,screen.availHeight);window.moveTo(screen.availLeft,screen.availTop)}
    else {window.resizeTo(Math.max(900,Math.round(screen.availWidth*.85)),Math.max(650,Math.round(screen.availHeight*.85)));window.moveTo(screen.availLeft+Math.round(screen.availWidth*.075),screen.availTop+Math.round(screen.availHeight*.075))}
  }catch{}
}

function closeIwaWindow(e){
  if(e){e.preventDefault();e.stopPropagation();}
  try{ window.close(); }catch{}
}

function bindWindowControls(){
  const closeBtn=$('#close');
  if(closeBtn){
    closeBtn.setAttribute('app-region','no-drag');
    closeBtn.style.pointerEvents='auto';
    closeBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
    closeBtn.addEventListener('click',closeIwaWindow);
  }
  const stateBtn=$('#window-state');
  if(stateBtn){
    stateBtn.setAttribute('app-region','drag');
    stateBtn.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();toggleWindowState();});
    stateBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleWindowState();});
  }
}

function setup(){
  createTab(initialUrl,true);
  $('#back').onclick=()=>go('back');$('#forward').onclick=()=>go('forward');$('#reload').onclick=()=>current()?.frame?.reload();$('#home').onclick=()=>navigate(HOME);
  $('#star').onclick=bookmark;$('#security').onclick=showSecurity;$('#menub').onclick=()=>{closePopups();showMainMenu()};$('#downloads').onclick=showDownloads;$('#extensions').onclick=showExtensions;$('#profile').onclick=()=>simpleInfo('Profile','Chromium\n\nPersistent Controlled Frame storage is enabled.');$('#tabsearch').onclick=showTabSearch;$('#newtab').onclick=()=>createTab(HOME,true);$('#mx').onclick=()=>setModal(false);bindWindowControls();
  const addr=$('#addr');addr.addEventListener('focus',()=>{$('#omnibox').classList.add('omnibox-focused');buildSuggestions();addr.select()});addr.addEventListener('input',buildSuggestions);addr.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();selectSuggestion(1)}else if(e.key==='ArrowUp'){e.preventDefault();selectSuggestion(-1)}else if(e.key==='Enter'){e.preventDefault();navigate(addr.value);addr.blur()}else if(e.key==='Escape'){addr.value=current().url;addr.blur();closePopups()}});addr.addEventListener('blur',()=>setTimeout(()=>$('#omnibox').classList.remove('omnibox-focused'),120));
  document.addEventListener('click',e=>{if(!e.target.closest('#omnibox')&&!e.target.closest('#suggestions'))$('#suggestions').classList.remove('open');if(!e.target.closest('#ctx'))$('#ctx').classList.remove('open')});
  $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')setModal(false)});
  document.addEventListener('keydown',e=>{
    const m=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    if(m&&k==='l'){e.preventDefault();addr.focus();addr.select()}
    else if(m&&k==='t'){e.preventDefault();createTab(HOME,true)}
    else if(m&&k==='w'){e.preventDefault();closeTab(state.active)}
    else if(m&&e.shiftKey&&k==='t'){e.preventDefault();reopenClosed()}
    else if(m&&k==='r'){e.preventDefault();current()?.frame?.reload()}
    else if(m&&k==='d'){e.preventDefault();bookmark()}
    else if(m&&k==='f'){e.preventDefault();findInPage()}
    else if(m&&k==='j'){e.preventDefault();showDownloads()}
    else if(m&&k==='h'){e.preventDefault();showHistory()}
    else if(m&&k==='p'){e.preventDefault();printPage()}
    else if(m&&e.shiftKey&&k==='a'){e.preventDefault();showTabSearch()}
    else if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();go('back')}
    else if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();go('forward')}
  });
  renderTabs();updateToolbar();
}
document.addEventListener('DOMContentLoaded',setup);
