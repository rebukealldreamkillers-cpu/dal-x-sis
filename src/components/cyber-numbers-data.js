const DAY=86_400_000;
const stamp=(s)=>Date.parse(`${s.slice(0,10)}T00:00:00Z`);
const iso=(ms)=>new Date(ms).toISOString().slice(0,10);
const short=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const monday=(ms)=>ms-((new Date(ms).getUTCDay()+6)%7)*DAY;
const categories={
  public:[['breach','Breach notices'],['kev','Exploited vulnerability entries'],['advisory','Advisories'],['filing','SEC filings'],['agency','Law enforcement announcements']],
  reviewed:[['agent','AI agent security'],['other','Other reviewed entries']],
  agent:[['campaign','Confirmed compromise or campaign'],['activity','Confirmed activity / attribution limit'],['internal','Confirmed internal control failure'],['other','Other reviewed evidence']],
};
function category(row,scope){
  if(scope==='public')return row.kind;
  if(scope==='reviewed')return row.topic==='ai-agent-security'?'agent':'other';
  const label=(row.evidence || '').split(' · ')[0];
  if(label==='Confirmed internal control failure')return 'internal';
  if(['Confirmed activity','Confirmed real-world actions'].includes(label))return 'activity';
  if(['Confirmed campaign','Confirmed intrusion','Confirmed agent tooling compromise','Confirmed incident','Confirmed incidents','Confirmed unauthorized access'].includes(label))return 'campaign';
  return 'other';
}
const eligible=(r,scope)=>scope==='public' ? categories.public.some(([key])=>key===r.kind) : r.kind==='incident' && (scope!=='agent'||r.topic==='ai-agent-security');
function example(row){
  try{const u=new URL(row.url);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)return [row.title,u.href, row.source];}catch{}
  return null;
}
export function buildNumbers(doc){
  const end=stamp(doc.generatedAt);
  if(!Number.isFinite(end))throw new TypeError('Invalid archive date');
  const rows=[...new Map(doc.items.filter(r=>r && typeof r.id==='string' && typeof r.date==='string' && Number.isFinite(stamp(r.date))).map(r=>[r.id,r])).values()];
  const windows={};
  for(const days of [30,60,90]){
    const start=end-(days-1)*DAY;
    const inWindow=rows.filter(r=>stamp(r.date)>=start&&stamp(r.date)<=end);
    const series={};
    for(const scope of Object.keys(categories)){
      const set=inWindow.filter(r=>eligible(r,scope));
      const cats=categories[scope];
      const weeks=[];
      for(let week=monday(start);week<=end;week+=7*DAY){
        const from=Math.max(start,week), to=Math.min(end,week+6*DAY);
        const group=set.filter(r=>stamp(r.date)>=from&&stamp(r.date)<=to);
        const counts=cats.map(([k])=>group.filter(r=>category(r,scope)===k).length);
        const examples=[];
        const ranked=[...group].sort((a,b)=>stamp(b.date)-stamp(a.date));
        const unique=new Set();
        const pick=[...cats.map(([k])=>ranked.find(r=>category(r,scope)===k)).filter(Boolean),...ranked];
        for(const r of pick){if(unique.has(r.id))continue;unique.add(r.id);const item=example(r);if(item)examples.push(item);if(examples.length===3)break;}
        weeks.push({from:iso(from),to:iso(to),label:`${short.format(from)} to ${short.format(to)}`,short:short.format(from),
          partial:from!==week||to===end,total:group.length,counts,examples});
      }
      series[scope]={total:set.length,categories:cats.map(([,label])=>label),weeks};
    }
    windows[days]={start:iso(start),end:iso(end),series};
  }
  return {asOf:iso(end),windows};
}
