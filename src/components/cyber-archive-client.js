import { onCyberFeed } from './cyber-live-state.js';
import { breakingStoryKey, indexReport, matchesReport, normalize } from './cyber-archive-index.js';

const archiveEndpoint = '/cybersecurity-data/archive-snapshot.json';
const typeNames = { news:'Breaking report', filing:'SEC filing', agency:'Law enforcement announcement', incident:'National incident', breach:'Breach notice', advisory:'Advisory', kev:'Exploited vulnerability' };
const archiveHosts = {
  'official-breaking':['bsaefiling.fincen.gov'],
  gnews:['news.google.com'], gnewsincident:['news.google.com'], bleeping:['www.bleepingcomputer.com'], record:['therecord.media'], securityweek:['www.securityweek.com'], cyberscoop:['cyberscoop.com'],
  id:['www.ag.idaho.gov'], sc:['consumer.sc.gov'], in:['www.in.gov'], tx:['oag.my.site.com'],
  mt:['dojmt.gov'], nh:['mm.nh.gov'], ri:['riag.ri.gov'], ne:['nebraska.gov'], il:['databreachnoticetoattorneygeneral.illinoisattorneygeneral.gov'],
  hhs:['ocrportal.hhs.gov'],ia:['www.iowaattorneygeneral.gov'],ma:['www.mass.gov'],sec:['www.sec.gov'],ic3:['www.ic3.gov'],doj:['www.justice.gov'],
  reviewed:["apnews.com","bnnbloomberg.ca","cursor.com","cyberscoop.com","gambit.security","hscnews.unm.edu","news.vanderbilt.edu","oag.ca.gov","openai.com","thehill.com","therecord.media","unit42.paloaltonetworks.com","wikimediafoundation.org","workos.com","www.anthropic.com","www.azcourts.gov","www.bleepingcomputer.com","www.cbsnews.com","www.chainalysis.com","www.chfs.ky.gov","www.crowdstrike.com","www.ibtimes.co.uk","www.mckesson.com","www.microsoft.com","www.nbcnews.com","www.reuters.com","www.sec.gov"],
  breach:['oag.ca.gov'], wa:['www.atg.wa.gov','agportal-s3bucket.s3.amazonaws.com'],
  or:['justice.oregon.gov'], vt:['ago.vermont.gov'], advisory:['www.cisa.gov'], kev:['www.cisa.gov'],
};
const dayMs = 86_400_000;
const pageSize = 12;

function archiveLink(item) {
  try {
    const u = new URL(item.url);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      Object.hasOwn(archiveHosts,item.sourceId) && archiveHosts[item.sourceId].includes(u.hostname);
  } catch { return false; }
}

function reportRow(item) {
  const row = document.createElement('li');
  const link = document.createElement('a');
  link.href=item.url; link.textContent=item.title;
  link.target='_blank'; link.rel='noopener noreferrer';
  const meta = document.createElement('span'); meta.className='cyber-archive__meta';
  const kind = document.createElement('span'); kind.className='cyber-archive__type'; kind.textContent=typeNames[item.kind];
  const date = document.createElement('time'); date.dateTime=item.date; date.textContent=item.date.slice(0,10);
  const source = document.createElement('span'); source.textContent=item.source;
  meta.append(kind,source,date);
  if (item.topic === 'ai-agent-security' || item.topic === 'national-cyber') {
    const topicLabel = document.createElement('span'); topicLabel.textContent = item.topic === 'ai-agent-security' ? 'AI agent security' : 'National cyber incident'; meta.append(topicLabel);
    if (typeof item.evidence === 'string') { const evidence = document.createElement('span'); evidence.textContent = item.evidence; meta.append(evidence); }
  }
  row.append(meta,link);
  if (typeof item.note === 'string') { const note = document.createElement('span'); note.className='cyber-archive__meta'; note.textContent=item.note; row.append(note); }
  return row;
}

async function initArchive(root) {
  const control=root.querySelector('.cyber-archive__controls'), status=root.querySelector('.cyber-archive__status');
  const results=root.querySelector('.cyber-archive__results'), more=root.querySelector('.cyber-archive__more');
  const field=(name)=>root.querySelector(`[data-filter="${name}"]`);
  const query=field('query'), kind=field('kind'), source=field('source'), days=field('days'), topic=field('topic');
  let doc;
  try {
    const response = await fetch(archiveEndpoint,{cache:'no-cache',signal:AbortSignal.timeout(5000)});
    if(!response.ok) throw new Error('Archive unavailable');
    doc=await response.json();
    if(doc?.version!==1 || !Array.isArray(doc.items) || !Number.isFinite(Date.parse(doc.generatedAt))) throw new Error('Invalid archive');
  } catch { status.textContent='Report history is unavailable. Try refreshing the page.'; return; }
  const freshness=root.querySelector('[data-archive-freshness]');
  let now=Date.parse(doc.generatedAt), items=[];
  const valid=i=>i && typeof i.id==='string' && typeof i.title==='string' && typeof i.source==='string' &&
    Object.hasOwn(typeNames,i.kind) && Number.isFinite(Date.parse(i.date)) && archiveLink(i);
  const saved=doc.items.filter(valid);
  function setItems(recent=[]) {
    const sharedListings=new Set(['or','vt','hhs','ma','tx','in','il']);
    const key=i=>{
      const story=breakingStoryKey(i);
      if(story) return story;
      const u=new URL(i.url);
      const keyedByRecord=!sharedListings.has(i.sourceId) && !['/','/privacy/databreach/list','/identity-theft-unit/security-breach-notices','/consumer-protection/security-breaches/','/data-breach-notifications'].includes(u.pathname);
      return keyedByRecord ? `${i.sourceId}:${u.hostname}${u.pathname.replace(/\/$/,'')}${u.search}` : `${i.sourceId}:${normalize(i.title)}:${i.date.slice(0,10)}`;
    };
    const collected=new Map(saved.map(i=>[key(i),i]));
    for(const i of recent.filter(valid)) {
      if(i.sourceId==='reviewed' || i.kind==='incident')continue;
      const k=key(i), prior=collected.get(k);
      collected.set(k,prior ? {...i,...prior,topic:prior.topic || i.topic} : i);
    }
    items=[...collected.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
      .map(i=>({...i,searchText:indexReport(i,`${i.title} ${i.source} ${typeNames[i.kind]} ${i.note ?? ''} ${i.evidence ?? ''} ${i.topic === 'ai-agent-security' ? 'AI agent security' : i.topic === 'national-cyber' ? 'National cyber incident' : ''}`)}));
    const known=new Set([...source.options].map(o=>o.value));
    for(const [k,label] of new Map(items.map(i=>[i.sourceId,i.source]))) {
      if (!known.has(k)) source.add(new Option(label,k));
    }
  }
  setItems();
  control.hidden=false;
  let limit=pageSize;
  function render(focusIndex=-1) {
    const phrase=query.value;
    const since=now-Number(days.value)*dayMs;
    const match=items.filter(i=>(!kind.value || i.kind===kind.value) && (!source.value || i.sourceId===source.value) &&
      (!topic.value || i.topic===topic.value) && Date.parse(i.date)>=since && matchesReport(i.searchText,phrase));
    const visible=match.slice(0,limit);
    results.replaceChildren(...visible.map(reportRow));
    more.hidden=match.length<=limit;
    status.textContent=match.length ? `Showing ${visible.length} of ${match.length} ${match.length===1?'report':'reports'}` : 'No matching reports. Try a different search or clear a filter.';
    if(focusIndex>=0) results.children[focusIndex]?.querySelector('a')?.focus();
  }
  function reset(){ limit=pageSize; render(); }
  query.addEventListener('input',reset);
  for(const element of [kind,source,days,topic]) element.addEventListener('change',reset);
  more.addEventListener('click',()=>{const old=limit;limit+=pageSize;render(old);});
  render();
  onCyberFeed(({feed,delayed})=>{
    if (feed?.recentReports && Array.isArray(feed.recentReports)) {
      now=Math.max(now,Date.parse(feed.generatedAt));
      setItems(feed.recentReports);
      freshness.textContent=delayed ? 'Searching the archive and last saved public reports. Live refresh delayed.' : 'Searching the published archive and recent public reports from the latest source checks.';
      // Keep the user's filter selection and how many rows they opened.
      if(!results.contains(document.activeElement)) render();
    } else if(delayed) freshness.textContent='Live public reports unavailable. The published archive is still searchable.';
  });
}

document.querySelectorAll('[data-cyber-archive]').forEach(initArchive);
