const $ = s => document.querySelector(s);

const ROUND_LABELS = {
  r32: "32强",
  r16: "16强",
  qf: "8强",
  sf: "半决赛",
  final: "决赛",
  third: "季军赛"
};

const BRACKET_DIMENSIONS = {
  colWidth: 190,
  colGap: 18,
  rowHeight: 66,
  cols: 9,
  rows: 16
};
const MOBILE_BRACKET_QUERY = "(max-width: 900px)";

const BRACKET_LAYOUT = {
  73: { col: 1, row: 1 }, 74: { col: 1, row: 3 }, 75: { col: 1, row: 5 }, 76: { col: 1, row: 7 },
  77: { col: 1, row: 9 }, 78: { col: 1, row: 11 }, 79: { col: 1, row: 13 }, 80: { col: 1, row: 15 },
  89: { col: 2, row: 2 }, 90: { col: 2, row: 6 }, 91: { col: 2, row: 10 }, 92: { col: 2, row: 14 },
  97: { col: 3, row: 4 }, 98: { col: 3, row: 12 }, 101: { col: 4, row: 8 },
  104: { col: 5, row: 8 }, 103: { col: 5, row: 12 },
  102: { col: 6, row: 8 }, 99: { col: 7, row: 4 }, 100: { col: 7, row: 12 },
  93: { col: 8, row: 2 }, 94: { col: 8, row: 6 }, 95: { col: 8, row: 10 }, 96: { col: 8, row: 14 },
  81: { col: 9, row: 1 }, 82: { col: 9, row: 3 }, 83: { col: 9, row: 5 }, 84: { col: 9, row: 7 },
  85: { col: 9, row: 9 }, 86: { col: 9, row: 11 }, 87: { col: 9, row: 13 }, 88: { col: 9, row: 15 }
};

const ROUND_HEADINGS = ["32强", "16强", "8强", "半决赛", "决赛", "半决赛", "8强", "16强", "32强"];

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function groups(){
  return window.GROUPS || [];
}

function matches(){
  return window.MATCHES || [];
}

function meta(team){
  return (window.TEAM_META || {})[team] || { name: team, fifaCode: "—", fifaRank: null, flag: "" };
}

function bracketMatches(){
  return window.KNOCKOUT_BRACKET?.matches || [];
}

function emptyStanding(team, group, seed){
  const info = meta(team);
  return {
    team,
    group,
    seed,
    tieSeed: seed,
    played: 0,
    win: 0,
    draw: 0,
    lose: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    fifaRank: info.fifaRank
  };
}

function standingComparator(a,b){
  return (b.points-a.points)
    || (b.gd-a.gd)
    || (b.gf-a.gf)
    || (a.ga-b.ga)
    || a.group.localeCompare(b.group)
    || (a.tieSeed-b.tieSeed)
    || (a.seed-b.seed);
}

function thirdPlaceComparator(a,b){
  return (b.points-a.points)
    || (b.gd-a.gd)
    || (b.gf-a.gf)
    || ((a.fifaRank ?? 999) - (b.fifaRank ?? 999))
    || a.group.localeCompare(b.group)
    || (a.tieSeed-b.tieSeed)
    || (a.seed-b.seed);
}

function gdText(row){
  return row.gd > 0 ? `+${row.gd}` : row.gd;
}

function recordText(row){
  return `${row.win}/${row.draw}/${row.lose}`;
}

function goalsText(row){
  return `${row.gf}/${row.ga}`;
}

function buildStandings(){
  const groupRows = groups().map(group => ({
    ...group,
    rows: group.teams.map((team, seed) => {
      const row = emptyStanding(team, group.id, seed);
      const tieSeed = group.tieOrder?.indexOf(team);
      row.tieSeed = tieSeed >= 0 ? tieSeed : seed;
      return row;
    }),
    matchCount: 0
  }));
  const teamToGroup = new Map();
  groupRows.forEach(group => group.rows.forEach(row => teamToGroup.set(row.team, group)));

  matches().forEach(match => {
    const groupA = teamToGroup.get(match.teamA);
    const groupB = teamToGroup.get(match.teamB);
    if(!groupA || groupA !== groupB) return;
    const a = groupA.rows.find(row => row.team === match.teamA);
    const b = groupA.rows.find(row => row.team === match.teamB);
    const [goalsA, goalsB] = match.score || [];
    if(!a || !b || goalsA == null || goalsB == null) return;
    groupA.matchCount++;
    a.played++; b.played++;
    a.gf += goalsA; a.ga += goalsB;
    b.gf += goalsB; b.ga += goalsA;
    if(goalsA > goalsB){
      a.win++; b.lose++; a.points += 3;
    }else if(goalsA < goalsB){
      b.win++; a.lose++; b.points += 3;
    }else{
      a.draw++; b.draw++; a.points++; b.points++;
    }
    a.gd = a.gf - a.ga;
    b.gd = b.gf - b.ga;
  });

  groupRows.forEach(group => group.rows.sort(standingComparator));
  const thirdRows = groupRows.map(group => group.rows[2]).filter(Boolean).sort(thirdPlaceComparator);
  const bestThirdKeys = new Set(thirdRows.slice(0, 8).map(row => `${row.group}-${row.team}`));
  return { groups: groupRows, thirdRows, bestThirdKeys };
}

function rankStatus(row, index, bestThirdKeys){
  if(index < 2) return { text: "直通", cls: "direct" };
  if(index === 2 && bestThirdKeys.has(`${row.group}-${row.team}`)) return { text: "暂列晋级", cls: "third-in" };
  if(index === 2) return { text: "第三名比较", cls: "third-out" };
  return { text: "暂出局", cls: "out" };
}

function thirdRankStatus(index){
  return index < 8 ? { text: "暂列晋级", cls: "third-in" } : { text: "暂列出局", cls: "third-out" };
}

function flag(team, className="flag"){
  const info = meta(team);
  if(!info.flag) return `<span class="${className} flag-empty"></span>`;
  return `<img class="${className}" src="${esc(info.flag)}" alt="${esc(team)} 国旗">`;
}

function teamLine(team, slot=""){
  const info = meta(team);
  return `<div class="team-line">
    ${flag(team)}
    <div class="team-line-main"><b>${esc(team)}</b><span>${esc(slot || info.fifaCode)} · FIFA ${info.fifaRank ?? "—"}</span></div>
  </div>`;
}

function resolveSlot(slot, model){
  const place = /^([A-L])([123])$/.exec(slot);
  if(place){
    const group = model.groups.find(item => item.id === place[1]);
    const row = group?.rows[Number(place[2])-1];
    return { type: "team", slot, row, label: row ? `${slot} ${row.team}` : slot };
  }
  const third = /^3(.+)$/.exec(slot);
  if(third){
    const candidates = third[1].split("/");
    const active = model.thirdRows.filter(row =>
      model.bestThirdKeys.has(`${row.group}-${row.team}`) && candidates.includes(row.group)
    );
    return { type: "third", slot, candidates, active, label: slot };
  }
  const winner = /^W(\d+)$/.exec(slot);
  if(winner) return { type: "placeholder", slot, label: `胜者 M${winner[1]}` };
  const loser = /^L(\d+)$/.exec(slot);
  if(loser) return { type: "placeholder", slot, label: `负者 M${loser[1]}` };
  return { type: "placeholder", slot, label: slot };
}

function competitor(slot, model){
  const resolved = resolveSlot(slot, model);
  if(resolved.type === "team" && resolved.row){
    return `<div class="competitor resolved">
      <small>${esc(resolved.slot)}</small>
      ${teamLine(resolved.row.team, resolved.slot)}
    </div>`;
  }
  if(resolved.type === "third"){
    const active = resolved.active.length ? resolved.active : [];
    return `<div class="competitor third-slot">
      <small>${esc(resolved.slot)}</small>
      <div class="third-title">候选组 ${esc(resolved.candidates.join("/"))}</div>
      <div class="third-candidates compact">
        ${active.length ? active.map(row => {
          const info = meta(row.team);
          return `<span class="candidate-chip">${flag(row.team, "chip-flag")}<b>${esc(row.group)}3 ${esc(row.team)}</b><em>FIFA ${info.fifaRank ?? "—"}</em></span>`;
        }).join("") : `<span class="candidate-chip muted">待比较</span>`}
      </div>
    </div>`;
  }
  return `<div class="competitor placeholder">
    <small>${esc(resolved.slot)}</small>
    <b>${esc(resolved.label)}</b>
  </div>`;
}

function matchCard(match, model){
  return `<article class="bracket-match ${esc(match.round)}">
    <div class="match-code">M${esc(match.code)}</div>
    ${competitor(match.home, model)}
    <div class="versus">vs</div>
    ${competitor(match.away, model)}
  </article>`;
}

function roundColumn(round, side, model){
  const items = bracketMatches().filter(match => match.round === round && match.side === side);
  return `<section class="bracket-round bracket-${round}">
    <h3>${ROUND_LABELS[round]}</h3>
    <div class="round-stack">${items.map(match => matchCard(match, model)).join("")}</div>
  </section>`;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function isMobileBracket(){
  return window.matchMedia?.(MOBILE_BRACKET_QUERY).matches;
}

function bracketMetrics(){
  const shell = $("#fullBracket");
  if(!shell) return { ...BRACKET_DIMENSIONS, width: 0, height: 0 };
  const styles = getComputedStyle(shell);
  const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const availableWidth = Math.max(0, shell.clientWidth - horizontalPadding);
  const colGap = clamp(Math.round(availableWidth * 0.01), 8, BRACKET_DIMENSIONS.colGap);
  const colWidth = Math.max(72, (availableWidth - (BRACKET_DIMENSIONS.cols - 1) * colGap) / BRACKET_DIMENSIONS.cols);
  const rowHeight = clamp(Math.round(colWidth * 0.48), 58, BRACKET_DIMENSIONS.rowHeight);
  const width = colWidth * BRACKET_DIMENSIONS.cols + colGap * (BRACKET_DIMENSIONS.cols - 1);
  const height = BRACKET_DIMENSIONS.rows * rowHeight;
  return { ...BRACKET_DIMENSIONS, colWidth, colGap, rowHeight, width, height };
}

function bracketWidth(metrics = BRACKET_DIMENSIONS){
  const d = metrics;
  if(d.width) return d.width;
  return d.cols * d.colWidth + (d.cols - 1) * d.colGap;
}

function bracketHeight(metrics = BRACKET_DIMENSIONS){
  return metrics.height || metrics.rows * metrics.rowHeight;
}

function layoutFor(code){
  return BRACKET_LAYOUT[Number(code)];
}

function pointFor(code, edge, metrics){
  const d = metrics;
  const layout = layoutFor(code);
  if(!layout) return null;
  const left = (layout.col - 1) * (d.colWidth + d.colGap);
  const top = (layout.row - 1) * d.rowHeight;
  const x = edge === "left" ? left : left + d.colWidth;
  const y = top + d.rowHeight;
  return { x, y };
}

function connectorPath(fromCode, toCode, metrics){
  const fromLayout = layoutFor(fromCode);
  const toLayout = layoutFor(toCode);
  if(!fromLayout || !toLayout) return "";
  const towardRight = fromLayout.col < toLayout.col;
  const from = pointFor(fromCode, towardRight ? "right" : "left", metrics);
  const to = pointFor(toCode, towardRight ? "left" : "right", metrics);
  const midX = towardRight
    ? from.x + Math.max(12, (to.x - from.x) / 2)
    : from.x - Math.max(12, (from.x - to.x) / 2);
  return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
}

function connectorSvg(metrics){
  const paths = [];
  bracketMatches().forEach(match => {
    if(match.round === "third") return;
    [match.home, match.away].forEach(slot => {
      const ref = /^W(\d+)$/.exec(slot);
      if(ref){
        const d = connectorPath(Number(ref[1]), Number(match.code), metrics);
        if(d) paths.push(`<path d="${d}"></path>`);
      }
    });
  });
  return `<svg class="bracket-connectors" viewBox="0 0 ${bracketWidth(metrics)} ${bracketHeight(metrics)}" aria-hidden="true">${paths.join("")}</svg>`;
}

function bracketNode(match, model){
  const layout = layoutFor(match.code);
  if(!layout) return "";
  return `<div class="bracket-node" data-match="M${esc(match.code)}" style="grid-column:${layout.col};grid-row:${layout.row} / span 2">
    ${matchCard(match, model)}
  </div>`;
}

function renderDesktopBracket(model){
  const metrics = bracketMetrics();
  const sortedMatches = [...bracketMatches()].sort((a,b) => Number(a.code) - Number(b.code));
  const compactClass = metrics.colWidth < 126 ? " compact-tree" : "";
  const gridStyle = `--bracket-width:${bracketWidth(metrics)}px;--bracket-height:${bracketHeight(metrics)}px;--bracket-col-width:${metrics.colWidth}px;--bracket-gap:${metrics.colGap}px;--bracket-row-height:${metrics.rowHeight}px;--bracket-node-height:${Math.max(104, metrics.rowHeight * 2 - 4)}px`;
  return `<div class="full-bracket${compactClass}" style="${gridStyle}">
    <div class="bracket-round-labels">
      ${ROUND_HEADINGS.map(label => `<span>${esc(label)}</span>`).join("")}
    </div>
    <div class="bracket-canvas">
      ${connectorSvg(metrics)}
      ${sortedMatches.map(match => bracketNode(match, model)).join("")}
      <div class="champion-card" style="grid-column:5;grid-row:10 / span 1">
        <span>冠军</span>
        <b>待定</b>
      </div>
    </div>
  </div>`;
}

function renderMobileBracket(model){
  const rounds = [
    { key: "r32", label: "32强" },
    { key: "r16", label: "16强" },
    { key: "qf", label: "8强" },
    { key: "sf", label: "半决赛" },
    { key: "final", label: "决赛" },
    { key: "third", label: "季军赛" }
  ];
  return `<div class="mobile-bracket">
    ${rounds.map(round => {
      const items = bracketMatches()
        .filter(match => match.round === round.key)
        .sort((a,b) => Number(a.code) - Number(b.code));
      return `<section class="mobile-round-section mobile-round-${esc(round.key)}">
        <h3>${esc(round.label)}</h3>
        <div class="mobile-round-grid">
          ${items.map(match => matchCard(match, model)).join("")}
        </div>
      </section>`;
    }).join("")}
    <div class="mobile-champion-card">
      <span>冠军</span>
      <b>待定</b>
    </div>
  </div>`;
}

function renderBracket(model){
  const source = window.KNOCKOUT_BRACKET || {};
  $("#fullBracket").innerHTML = `<div class="board-title">
    <h2>完整晋级图</h2>
    <span>${esc(source.rankSource)} · ${esc(source.rankDate)}</span>
  </div>
  ${isMobileBracket() ? renderMobileBracket(model) : renderDesktopBracket(model)}`;
}

function renderSummary(model){
  const direct = model.groups.flatMap(group => group.rows.slice(0,2));
  const third = model.thirdRows.slice(0,8);
  const played = model.groups.reduce((sum, group) => sum + group.matchCount, 0);
  $("#bracketSummary").innerHTML = [
    ["小组前二", direct.length],
    ["第三名晋级区", third.length],
    ["已完赛", played],
    ["排名批次", window.KNOCKOUT_BRACKET?.rankDate || "—"]
  ].map(([label,value]) => `<div><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join("");
}

function renderStandings(model){
  $("#groupStandings").innerHTML = `<div class="board-title">
    <h2>小组积分榜排名</h2>
    <span>A-L 组 · 每组前二直通，第三名总排名见下方</span>
  </div>
  <div class="standings-grid">
    ${model.groups.map(group => `<section class="standing-card">
      <div class="standing-card-head"><h3>${esc(group.name)}</h3><span>${group.matchCount}/6 场</span></div>
      <div class="standing-table-wrap"><table>
        <thead><tr><th>名次</th><th>球队</th><th>FIFA</th><th>赛</th><th>胜/平/负</th><th>进/失</th><th>净</th><th>分</th><th>状态</th></tr></thead>
        <tbody>${group.rows.map((row, index) => {
          const status = rankStatus(row, index, model.bestThirdKeys);
          return `<tr class="${status.cls}">
            <td>${index+1}</td>
            <td>${teamLine(row.team, `${group.id}${index+1}`)}</td>
            <td>${row.fifaRank ?? "—"}</td>
            <td>${row.played}</td>
            <td class="record-cell">${recordText(row)}</td>
            <td>${goalsText(row)}</td>
            <td>${gdText(row)}</td>
            <td><b>${row.points}</b></td>
            <td>${status.text}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </section>`).join("")}
  </div>
  <section class="third-ranking-board">
    <div class="third-ranking-head">
      <div>
        <h3>小组第三名晋级排名</h3>
        <p>前 8 名进入 32 强；当前按积分、净胜球、进球数比较。公平竞赛分和抽签未录入时，用 FIFA 排名作临时展示顺序，需复核后再定最终同分名次。</p>
      </div>
      <span>${Math.min(model.thirdRows.length, 8)}/8 晋级区</span>
    </div>
    <div class="standing-table-wrap"><table class="third-ranking-table">
      <thead><tr><th>排名</th><th>球队</th><th>小组</th><th>赛</th><th>胜/平/负</th><th>进/失</th><th>净</th><th>分</th><th>FIFA</th><th>状态</th></tr></thead>
      <tbody>${model.thirdRows.map((row, index) => {
        const status = thirdRankStatus(index);
        return `<tr class="${status.cls}">
          <td>${index + 1}</td>
          <td>${teamLine(row.team, `${row.group}3`)}</td>
          <td>${row.group} 组</td>
          <td>${row.played}</td>
          <td class="record-cell">${recordText(row)}</td>
          <td>${goalsText(row)}</td>
          <td>${gdText(row)}</td>
          <td><b>${row.points}</b></td>
          <td>${row.fifaRank ?? "—"}</td>
          <td>${status.text}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
  </section>`;
}

function validateData(){
  const teamNames = new Set(groups().flatMap(group => group.teams));
  const missing = [...teamNames].filter(team => !window.TEAM_META?.[team]);
  if(missing.length) console.warn("TEAM_META 缺失：", missing.join(", "));
}

function render(){
  validateData();
  const model = buildStandings();
  renderSummary(model);
  renderBracket(model);
  renderStandings(model);
}

render();

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});
