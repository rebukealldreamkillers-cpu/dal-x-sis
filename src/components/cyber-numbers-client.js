import { buildNumbers } from './cyber-numbers-data.js';
import { mergeReporting } from './cyber-reporting-data.js';
import { onCyberFeed } from './cyber-live-state.js';

const names={reviewed:'Reviewed entries',agent:'AI agent security',public:'Public records'};
const count=new Intl.NumberFormat('en-US');
const el=(tag,text='',cls='')=>{
  const node=document.createElement(tag);
  if(text)node.textContent=text;
  if(cls)node.className=cls;
  return node;
};
const color=(i)=>`var(--chart-${i})`;
const csvCell=(v)=>`"${String(v).replace(/"/g,'""')}"`;
function init(root){
  const get=s=>root.querySelector(s);
  const archive=JSON.parse(get('[data-numbers-json]').textContent);
  let data=buildNumbers(mergeReporting(archive));
  const scope=get('[data-numbers-scope]'), range=get('[data-numbers-window]');
  const bars=get('[data-numbers-bars]'), legend=get('[data-numbers-legend]'), table=get('[data-numbers-table]');
  const detailTitle=get('[data-numbers-detail-title]'), detailCount=get('[data-numbers-detail-count]');
  const breakdown=get('[data-numbers-detail-list]'), examples=get('[data-numbers-examples]');
  const panel=get('[data-numbers-interactive]');
  let selected=0;
  const current=()=>data.windows[range.value].series[scope.value];
  function drawDetail(index){
    if(index===selected && detailTitle.textContent)return;
    selected=index;
    const chart=current(), w=chart.weeks[index];
    detailTitle.textContent=w.label;
    detailCount.textContent=`${count.format(w.total)} ${w.total===1?'entry':'entries'}${w.partial ? ' · Partial week' : ''}`;
    breakdown.replaceChildren(...chart.categories.map((cat,i)=>{
      const li=el('li');li.append(el('span',cat),el('strong',count.format(w.counts[i])));return li;
    }));
    examples.replaceChildren();
    if(w.examples.length){
      examples.append(el('strong','Source examples'));
      for(const [title,url,source] of w.examples){
        let parsed;
        try{parsed=new URL(url);if(parsed.protocol!=='https:')continue;}catch{continue;}
        const a=el('a',title);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';a.append(el('small',source));examples.append(a);
      }
    }else examples.append(el('p','No matching records in this week.'));
    for(const [i,b] of Array.from(bars.children).entries()) b.setAttribute('aria-pressed',String(i===index));
  }
  function makeTable(chart){
    const columns=['Disclosure week','Total',...chart.categories];
    const head=el('thead'), tr=el('tr');
    for(const c of columns){const th=el('th',c);th.scope='col';tr.append(th);}
    head.append(tr);
    const body=el('tbody');
    for(const w of chart.weeks){
      const row=el('tr');const label=el('th',w.label+(w.partial?' *':''));label.scope='row';row.append(label);
      for(const [i,n] of [w.total,...w.counts].entries()){const cell=el('td',count.format(n));cell.dataset.label=columns[i+1];row.append(cell);}
      body.append(row);
    }
    table.replaceChildren(head,body);
  }
  function draw(){
    const windowData=data.windows[range.value], chart=current();
    for(const [key,group] of Object.entries(windowData.series))get(`[data-figure="${key}"]`).textContent=count.format(group.total);
    get('[data-numbers-chart-title]').textContent=`${names[scope.value]} by week`;
    const peak=Math.max(1,...chart.weeks.map(w=>w.total));
    const interval=peak<=4?1:peak<=12?2:peak<=40?5:peak<=100?10:25;
    const top=Math.max(2,2*interval*Math.ceil(peak/(2*interval)));
    get('[data-numbers-ceiling]').textContent=count.format(top);
    get('[data-numbers-middle]').textContent=count.format(top/2);
    bars.style.setProperty('--week-count',chart.weeks.length);
    bars.replaceChildren(...chart.weeks.map((week,i)=>{
      const b=el('button','','numbers-bar');b.type='button';
      b.setAttribute('aria-label',`${week.label}: ${count.format(week.total)} entries${week.partial?', partial week':''}`);
      b.setAttribute('aria-pressed','false');b.style.setProperty('--bar-height',`${week.total/top*100}%`);
      const stack=el('span','','numbers-stack');stack.setAttribute('aria-hidden','true');
      for(const [offset,n] of week.counts.entries())if(n){const part=el('span','','numbers-segment');part.style.setProperty('--tone',color(offset));part.style.height=`${n/week.total*100}%`;stack.append(part);}
      const label=el('span',week.short+(week.partial?'*':''),'numbers-axis');label.setAttribute('aria-hidden','true');
      const tip=el('span',count.format(week.total),'numbers-tip');tip.setAttribute('aria-hidden','true');
      b.append(stack,label,tip);
      b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')drawDetail(i);});
      b.addEventListener('click',()=>drawDetail(i));b.addEventListener('focus',()=>drawDetail(i));
      b.addEventListener('keydown',e=>{
        const delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;
        if(delta){e.preventDefault();bars.children[Math.max(0,Math.min(chart.weeks.length-1,i+delta))]?.focus();}
      });
      return b;
    }));
    legend.replaceChildren(...chart.categories.map((c,i)=>{const li=el('li');const square=el('span','','numbers-swatch');square.style.setProperty('--tone',color(i));li.append(square,el('span',c));return li;}));
    makeTable(chart);
    detailTitle.textContent='';drawDetail(Math.max(0,chart.weeks.findLastIndex(w=>w.total>0)));
  }
  scope.addEventListener('change',draw);range.addEventListener('change',draw);
  get('[data-numbers-download]').addEventListener('click',()=>{
    const chart=current();
    const rows=[['Window start','Window end','Partial week','Total',...chart.categories],...chart.weeks.map(w=>[w.from,w.to,w.partial?'yes':'no',w.total,...w.counts])];
    const content=rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const link=el('a');link.href=url;link.download=`dal-x-${scope.value}-${range.value}d-${data.asOf}.csv`;root.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  draw();panel.hidden=false;
  let lastStamp;
  onCyberFeed(({feed,delayed})=>{
    const stamp=feed?.generatedAt;
    get('[data-numbers-status]').textContent=!stamp ? 'Published archive through' : delayed || feed.failedSources?.length ? 'Latest available records through' : 'Archive and live records through';
    if (!stamp || stamp===lastStamp) return;
    lastStamp=stamp;
    data=buildNumbers(mergeReporting(archive,feed));
    const time=get('[data-numbers-asof]');time.dateTime=data.asOf;time.textContent=data.asOf;
    draw();
  });
}

document.querySelectorAll('[data-cyber-numbers]').forEach(init);
