const subscribers = new Set();
let status = {feed:null, delayed:false};
export function onCyberFeed(handler) {
  subscribers.add(handler);
  handler(status);
}
export function updateCyberFeed(feed, delayed) {
  status = {feed:feed || status.feed, delayed};
  for (const fn of subscribers) fn(status);
  const list = document.querySelector('[data-source-health]');
  if(!list) return;
  if(!status.feed?.feedHealth) {
    list.textContent = delayed ? 'Publisher status unavailable. The site is showing saved reports.' : 'Waiting for a publisher check.';
    return;
  }
  const format = (stamp) => Number.isFinite(Date.parse(stamp)) ? new Date(stamp).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : 'Not verified';
  const feedAge = Date.now()-Date.parse(status.feed.generatedAt);
  const rows = Object.values(status.feed.feedHealth).sort((a,b)=>a.label.localeCompare(b.label)).map(source=>{
    const li=document.createElement('li');
    const title=document.createElement('strong');
    title.textContent=`${source.label}: ${!delayed && feedAge < 2*60*60_000 && source.status==='current' ? 'Current' : 'Delayed'}`;
    const line=document.createElement('span');
    line.textContent=`Last successful check: ${format(source.checkedAt)}. Latest record returned: ${source.latestReportAt?.slice(0,10) || 'Not verified'}.`;
    li.append(title,line);
    return li;
  });
  list.replaceChildren(...rows);
}
