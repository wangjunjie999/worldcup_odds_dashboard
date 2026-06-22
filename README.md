# 世界杯赔率变化静态分析页

## 直接运行

双击 `index.html` 即可离线打开。页面不依赖服务器，也不依赖 npm。

推荐目录固定为：

```text
worldcup_odds_dashboard/
├─ index.html
├─ styles.css
├─ app.js
├─ data.js
├─ AGENT_UPDATE_PROMPT.md
└─ assets/
   └─ screenshots/
```

## 页面功能

- 按让球 `-3 / -2 / -1 / +1 / +2` 自动分组。
- 按热门赔率分为极热、强热、中热、均衡、高赔五档，并使用不同颜色。
- 搜索球队、比赛编号或日期。
- 筛选让球、档位、数据状态。
- 显示普通胜平负及让球胜平负的初盘、终盘、升降幅度。
- 曲线显示该市场终盘最低赔率项的历史走势。
- 卡片总趋势显示该市场初始最低赔率项的初始奖金到结算奖金。
- 完整变化表中的箭头表示相较上一条赔率的升降；不变不显示箭头。
- 比分固定奖金只展示最终比分对应项的初始奖金和结算奖金。
- 点击比赛卡片展开完整赔率变化节点和原始截图。
- 加拿大、美国、墨西哥显示“东道主”；其余按世界杯中立场处理。

## 每天新增比赛

不要直接改 `index.html`。只需要：

1. 将新截图放入 `assets/screenshots/YYYY-MM-DD/`。
2. 按 `AGENT_UPDATE_PROMPT.md` 的提示词交给可执行命令的代理。
3. 代理读取截图后更新 `data.js`。
4. 双击 `index.html` 检查页面。

## 数据对象格式

```js
{
  id: "2026-06-16-team-a-team-b",
  date: "2026-06-16",
  code: "比赛编号",
  teamA: "队伍A",
  teamB: "队伍B",
  rankA: 10,
  rankB: 25,
  score: [2, 1],
  handicap: -1,
  host: false,
  sourceStatus: "已录入",
  sourceImage: "assets/screenshots/2026-06-16/example.png",
  normal: {
    history: [
      {time:"06-15 10:02", win:1.74, draw:3.10, lose:4.30},
      {time:"06-16 20:30", win:1.67, draw:3.35, lose:4.30}
    ]
  },
  handicapOdds: {
    history: [
      {time:"06-15 10:02", win:3.55, draw:3.30, lose:1.84},
      {time:"06-16 20:30", win:3.32, draw:3.17, lose:1.95}
    ]
  },
  scoreOdds: {
    label: "2:1",
    history: [
      {time:"06-15 10:02", odd:6.90},
      {time:"06-16 20:30", odd:5.75}
    ]
  },
  manualNote: "简短复盘。"
}
```

`history` 第一条必须是初盘，最后一条必须是终盘，中间按时间升序排列。

## GitHub Pages 发布

推荐发布到公开仓库：

```text
https://github.com/wangjunjie999/worldcup_odds_dashboard
```

启用 GitHub Pages 后，手机和其他电脑访问：

```text
https://wangjunjie999.github.io/worldcup_odds_dashboard/
```

发布前请排除 `*.bak-*` 备份文件；仓库已包含 `.gitignore` 和 `.nojekyll`。

## 自动更新

智能体每日更新命令保存在：

```text
automation/TRAE_SOLO_DAILY_COMMAND.md
```

更新完成后必须运行：

```bash
node scripts/validate-data.js
```

校验通过后再提交并推送 GitHub。仓库包含 `.github/workflows/daily-worldcup-agent.yml`，当前用于每日校验和保留云端任务入口；真正无人值守抓取需要把 Trae SOLO 或其他云端代理接入该命令。
