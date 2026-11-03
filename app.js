'use strict';
let content;
let substackPosts=[];
let feedMode='loading';
let feedUpdatedAt='';
let feedLoadedAt=0;
let activeWritingFilter='all';
const main = document.querySelector('main');
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus();main.scrollIntoView();});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = s => /^(https?:\/\/|mailto:|assets\/|#\/)/i.test(String(s)) ? esc(s) : '#/';
const siteHost = url => { try { return new URL(url).hostname; } catch { return String(url||'').replace(/^https?:\/\//i,'').replace(/\/$/,''); } };
const ext = (url, label, cls = '') => `<a class="${cls}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
const paragraphs = s => String(s || '').split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
const label = (left,right='') => `<div class="section-label"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
const date = s => s && !Number.isNaN(new Date(s+'T12:00:00Z').getTime()) ? new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')) : 'Field notes';
const socials = p => `<div class="socials"><a href="mailto:${esc(p.email)}">Email ↗</a>${ext(p.github,'GitHub')}${ext(p.linkedin,'LinkedIn')}${p.substack?ext(p.substack,'Substack'):''}</div>`;
const status = p => `<span class="status ${/progress|ongoing/i.test(p.status)?'active':''}"><i></i>${esc(p.status)}</span>`;
const specs = p => `<dl class="specs">${[['Role',p.role],['Organization',p.organization],['Stack',p.stack]].filter(x=>x[1]).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;

function projectRow(p, i, compact = false) {
  return `<article class="project-row ${compact?'compact':''}"><span class="index">${String(i+1).padStart(2,'0')}</span><div class="project-copy"><div class="eyebrow">${esc(p.category)} <span>/</span> ${esc(p.year)}</div><h2><a href="#/projects/${esc(p.id)}">${esc(p.title)} <span class="arrow">↗</span></a></h2><p>${esc(p.summary)}</p><div class="row-bottom">${status(p)}<a class="text-link" href="#/projects/${esc(p.id)}">Explore project <span aria-hidden="true">→</span></a></div></div>${compact?'':`<div class="project-side">${p.image?`<a class="project-image" href="#/projects/${esc(p.id)}"><img src="${safeUrl(p.image)}" alt="${esc(p.title)}" loading="lazy"></a>`:''}${specs(p)}</div>`}</article>`;
}

function writingRows(items) {
  return items.map(w=>{
    const local=!!w.contentPath||(w.source==='substack'&&!!w.html);
    const href=w.source==='substack'?'#/writing/substack/'+w.id:w.url;
    const title=local?`<a href="${safeUrl(href)}">${esc(w.title)}</a>`:ext(w.url,w.title);
    return `<article class="writing-row"><div class="writing-date">${esc(date(w.date))}<span class="source-badge">${w.source==='substack'?'Substack':'Personal blog'}</span></div><div><span class="eyebrow">${esc(w.category)}</span><h2>${title}</h2><p>${esc(w.summary)}</p></div>${w.image?`<a class="writing-thumbnail" href="${safeUrl(local?href:w.url)}" aria-label="Read ${esc(w.title)}"><img src="${safeUrl(w.image)}" alt="" loading="lazy"></a>`:'<span class="writing-arrow" aria-hidden="true">↗</span>'}</article>`;
  }).join('');
}

function allWriting(){return [...content.writing,...substackPosts].sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function feedNote(){
 if(feedMode==='loading')return 'Loading the latest synced Substack posts…';
 if(feedMode==='live')return 'Connected to Substack · Synced automatically by GitHub Actions';
 if(feedMode==='stale')return 'Substack is temporarily unavailable · Showing the last successful feed';
 return 'Live Substack feed temporarily unavailable · Showing the saved article index';
}
function refreshWritingList(){
 const list=document.querySelector('#writing-list');
 if(list){const items=allWriting().filter(w=>activeWritingFilter==='all'||(activeWritingFilter==='substack'?(w.source==='substack'):(w.source!=='substack')));list.innerHTML=writingRows(items);document.querySelector('#writing-count').textContent=`${items.length} articles`;}
 const note=document.querySelector('#feed-status');if(note)note.textContent=feedNote();
 const homeList=document.querySelector('#home-writing-list');if(homeList)homeList.innerHTML=writingRows(allWriting().slice(0,2));
}
async function loadSubstack(force=false){
 if(!force&&Date.now()-feedLoadedAt<10*60*1000){refreshWritingList();return;}
 try{const r=await fetch('substack-feed.json'+(force?'?refresh='+Date.now():''));if(!r.ok)throw new Error('Feed unavailable');const data=await r.json();substackPosts=Array.isArray(data.posts)?data.posts:[];feedMode=data.mode;feedUpdatedAt=data.updatedAt;feedLoadedAt=Date.now();}
 catch{try{const r=await fetch('substack-snapshot.json');if(!r.ok)throw new Error();const d=await r.json();substackPosts=d.posts||[];feedMode='snapshot';feedUpdatedAt=d.updatedAt;feedLoadedAt=Date.now();}catch{feedMode='snapshot';}}
 refreshWritingList();
 const route=location.hash.replace(/^#\/?/,'').split('/');if(route[0]==='writing'&&route[1]==='substack'&&route[2])loadArticle(route[2],true);
}

function safeArticle(markup){
 const source=new DOMParser().parseFromString(markup,'text/html');
 const allowed=new Set(['P','BR','H1','H2','H3','H4','H5','H6','STRONG','B','EM','I','U','S','BLOCKQUOTE','PRE','CODE','UL','OL','LI','A','IMG','FIGURE','FIGCAPTION','HR','TABLE','THEAD','TBODY','TR','TH','TD','DIV','SPAN','SUP','SUB','IFRAME','VIDEO','SOURCE']);
 const blocked=new Set(['SCRIPT','STYLE','FORM','INPUT','BUTTON','OBJECT','EMBED','SVG','MATH','LINK','META']);
 function clean(node){
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
  if(node.nodeType!==Node.ELEMENT_NODE||blocked.has(node.tagName))return document.createDocumentFragment();
  const result=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):document.createDocumentFragment();
  if(result.nodeType===Node.ELEMENT_NODE){
   if(node.tagName==='A'){const href=node.getAttribute('href')||'';if(/^(https?:\/\/|mailto:|assets\/|#)/i.test(href)){result.setAttribute('href',href);result.setAttribute('rel','noopener noreferrer');if(/^https?:/i.test(href))result.setAttribute('target','_blank');}}
   if(['IMG','VIDEO','SOURCE','IFRAME'].includes(node.tagName)){
    const src=node.getAttribute('src')||'';const local=/^assets\/[a-zA-Z0-9/_ .%-]+$/.test(src);const remote=/^https:\/\//i.test(src);
    let ok=local||remote;
    if(node.tagName==='IFRAME')ok=(local&&/\.pdf$/i.test(src))||/^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//i.test(src);
    if(!ok)return document.createDocumentFragment();result.setAttribute('src',src);
    if(node.tagName==='IMG'){result.setAttribute('alt',node.getAttribute('alt')||'');result.setAttribute('loading','lazy');}
    if(node.tagName==='IFRAME'){result.setAttribute('title',node.getAttribute('title')||'Embedded media');result.setAttribute('loading','lazy');result.setAttribute('allowfullscreen','');result.setAttribute('referrerpolicy','strict-origin-when-cross-origin');}
    if(node.tagName==='VIDEO')result.setAttribute('controls','');
   }
  }
  for(const child of node.childNodes)result.append(clean(child));return result;
 }
 const holder=document.createElement('div');for(const node of source.body.childNodes)holder.append(clean(node));return holder.innerHTML;
}

function articlePage(id,isSubstack){
 const post=isSubstack?substackPosts.find(p=>p.id===id):content.writing.find(p=>p.id===id);
 return `<a class="back-link" href="#/writing">← All writing</a><div id="article-reader" data-article="${esc((isSubstack?'substack/':'')+id)}">${post?articleHeader(post):'<section class="page-intro"><p>Loading article…</p></section>'}<div class="article-body prose"><p>Loading article…</p></div></div>`;
}
function articleHeader(post){return `<header class="page-intro article-intro"><span class="eyebrow">${esc(date(post.date))} / ${esc(post.category)}</span><h1>${esc(post.title)}</h1><p>${esc(post.summary)}</p><div class="article-byline">By ${esc(content.profile.name)}${post.source==='substack'?' · Originally published on Substack':''}</div></header>`;}
async function loadArticle(id,isSubstack){
 const reader=document.querySelector('#article-reader');const key=(isSubstack?'substack/':'')+id;if(!reader||reader.dataset.article!==key)return;
 let post=isSubstack?substackPosts.find(p=>p.id===id):content.writing.find(p=>p.id===id);
 if(!post){if(isSubstack&&feedMode==='loading')return;reader.innerHTML='<section class="page-intro"><h1>Article not found.</h1><a href="#/writing" class="text-link">Back to Writing →</a></section>';return;}
 try{
  if(post.contentPath){if(!/^posts\/[a-zA-Z0-9_-]+\.json$/.test(post.contentPath))throw new Error('Invalid article path');const r=await fetch(post.contentPath);if(!r.ok)throw new Error('Unavailable');post={...post,...await r.json()};}
  if(!reader.isConnected||reader.dataset.article!==key)return;
  const cover=post.image&&!(post.html||'').includes(post.image)?`<img class="article-cover" src="${safeUrl(post.image)}" alt="${esc(post.title)}">`:'';
  reader.innerHTML=articleHeader(post)+`<article class="article-body prose">${cover}${post.html?safeArticle(post.html):`<p>The live feed is unavailable right now. You can read this article on Substack.</p>`}<div class="article-original">${ext(post.sourceUrl||post.url,'Read the original','text-link')}</div></article>`;
  document.title=post.title+' — '+content.profile.name;
 }catch{reader.innerHTML=articleHeader(post)+`<div class="article-body prose"><p>This article could not be loaded. Please try again.</p><button class="copy-button" id="retry-article">Try again</button></div>`;document.querySelector('#retry-article')?.addEventListener('click',()=>loadArticle(id,isSubstack));}
}


// Sites are stored in content.json so links and descriptions remain editable.
function websiteCards(items, compact = false) {
 return `<div class="website-grid ${compact ? 'website-grid-compact' : ''}">${items.map((w,i)=>`<article class="website-card"><div class="website-card-top"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${esc(w.category)}</span><span class="website-mark" aria-hidden="true">${esc(w.mark||'↗')}</span></div><div class="website-card-body"><h3>${esc(w.title)}</h3><p class="website-subtitle">${esc(w.subtitle)}</p>${compact?'':`<p class="website-description">${esc(w.description)}</p>`}</div><div class="website-card-bottom"><span class="website-host">${esc(siteHost(w.url))}</span>${ext(w.url,w.linkLabel||'Visit website','website-action')}</div></article>`).join('')}</div>`;
}
function websites() {
 return `<section class="page-intro"><span class="eyebrow">An internet of my own</span><h1>Websites<span class="name-dot">.</span></h1><p>Different corners of what I make — from creative worlds and AI infrastructure to coffee. Explore each one below.</p></section>${label('Sites / Ventures','Three places to explore')}${websiteCards(content.websites||[])}<section class="end-note small"><span class="eyebrow">More than one kind of curiosity.</span><h2>Research. Stories. Coffee.</h2><a class="text-link" href="#/projects">Explore my technical projects ↗</a></section>`;
}

function home() {
 const p=content.profile;
 return `<section class="hero"><div class="hero-copy"><div class="eyebrow hero-kicker"><span class="small-dot"></span> AI / ROBOTICS / SYSTEMS</div><h1>${esc(p.name)}<span class="name-dot">.</span></h1><p class="hero-role">${esc(p.role)}</p><p class="hero-intro">${esc(p.intro)}</p>${socials(p)}</div><figure class="portrait"><img src="${safeUrl(p.portrait)}" alt="${esc(p.name)}"><figcaption><span class="small-dot"></span> ${esc(p.location)}</figcaption></figure></section>
 <section class="overview">${label('01 / A little context','Currently')}<div class="overview-grid"><div><h2>${esc(p.headline)}</h2><p>I’m interested in how intelligent systems perceive, learn, and interact with the world. From neural networks to robots to the server under my desk, I learn best by building.</p><a class="text-link" href="#/about">More about me →</a></div><dl class="profile-facts">${[['Based in',p.location],['Studying',p.education],['Research',p.current],['Focus',p.focus]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
 <section>${label('02 / Selected work','Ideas made tangible')}<div class="section-heading"><h2>Things I’m building</h2><a class="text-link" href="#/projects">All projects ↗</a></div>${content.projects.filter(x=>x.featured).map((p,i)=>projectRow(p,i,true)).join('')}</section>
 <section class="home-writing">${label('03 / From the notebook','Beyond the code')}<div class="section-heading"><h2>Writing & observations</h2><a class="text-link" href="#/writing">All writing ↗</a></div><div id="home-writing-list">${writingRows(allWriting().slice(0,2))}</div></section>
 <section class="home-websites">${label('04 / Around the web','Sites & ventures')}<div class="section-heading"><h2>Beyond this portfolio</h2><a class="text-link" href="#/websites">All websites ↗</a></div>${websiteCards(content.websites||[],true)}</section>
 <section class="end-note"><span class="eyebrow">There’s more than one way to explore an idea.</span><h2>Sometimes I build it.<br>Sometimes I write a book about it.</h2><a class="text-link" href="#/books">Browse my books ↗</a></section>`;
}

function projects() {
 const cats=['All',...new Set(content.projects.map(p=>p.category))];
 return `<section class="page-intro"><span class="eyebrow">A working collection</span><h1>Projects<span class="name-dot">.</span></h1><p>Research, products, and experiments. A closer look at what I build and how it works.</p></section><div class="filter-bar" role="group" aria-label="Filter projects">${cats.map((c,i)=>`<button data-filter="${esc(c)}" class="filter ${i===0?'selected':''}" aria-pressed="${i===0}">${esc(c)}</button>`).join('')}<span id="result-count">${content.projects.length} projects</span></div>${label('Index / Project','Context & tools')}<div id="project-list">${content.projects.map((p,i)=>projectRow(p,i)).join('')}</div>`;
}

function project(id) {
 const p=content.projects.find(p=>p.id===id);
 if(!p) return notFound();
 return `<a class="back-link" href="#/projects">← All projects</a><section class="page-intro detail-intro"><span class="eyebrow">${esc(p.category)} / ${esc(p.year)}</span><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p>${status(p)}</section><div class="detail-layout"><div class="prose">${p.image?`<img class="detail-image" src="${safeUrl(p.image)}" alt="${esc(p.title)}">`:''}${label('The project')}${paragraphs(p.body)}${p.url?ext(p.url,p.linkLabel||'Explore project','pill-link'):''}</div><aside>${label('Project notes')}${specs(p)}<p class="aside-note">A project from my portfolio of AI, robotics, and systems work.</p></aside></div><div class="end-note small"><a class="text-link" href="#/projects">← Back to the project index</a></div>`;
}
function writing() {
 activeWritingFilter='all';
 return `<section class="page-intro"><span class="eyebrow">Notes from a curious mind</span><h1>Writing<span class="name-dot">.</span></h1><p>On technology, films, places, and the ideas that stay with me.</p></section><section class="substack-connection"><div><span class="eyebrow">My newsletter</span><h2>Rohan Marar on Substack <span class="substack-symbol" aria-hidden="true">≋</span></h2><p>Longer thoughts on AI, science, technology, and life. New public posts appear here automatically after the scheduled sync.</p><span id="feed-status" class="feed-status" role="status">${esc(feedNote())}</span></div><div class="substack-actions">${ext(content.profile.substack||'https://rohanmarar.substack.com/','Visit & subscribe','pill-link')}<button id="refresh-feed" class="copy-button">Reload posts ↻</button></div></section><div class="filter-bar writing-filters" role="group" aria-label="Filter writing"><button class="filter selected" data-writing-filter="all" aria-pressed="true">All writing</button><button class="filter" data-writing-filter="substack" aria-pressed="false">Substack</button><button class="filter" data-writing-filter="personal" aria-pressed="false">Personal blog</button><span id="writing-count">${allWriting().length} articles</span></div>${label('Notebook / Essays','Read & explore')}<div id="writing-list">${writingRows(allWriting())}</div>`;
}

function other(){return `<section class="page-intro"><span class="eyebrow">Beyond the project index</span><h1>Other<span class="name-dot">.</span></h1><p>Student communities, volunteering, and my first experiments in entrepreneurship.</p></section>${label('Community / Entrepreneurship','The early chapters')}<div class="other-entries">${(content.other||[]).map((e,i)=>`<article class="other-entry"><div><span class="eyebrow">${esc(e.category)} / ${esc(e.period)}</span><h2>${esc(e.title)}</h2><div class="other-role">${esc(e.role)}</div><p class="other-org">${esc(e.organization)}</p>${paragraphs(e.description)}${e.url?(e.url.startsWith('#/')?`<a class="text-link" href="${safeUrl(e.url)}">${esc(e.linkLabel||'Read more')} →</a>`:ext(e.url,e.linkLabel||'Read more','text-link')):''}</div><aside>${e.image?`<img src="${safeUrl(e.image)}" alt="${esc(e.title)}" loading="lazy">`:`<div class="community-mark" aria-hidden="true"><span>&lt;/&gt;</span><strong>${esc(e.title)}</strong><small>Community, built together.</small></div>`}${e.id==='tensorbuilds'?'<a class="text-link" href="#/projects/bulkbites">Explore the Bulkbites project →</a>':''}</aside></article>`).join('')}</div>`;}
function books() {
 return `<section class="page-intro"><span class="eyebrow">Longer thoughts, bound together</span><h1>Books<span class="name-dot">.</span></h1><p>From making sense of neural networks to making up a murder mystery. A few worlds I’ve put on paper.</p></section>${label('The bookshelf','Nonfiction / Fiction / Philosophy')}<div class="books-grid">${content.books.map((b,i)=>`<article class="book"><a class="book-cover" href="${safeUrl(b.url)}" target="_blank" rel="noopener noreferrer"><img src="${safeUrl(b.image)}" alt="${esc(b.title)} book cover" loading="lazy"></a><span class="eyebrow">${esc(b.category)}</span><h2>${esc(b.title)}</h2><p>${esc(b.summary)}</p>${ext(b.url,'View book','text-link')}</article>`).join('')}</div>`;
}
function about() {
 const p=content.profile;
 return `<section class="page-intro"><span class="eyebrow">The person behind the projects</span><h1>About me<span class="name-dot">.</span></h1><p>${esc(p.headline)}</p></section><div class="about-layout"><div class="prose">${paragraphs(p.about)}${socials(p)}</div><aside>${label('At a glance')}<dl class="profile-facts">${[['Location',p.location],['Education',p.education],['Graduating',p.graduation],['Tools',p.stack]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></aside></div><section class="experience">${label('Along the way','Experience & education')}${content.experience.map(e=>`<article class="experience-row"><span class="index">${esc(e.period)}</span><div><h2>${esc(e.title)}</h2><div class="eyebrow">${esc(e.organization)}</div><p>${esc(e.description)}</p></div></article>`).join('')}</section><section class="end-note"><span class="eyebrow">Away from the keyboard</span><h2>Books. Barbells. Good food.<br>And a healthy obsession with cinema.</h2><div class="socials">${ext(p.instagram,'Instagram')}${ext('https://www.instagram.com/macros.with.rohan/','Macros with Rohan')}${ext(p.youtube,'YouTube')}</div></section>`;
}
function contact() {
 const p=content.profile;
 return `<section class="page-intro contact-intro"><span class="eyebrow"><span class="small-dot"></span> Start a conversation</span><h1>Let’s build<br>something interesting<span class="name-dot">.</span></h1><p>Have a research idea, a project in mind, or just a good question? I’d love to hear from you.</p><a class="email-link" href="mailto:${esc(p.email)}">${esc(p.email)} ↗</a><button class="copy-button" id="copy-email">Copy email</button><span id="copy-status" role="status"></span></section>${label('Elsewhere on the internet','Find me here')}<div class="contact-links">${[[p.github,'GitHub','Code & experiments'],[p.linkedin,'LinkedIn','Professional background'],[p.instagram,'Instagram','Life beyond engineering'],[p.youtube,'YouTube','Things I do & build']].map(([u,t,d])=>`<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer"><span><strong>${esc(t)}</strong><small>${esc(d)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div>`;
}
function notFound(){return `<section class="page-intro"><span class="eyebrow">404</span><h1>That page wandered off.</h1><a class="text-link" href="#/">Back home →</a></section>`;}
function render() {
 const route=location.hash.replace(/^#\/?/,'').split('/');
 const page=route[0]||'home';
 const views={home,projects,websites,writing,books,about,contact,other};
 main.innerHTML=page==='projects'&&route[1]?project(route[1]):page==='writing'&&route[1]?articlePage(route[1]==='substack'?route[2]:route[1],route[1]==='substack'):(views[page]||notFound)();
 document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===page;a.classList.toggle('active-nav',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.title=`${page==='home'?'AI, Robotics & Systems':page==='projects'&&route[1]?(content.projects.find(p=>p.id===route[1])?.title||'Project'):page[0].toUpperCase()+page.slice(1)} — ${content.profile.name}`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
   const items=content.projects.filter(p=>b.dataset.filter==='All'||p.category===b.dataset.filter);
   document.querySelector('#project-list').innerHTML=items.map(p=>projectRow(p,content.projects.indexOf(p))).join('');
   document.querySelector('#result-count').textContent=`${items.length} project${items.length===1?'':'s'}`;
 }));
 document.querySelector('#copy-email')?.addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(content.profile.email);status.textContent='Email copied.';}catch{status.textContent='Select the email address above to copy it.';}});
 document.querySelectorAll('[data-writing-filter]').forEach(button=>button.addEventListener('click',()=>{activeWritingFilter=button.dataset.writingFilter;document.querySelectorAll('[data-writing-filter]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});refreshWritingList();}));
 document.querySelector('#refresh-feed')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Checking…';await loadSubstack(true);if(b.isConnected){b.disabled=false;b.textContent='Reload posts ↻';}});
 if(page==='writing'&&route[1])loadArticle(route[1]==='substack'?route[2]:route[1],route[1]==='substack');
 if(page==='writing'||page==='home')loadSubstack();
}
const themeButton=document.querySelector('#theme');
let preferred='dark';try{preferred=localStorage.getItem('rm-theme')||'dark';}catch{}
function applyTheme(t){document.documentElement.dataset.theme=t;themeButton.setAttribute('aria-label',`Switch to ${t==='dark'?'light':'dark'} theme`);}
applyTheme(preferred);
themeButton.addEventListener('click',()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(t);try{localStorage.setItem('rm-theme',t);}catch{}});
addEventListener('hashchange',()=>{if(content){render();window.scrollTo(0,0);main.focus({preventScroll:true});}});
document.querySelector('#year').textContent=new Date().getFullYear();
fetch('content.json').then(r=>{if(!r.ok)throw new Error('Content unavailable');return r.json();}).then(data=>{
 content=data;
 if(new URLSearchParams(location.search).get('draft')==='1'){
  try{const draft=localStorage.getItem('rm-portfolio-draft-v1');if(draft){content=JSON.parse(draft);const banner=document.createElement('div');banner.className='draft-banner';banner.innerHTML='Browser draft preview · Changes are not published. <a href="studio.html">Back to editor →</a>';document.querySelector('.header').after(banner);}}catch{}
 }
 render();
}).catch(()=>{main.innerHTML='<section class="page-intro"><h1>Unable to load the portfolio.</h1><p>Please reload the page to try again.</p></section>';});
