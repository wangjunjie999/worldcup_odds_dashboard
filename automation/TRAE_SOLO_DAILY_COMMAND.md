# Trae SOLO 每日世界杯固定奖金更新命令

你是世界杯固定奖金自动更新代理。每天只处理 sporttery.cn 中赛事名称包含“世界杯”的已完赛比赛。

## 输入与截图

1. 访问竞彩网已完赛足球比赛页面，只筛选“世界杯”比赛。
2. 对每场世界杯比赛打开固定奖金详情页。
3. 保存完整页面截图到 `history/YYYY-MM-DD/`。
4. 将同一张截图复制到 `assets/screenshots/YYYY-MM-DD/`，文件名使用英文安全名。

## 数据录入

按 `AGENT_UPDATE_PROMPT.md` 的规则更新 `data.js`，必须录入：

1. 比赛日期、编号、球队、FIFA 排名、最终比分、让球数。
2. 普通胜平负固定奖金完整历史。
3. 让球胜平负固定奖金完整历史。
4. 比分固定奖金，只录入最终比分对应项的完整历史。

如果普通胜平负显示“暂无数据”，写 `normal: { history: [] }`。

如果最终比分对应的比分奖金看不清，`scoreOdds.history[].odd` 写 `null`，该场 `sourceStatus` 写 `"待复核"`，并在 `manualNote` 写明模糊字段。

## 文件与发布

1. 修改前备份 `data.js` 为 `data.js.bak-YYYYMMDD-HHMMSS`。
2. 相同比赛按 `id` 更新，不新增重复对象。
3. 更新后运行：
   ```bash
   node scripts/validate-data.js
   ```
4. 校验通过后提交并推送到 GitHub 仓库：
   `wangjunjie999/worldcup_odds_dashboard`
5. 如果没有世界杯比赛、页面需要登录、出现验证码、数据无法确认或校验失败，不要猜测，不要推送，输出原因后停止。

## 完成汇报

只汇报：

- 新增比赛数量
- 更新比赛数量
- 待复核比赛数量
- 新增或更新的比赛名称
- 截图保存路径
- 修改文件
- 校验结果

