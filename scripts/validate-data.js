const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data.js");
const code = fs.readFileSync(dataPath, "utf8");
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(code, context, { filename: "data.js" });

const matches = context.window.MATCHES;
const groups = context.window.GROUPS;
const teamMeta = context.window.TEAM_META;
const bracket = context.window.KNOCKOUT_BRACKET;
const errors = [];

function fail(message) {
  errors.push(message);
}

function isNumberOrNull(value) {
  return typeof value === "number" || value === null;
}

function timeKey(value) {
  return String(value || "").replace(/[-: ]/g, "");
}

if (!Array.isArray(matches)) fail("window.MATCHES 不是数组");
if (!Array.isArray(groups)) fail("window.GROUPS 不是数组");
if (!teamMeta || typeof teamMeta !== "object") fail("window.TEAM_META 缺失");
if (!bracket || !Array.isArray(bracket.matches)) fail("window.KNOCKOUT_BRACKET.matches 缺失");

const ids = new Set();
const requiredFields = [
  "id",
  "date",
  "code",
  "teamA",
  "teamB",
  "rankA",
  "rankB",
  "score",
  "handicap",
  "host",
  "sourceStatus",
  "sourceImage",
  "manualNote"
];

for (const match of matches || []) {
  for (const field of requiredFields) {
    if (!(field in match)) fail(`${match.id || "未知比赛"} 缺少字段 ${field}`);
  }

  if (ids.has(match.id)) fail(`重复 id: ${match.id}`);
  ids.add(match.id);

  if (match.sourceImage && !fs.existsSync(path.join(root, match.sourceImage))) {
    fail(`${match.id} sourceImage 不存在: ${match.sourceImage}`);
  }

  for (const team of [match.teamA, match.teamB]) {
    if (!teamMeta?.[team]) fail(`${match.id} TEAM_META 缺少球队: ${team}`);
  }

  for (const section of ["normal", "handicapOdds"]) {
    const history = match[section]?.history;
    if (!Array.isArray(history)) {
      fail(`${match.id} ${section}.history 不是数组`);
      continue;
    }
    history.forEach((row, index) => {
      if (index > 0 && timeKey(history[index - 1].time) > timeKey(row.time)) {
        fail(`${match.id} ${section} 时间未升序: ${row.time}`);
      }
      for (const key of ["win", "draw", "lose"]) {
        if (!isNumberOrNull(row[key])) fail(`${match.id} ${section}.${key} 非数字/null`);
      }
    });
  }

  const scoreHistory = match.scoreOdds?.history;
  if (!match.scoreOdds?.label || !Array.isArray(scoreHistory) || scoreHistory.length === 0) {
    fail(`${match.id} 比分赔率 scoreOdds 缺失`);
  } else {
    scoreHistory.forEach((row, index) => {
      if (index > 0 && timeKey(scoreHistory[index - 1].time) > timeKey(row.time)) {
        fail(`${match.id} scoreOdds 时间未升序: ${row.time}`);
      }
      if (!isNumberOrNull(row.odd)) fail(`${match.id} scoreOdds.odd 非数字/null`);
    });
  }
}

if ((groups || []).length !== 12) fail(`GROUPS 数量应为 12，实际 ${(groups || []).length}`);
if ((bracket?.matches || []).length !== 32) fail(`淘汰赛节点应为 32，实际 ${(bracket?.matches || []).length}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`校验通过：${matches.length} 场比赛，${groups.length} 个小组，${bracket.matches.length} 个淘汰赛节点。`);

