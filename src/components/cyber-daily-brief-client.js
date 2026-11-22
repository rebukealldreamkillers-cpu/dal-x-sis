import { onCyberFeed } from './cyber-live-state.js';

const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const dateFormatter=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'});
const checkFormatter=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const labels={breach:['breach notice','breach notices'],advisory:['advisory','advisories'],kev:['exploited vulnerability entry','exploited vulnerability entries'],filing:['filing','filings'],agency:['agency announcement','agency announcements']};
const dateKey=(value=new Date())=>{
  const p=Object.fromEntries(dayFormatter.formatToParts(value).map(j=>[j.type,j.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const atUTC=(day)=>Date.parse(`${day}T00:00:00Z`);
const quantity=(n,one,many)=>`${n.toLocaleString('en-US')} ${n===1?one:many}`;
const breakdown=(row)=>Object.entries(row.byType).filter(([k,n])=>labels[k]&&Number.isInteger(n)&&n>0)
  .sort((a,b)=>b[1]-a[1]).map(([k,n])=>quantity(n,...labels[k])).join(', ');

function init(root){
  const q=(s)=>root.querySelector(s);
  const copy=q('[data-daily-copy]'), detail=q('[data-daily-detail]'), record=q('[data-daily-record]'), time=q('[data-daily-time]');
  let state={feed:null,delayed:false}, priorDate='';
  function render(){
    priorDate=dateKey();
    const y=new Date(atUTC(priorDate)-86_400_000).toISOString().slice(0,10);
    const brief=state.feed?.dailyBrief;
    const current=brief?.days?.[priorDate], yesterday=brief?.days?.[y];
    detail.hidden=true;record.hidden=true;record.replaceChildren();
    if(!current || !yesterday || !brief.checkedSources){
      copy.textContent=state.delayed || state.feed ? 'The daily comparison is unavailable. Reviewed incidents and the archive are still available below.' : 'Checking the latest public disclosures.';
      time.textContent='Reporting days use Eastern Time';return;
    }
    const n=quantity(current.total,'public record','public records'), prev=quantity(yesterday.total,'record','records');
    const date=dateFormatter.format(atUTC(priorDate)), yd=dateFormatter.format(atUTC(y));
    const group=quantity(brief.checkedSources,'source','sources');
    const checkedAt=Date.parse(state.feed.generatedAt);
    const checkedToday=dateKey(new Date(checkedAt))===priorDate;
    copy.textContent=checkedToday
      ? `The latest check found ${n} dated today (${date}), compared with ${prev} dated yesterday (${yd}), from the same ${group}.`
      : `Today’s publisher check has not run yet. The last check found ${prev} dated yesterday (${yd}) from ${group}.`;
    const todayBreakdown=breakdown(current), yesterdayBreakdown=breakdown(yesterday);
    if((checkedToday && todayBreakdown) || yesterdayBreakdown){
      detail.textContent=`${checkedToday?`Today: ${todayBreakdown || 'none returned'}. `:''}Yesterday: ${yesterdayBreakdown || 'none returned'}.`;
      detail.hidden=false;
    }
    const recentDay=Object.keys(brief.days).filter(day=>day<y && brief.days[day].total>0).sort().at(-1);
    const previous=recentDay ? brief.days[recentDay] : null;
    if(!current.total && !yesterday.total && previous){
      detail.textContent=`The most recent records in this comparison were dated ${dateFormatter.format(atUTC(recentDay))}: ${breakdown(previous)}.`;
      detail.hidden=false;
    }
    const todayExample=checkedToday && current.examples[0];
    const yesterdayExample=yesterday.examples[0];
    const pick=todayExample || yesterdayExample || previous?.examples[0];
    if(pick){
      try{
        const url=new URL(pick.url);
        if(url.protocol==='https:' && !url.username && !url.password && !url.port){
          const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=pick.title;
          record.append(`${todayExample?'Today’s source example':yesterdayExample?'Yesterday’s source example':'Earlier source example'}: `,a,` (${pick.source}).`);record.hidden=false;
        }
      }catch{}
    }
    const problems=state.feed.connectedSources-brief.checkedSources;
    const warning=state.delayed||Date.now()-checkedAt>2*60*60_000 ? ' · Using saved check' : '';
    time.textContent=`Checked ${checkFormatter.format(checkedAt)}${problems>0?` · ${quantity(problems,'source excluded','sources excluded')}`:''}${warning}`;
  }
  onCyberFeed(next=>{state=next;render();});
  setInterval(()=>{if(dateKey()!==priorDate)render();},60_000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && dateKey()!==priorDate)render();});
}
document.querySelectorAll('[data-cyber-daily]').forEach(init);
