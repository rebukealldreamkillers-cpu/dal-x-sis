const archiveEndpoint = '/cybersecurity-data/archive-snapshot.json';
const typeNames = { filing:'SEC filing', agency:'Law enforcement announcement', incident:'National incident', breach:'Breach notice', advisory:'Advisory', kev:'Exploited vulnerability' };
const archiveHosts = {
  id:['www.ag.idaho.gov'], sc:['consumer.sc.gov'], in:['www.in.gov'], tx:['oag.my.site.com'],
  mt:['dojmt.gov'], nh:['mm.nh.gov'], ri:['riag.ri.gov'], ne:['nebraska.gov'], il:['databreachnoticetoattorneygeneral.illinoisattorneygeneral.gov'],
  hhs:['ocrportal.hhs.gov'],ia:['www.iowaattorneygeneral.gov'],ma:['www.mass.gov'],sec:['www.sec.gov'],ic3:['www.ic3.gov'],doj:['www.justice.gov'],
  reviewed:['www.bleepingcomputer.com','www.nbcnews.com','apnews.com','oag.ca.gov','news.vanderbilt.edu','www.sec.gov','hscnews.unm.edu','www.azcourts.gov','www.chfs.ky.gov','www.mckesson.com'],
  breach:['oag.ca.gov'], wa:['www.atg.wa.gov','agportal-s3bucket.s3.amazonaws.com'],
  or:['justice.oregon.gov'], vt:['ago.vermont.gov'], advisory:['www.cisa.gov'], kev:['www.cisa.gov'],
};
const dayMs = 86_400_000;
const pageSize = 12;
const normalize = (s) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

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
  meta.append(kind,source,date); row.append(meta,link);
  if (typeof item.note === 'string') { const note = document.createElement('span'); note.className='cyber-archive__meta'; note.textContent=item.note; row.append(note); }
  return row;
}

async function initArchive(root) {
  const control=root.querySelector('.cyber-archive__controls'), status=root.querySelector('.cyber-archive__status');
  const results=root.querySelector('.cyber-archive__results'), more=root.querySelector('.cyber-archive__more');
  const field=(name)=>root.querySelector(`[data-filter="${name}"]`);
  const query=field('query'), kind=field('kind'), source=field('source'), days=field('days');
  let doc;
  try {
    const response = await fetch(archiveEndpoint,{cache:'no-cache',signal:AbortSignal.timeout(5000)});
    if(!response.ok) throw new Error('Archive unavailable');
    doc=await response.json();
    if(doc?.version!==1 || !Array.isArray(doc.items) || !Number.isFinite(Date.parse(doc.generatedAt))) throw new Error('Invalid archive');
  } catch { status.textContent='Report history is unavailable. Try refreshing the page.'; return; }
  const now=Date.parse(doc.generatedAt);
  const items=doc.items.filter(i=>i && typeof i.title==='string' && typeof i.source==='string' &&
    Object.hasOwn(typeNames,i.kind) && Number.isFinite(Date.parse(i.date)) && archiveLink(i))
    .map(i=>({...i,searchText:normalize(`${i.title} ${i.source} ${typeNames[i.kind]} ${i.note ?? ''} ${i.evidence ?? ''}`)}));
  for(const [key,label] of new Map(items.map(i=>[i.sourceId,i.source]))) source.add(new Option(label,key));
  control.hidden=false;
  let limit=pageSize;
  function render(focusIndex=-1) {
    const phrase=normalize(query.value).split(' ').filter(Boolean);
    const since=now-Number(days.value)*dayMs;
    const match=items.filter(i=>(!kind.value || i.kind===kind.value) && (!source.value || i.sourceId===source.value) &&
      Date.parse(i.date)>=since && phrase.every(t=>i.searchText.includes(t)));
    const visible=match.slice(0,limit);
    results.replaceChildren(...visible.map(reportRow));
    more.hidden=match.length<=limit;
    status.textContent=match.length ? `Showing ${visible.length} of ${match.length} ${match.length===1?'report':'reports'}` : 'No matching reports. Try a different search or clear a filter.';
    if(focusIndex>=0) results.children[focusIndex]?.querySelector('a')?.focus();
  }
  function reset(){ limit=pageSize; render(); }
  query.addEventListener('input',reset);
  for(const element of [kind,source,days]) element.addEventListener('change',reset);
  more.addEventListener('click',()=>{const old=limit;limit+=pageSize;render(old);});
  render();
}

document.querySelectorAll('[data-cyber-archive]').forEach(initArchive);
