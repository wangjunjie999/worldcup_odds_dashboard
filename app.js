
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { q:"", handicap:"all", tier:"all", status:"all", sort:"date-desc", compact:false };

function firstAndLast(history=[]){
  if(!history.length) return [null,null];
  return [history[0], history[history.length-1]];
}
function favoriteOdd(match){
  const [open, close] = firstAndLast(match.normal?.history || []);
  if(close) return Math.min(close.win, close.draw, close.lose);
  const [hOpen,hClose] = firstAndLast(match.handicapOdds?.history || []);
  return hClose ? Math.min(hClose.win,hClose.draw,hClose.lose) : 99;
}
function tierFor(match){
  const odd = favoriteOdd(match);
  if(odd <= 1.35) return {key:"extreme",name:"极热档",color:"var(--tier-extreme)"};
  if(odd <= 1.55) return {key:"strong",name:"强热档",color:"var(--tier-strong)"};
  if(odd <= 1.80) return {key:"mid",name:"中热档",color:"var(--tier-mid)"};
  if(odd <= 2.30) return {key:"balanced",name:"均衡档",color:"var(--tier-balanced)"};
  return {key:"high",name:"高赔档",color:"var(--tier-high)"};
}
function arrow(a,b){
  if(a==null||b==null) return `<span class="arrow-flat">—</span>`;
  const d = +(b-a).toFixed(2);
  if(Math.abs(d)<0.005) return `<span class="arrow-flat">—</span>`;
  return d>0 ? `<span class="arrow-up">↑${d.toFixed(2)}</span>` : `<span class="arrow-down">↓${Math.abs(d).toFixed(2)}</span>`;
}
function fmt(v){return v==null?"—":Number(v).toFixed(2)}
function handicapText(h){ return h>0?`+${h}`:`${h}` }
function resultOf(match){
  const [a,b]=match.score;
  const normal = a>b?"胜":a===b?"平":"负";
  const ha = a + match.handicap;
  const hResult = ha>b?"让胜":ha===b?"让平":"让负";
  let cls = "push", label = hResult;
  if((match.handicap<0 && hResult==="让胜") || (match.handicap>0 && hResult==="让负")) cls="hit";
  else if(hResult==="让平") cls="push";
  else cls="cold";
  return {normal,hResult,cls,label:`${normal} / ${hResult}`};
}
function movementSummary(match){
  const [o,c]=firstAndLast(match.normal?.history||[]);
  const [ho,hc]=firstAndLast(match.handicapOdds?.history||[]);
  let parts=[];
  if(o&&c){
    const favIndex = [["胜","win"],["平","draw"],["负","lose"]].sort((x,y)=>o[x[1]]-o[y[1]])[0];
    const d=c[favIndex[1]]-o[favIndex[1]];
    parts.push(`${favIndex[0]}项由 ${fmt(o[favIndex[1]])} ${d<0?"降至":"升至"} ${fmt(c[favIndex[1]])}`);
    const drawD=c.draw-o.draw;
    if(Math.abs(drawD)>=.05) parts.push(`平赔${drawD>0?"抬高":"压低"} ${Math.abs(drawD).toFixed(2)}`);
  }else if(ho&&hc){
    const minKey=["win","draw","lose"].sort((x,y)=>ho[x]-ho[y])[0];
    const names={win:"让胜",draw:"让平",lose:"让负"};
    parts.push(`${names[minKey]}由 ${fmt(ho[minKey])} 变为 ${fmt(hc[minKey])}`);
  }
  return parts.join("；") || "当前截图未录入可比较的初终盘数据";
}
function sparkline(history,key,color){
  if(!history || history.length<2) return `<div class="spark"></div>`;
  const vals=history.map(x=>x[key]).filter(x=>x!=null);
  if(!vals.length) return `<div class="spark"></div>`;
  const min=Math.min(...vals), max=Math.max(...vals), span=Math.max(.01,max-min);
  const points=history.map((x,i)=>{
    const px=4+i*(92/(history.length-1));
    const py=38-((x[key]-min)/span)*30;
    return `${px},${py}`;
  }).join(" ");
  return `<div class="spark"><svg viewBox="0 0 100 42" preserveAspectRatio="none">
    <line x1="0" y1="38" x2="100" y2="38" stroke="#243551" stroke-width="1"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
  </svg></div>`;
}
function oddLabel(key){
  return {win:"胜",draw:"平",lose:"负"}[key] || "胜";
}
function handicapOddLabel(key){
  return {win:"让胜",draw:"让平",lose:"让负"}[key] || "让胜";
}
function lowestOddKey(history=[]){
  const [, close] = firstAndLast(history);
  if(!close) return "win";
  return ["win","draw","lose"].reduce((best,key)=>{
    if(close[key]==null) return best;
    if(close[best]==null || close[key] < close[best]) return key;
    return best;
  }, "win");
}
function initialLowestOddKey(history=[]){
  const [open] = firstAndLast(history);
  if(!open) return "win";
  return ["win","draw","lose"].reduce((best,key)=>{
    if(open[key]==null) return best;
    if(open[best]==null || open[key] < open[best]) return key;
    return best;
  }, "win");
}
function deltaArrow(a,b,withAmount=true){
  if(a==null || b==null) return "";
  const d = +(b-a).toFixed(2);
  if(Math.abs(d)<0.005) return "";
  const amount = withAmount ? Math.abs(d).toFixed(2) : "";
  return d>0 ? `<span class="arrow-up">↑${amount}</span>` : `<span class="arrow-down">↓${amount}</span>`;
}
function trendText(history=[], labelFor=oddLabel){
  const [open, close] = firstAndLast(history);
  if(!open || !close) return "待补";
  const key = initialLowestOddKey(history);
  return `${labelFor(key)} ${fmt(open[key])} → ${fmt(close[key])} ${deltaArrow(open[key],close[key])}`.trim();
}
function scoreTrendText(scoreOdds){
  const history = scoreOdds?.history || [];
  const [open, close] = firstAndLast(history);
  if(!scoreOdds?.label || !open || !close) return "待补";
  return `${scoreOdds.label} ${fmt(open.odd)} → ${fmt(close.odd)} ${deltaArrow(open.odd,close.odd)}`.trim();
}
function oddsWithStepArrow(history,index,key){
  const row = history[index];
  if(!row) return "—";
  const prev = index>0 ? history[index-1] : null;
  return `${fmt(row[key])}${prev ? deltaArrow(prev[key],row[key],false) : ""}`;
}
function scoreOddWithStepArrow(history,index){
  const row = history[index];
  if(!row) return "—";
  const prev = index>0 ? history[index-1] : null;
  return `${fmt(row.odd)}${prev ? deltaArrow(prev.odd,row.odd,false) : ""}`;
}
function trendStrip(match){
  return `<div class="trend-strip">
    <div class="trend-chip"><span>胜平负</span><b>${trendText(match.normal?.history,oddLabel)}</b></div>
    <div class="trend-chip"><span>让球 ${handicapText(match.handicap)}</span><b>${trendText(match.handicapOdds?.history,handicapOddLabel)}</b></div>
    <div class="trend-chip"><span>比分</span><b>${scoreTrendText(match.scoreOdds)}</b></div>
  </div>`;
}
function marketBlock(title, history){
  if(!history?.length){
    return `<section class="market"><h3>${title}<span>暂无数据</span></h3><div class="empty" style="padding:24px">截图未提供或尚未录入</div></section>`;
  }
  const [o,c]=firstAndLast(history);
  const sparkKey=lowestOddKey(history);
  return `<section class="market">
    <h3>${title}<span>${history.length} 个节点 · 曲线：${oddLabel(sparkKey)}</span></h3>
    <div class="odds-head"><span>阶段</span><span>胜</span><span>平</span><span>负</span></div>
    <div class="odds-row"><span>初盘</span><b>${fmt(o.win)}</b><b>${fmt(o.draw)}</b><b>${fmt(o.lose)}</b></div>
    <div class="odds-row"><span>终盘</span><b>${fmt(c.win)}</b><b>${fmt(c.draw)}</b><b>${fmt(c.lose)}</b></div>
    <div class="odds-row"><span>变化</span><b>${arrow(o.win,c.win)}</b><b>${arrow(o.draw,c.draw)}</b><b>${arrow(o.lose,c.lose)}</b></div>
    ${sparkline(history,sparkKey,"#55d6ff")}
  </section>`;
}
function oddsHistorySection(title, history){
  if(!history?.length) return `<section class="detail-section"><h4>${title}</h4><div class="empty small-empty">暂无数据</div></section>`;
  return `<section class="detail-section">
    <h4>${title}</h4>
    <div class="table-wrap"><table><thead><tr><th>时间</th><th>胜</th><th>平</th><th>负</th></tr></thead>
      <tbody>${history.map((r,i)=>`<tr><td>${r.time}</td><td>${oddsWithStepArrow(history,i,"win")}</td><td>${oddsWithStepArrow(history,i,"draw")}</td><td>${oddsWithStepArrow(history,i,"lose")}</td></tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}
function scoreOddsSection(match){
  const history = match.scoreOdds?.history || [];
  if(!history.length) return `<section class="detail-section"><h4>比分固定奖金</h4><div class="empty small-empty">比分：待补</div></section>`;
  const rows = history.length===1 ? [history[0]] : [history[0],history[history.length-1]];
  return `<section class="detail-section">
    <h4>比分固定奖金</h4>
    <div class="table-wrap"><table><thead><tr><th>比分</th><th>阶段</th><th>时间</th><th>奖金</th></tr></thead>
      <tbody>${rows.map((r,i)=>`<tr><td>${match.scoreOdds.label}</td><td>${i===0?"初始奖金":"结算奖金"}</td><td>${r.time}</td><td>${scoreOddWithStepArrow(rows,i)}</td></tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}
function historySections(match){
  return [
    oddsHistorySection("胜平负完整变化",match.normal?.history),
    oddsHistorySection(`让球胜平负完整变化（${handicapText(match.handicap)}）`,match.handicapOdds?.history),
    scoreOddsSection(match)
  ].join("");
}
function card(match){
  const tier=tierFor(match), result=resultOf(match);
  return `<article class="card" data-id="${match.id}" style="--tier:${tier.color}">
    <div class="card-head">
      <div class="team"><div class="team-name">${match.teamA}</div><div class="rank">排名 ${match.rankA??"—"}</div></div>
      <div>
        <div class="score">${match.score[0]} : ${match.score[1]}</div>
        <div class="badges">
          <span class="badge">${match.code}</span>
          <span class="badge">让球 ${handicapText(match.handicap)}</span>
          <span class="badge">${tier.name}</span>
          ${match.host?`<span class="badge host">东道主</span>`:""}
          <span class="badge ${match.sourceStatus==="已录入"?"verify":"review"}">${match.sourceStatus}</span>
        </div>
      </div>
      <div class="team"><div class="team-name">${match.teamB}</div><div class="rank">排名 ${match.rankB??"—"}</div></div>
    </div>
    <div class="card-meta"><span>${match.date}</span><span>${match.host?"东道主场景":"世界杯中立场"}</span></div>
    ${trendStrip(match)}
    <div class="odds-grid">
      ${marketBlock("胜平负固定奖金",match.normal?.history)}
      ${marketBlock(`让球胜平负（${handicapText(match.handicap)}）`,match.handicapOdds?.history)}
    </div>
    <div class="analysis">
      <p><b>盘面：</b>${movementSummary(match)}。<br><b>复盘：</b>${match.manualNote}</p>
      <div class="outcome ${result.cls}">${result.label}</div>
    </div>
    <div class="details">
      <div class="details-actions"><b>完整变化节点</b>
        ${match.sourceImage?`<a class="source-link" href="${match.sourceImage}" target="_blank">打开原始截图 ↗</a>`:`<span class="source-link">原图待补</span>`}
      </div>
      ${historySections(match)}
    </div>
  </article>`;
}
function filtered(){
  let list=window.MATCHES.filter(m=>{
    const tier=tierFor(m).key;
    const text=`${m.teamA}${m.teamB}${m.code}${m.date}`.toLowerCase();
    return (!state.q||text.includes(state.q.toLowerCase()))
      && (state.handicap==="all"||String(m.handicap)===state.handicap)
      && (state.tier==="all"||tier===state.tier)
      && (state.status==="all"||m.sourceStatus===state.status);
  });
  list.sort((a,b)=>{
    if(state.sort==="date-desc") return b.date.localeCompare(a.date);
    if(state.sort==="date-asc") return a.date.localeCompare(b.date);
    if(state.sort==="favorite") return favoriteOdd(a)-favoriteOdd(b);
    if(state.sort==="handicap") return a.handicap-b.handicap;
    return 0;
  });
  return list;
}
function render(){
  document.body.classList.toggle("compact",state.compact);
  const list=filtered();
  const groups=[...new Set(list.map(m=>m.handicap))].sort((a,b)=>a-b);
  $("#content").innerHTML=groups.map(h=>{
    const ms=list.filter(m=>m.handicap===h);
    return `<section class="group">
      <div class="group-title"><h2>让球 ${handicapText(h)} 档</h2><small>${ms.length} 场</small></div>
      <div class="cards">${ms.map(card).join("")}</div>
    </section>`;
  }).join("") || `<div class="empty">没有符合当前筛选条件的比赛。</div>`;
  updateStats(list);
}
function updateStats(list){
  const hosts=list.filter(m=>m.host).length;
  const verified=list.filter(m=>m.sourceStatus==="已录入").length;
  const cold=list.filter(m=>resultOf(m).cls==="cold").length;
  const pushes=list.filter(m=>resultOf(m).cls==="push").length;
  const deep=list.filter(m=>Math.abs(m.handicap)>=2).length;
  $("#stats").innerHTML=[
    ["比赛数",list.length],["已核对",verified],["东道主",hosts],
    ["深盘场次",deep],["反向赛果",cold],["让球走盘",pushes]
  ].map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join("");
}
$("#search").addEventListener("input",e=>{state.q=e.target.value.trim();render()});
$("#handicap").addEventListener("change",e=>{state.handicap=e.target.value;render()});
$("#tier").addEventListener("change",e=>{state.tier=e.target.value;render()});
$("#status").addEventListener("change",e=>{state.status=e.target.value;render()});
$("#sort").addEventListener("change",e=>{state.sort=e.target.value;render()});
$("#compactBtn").addEventListener("click",()=>{state.compact=!state.compact;$("#compactBtn").textContent=state.compact?"展开模式":"紧凑模式";render()});
$("#content").addEventListener("click",e=>{
  const card=e.target.closest(".card");
  if(!card || e.target.closest("a")) return;
  card.classList.toggle("open");
});
render();
