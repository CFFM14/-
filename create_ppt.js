const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "倒水游戏团队";
pres.title = "倒水游戏 · Water Sort Puzzle";

// Color palette
const BG = "F7F5F0", DARK = "2B2B2B", GOLD = "D4A853", WHITE = "FFFFFF";
const MUTED = "7A7A7A", LIGHT = "F0EDE8", ACCENT = "5BC0BE";

function addFooter(slide) {
  slide.addText("2026湖南省大学生数字媒体创意设计大赛 · B3数字交互设计类", {
    x: 0.5, y: 5.1, w: 9, h: 0.4, fontSize: 9, color: MUTED, align: "center"
  });
}

// ====== Slide 1: 封面 ======
let s1 = pres.addSlide();
s1.background = { color: DARK };
s1.addText("🧪", { x: 0, y: 0.8, w: 10, h: 1.2, fontSize: 48, align: "center" });
s1.addText("倒水游戏", { x: 0.5, y: 2.0, w: 9, h: 0.9, fontSize: 44, color: WHITE, bold: true, align: "center", fontFace: "Arial" });
s1.addText("Water Sort Puzzle", { x: 0.5, y: 2.8, w: 9, h: 0.6, fontSize: 22, color: GOLD, align: "center", fontFace: "Arial" });
s1.addText("2026湖南省大学生数字媒体创意设计大赛", { x: 0.5, y: 3.8, w: 9, h: 0.5, fontSize: 16, color: MUTED, align: "center" });
s1.addText("B3 数字交互设计类 · 微信小游戏 / HTML5", { x: 0.5, y: 4.3, w: 9, h: 0.4, fontSize: 14, color: MUTED, align: "center" });

// ====== Slide 2: 游戏概述 ======
let s2 = pres.addSlide();
s2.background = { color: BG };
s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: GOLD } });
s2.addText("游戏概述", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });
s2.addText([
  { text: "倒水游戏是一款基于 HTML5 Canvas 的益智解谜游戏。", options: { breakLine: true } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "玩家通过点击试管将彩色水倒入目标管中，目标是将所有相同颜色的水集中到同一根试管。", options: { breakLine: true } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "纯 JavaScript 单文件实现，不依赖任何第三方框架，1400+ 行代码，无需安装即可在浏览器中运行。", options: { breakLine: true } },
], { x: 0.5, y: 1.2, w: 9, h: 2.0, fontSize: 15, color: DARK, fontFace: "Arial", valign: "top" });

// Feature cards
const features = [
  { icon: "🖱", title: "点击倒水", desc: "直观的点击选择/倒水操作" },
  { icon: "↩", title: "撤销系统", desc: "完整的操作栈，支持无限撤销" },
  { icon: "🎨", title: "精致渲染", desc: "Canvas 手绘玻璃试管 + 水特效" },
  { icon: "🎮", title: "多模式", desc: "闯关 / 盲盒 / 变容" },
];
features.forEach((f, i) => {
  const cx = 0.5 + i * 2.35;
  s2.addShape(pres.shapes.RECTANGLE, { x: cx, y: 3.5, w: 2.1, h: 1.5, fill: { color: WHITE }, shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 } });
  s2.addText(f.icon, { x: cx, y: 3.55, w: 2.1, h: 0.55, fontSize: 22, align: "center" });
  s2.addText(f.title, { x: cx, y: 4.05, w: 2.1, h: 0.4, fontSize: 14, bold: true, color: DARK, align: "center", fontFace: "Arial" });
  s2.addText(f.desc, { x: cx + 0.1, y: 4.4, w: 1.9, h: 0.5, fontSize: 11, color: MUTED, align: "center" });
});
addFooter(s2);

// ====== Slide 3: 核心玩法 ======
let s3 = pres.addSlide();
s3.background = { color: BG };
s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: ACCENT } });
s3.addText("核心玩法", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });

// Left: flow
s3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.2, h: 3.8, fill: { color: WHITE }, shadow: { type: "outer", blur: 3, offset: 1, color: "000000", opacity: 0.05 } });
s3.addText("操作流程", { x: 0.7, y: 1.3, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: DARK, fontFace: "Arial" });
const flow = [
  "1. 点击试管 → 选中（出现光晕 + 浮空）",
  "2. 点击另一根试管 → 执行倒水动画",
  "3. 动画：源管飞到目标上方 → 倾斜倒水 → 回正 → 归位",
  "4. 倒水特效：水流、液滴、飞溅、波纹",
  "5. 集齐同色 → 瓶盖自动盖上",
  "6. 全部完成 → 通关！",
];
s3.addText(flow.map((t, i) => ({ text: t, options: { breakLine: i < flow.length - 1, paraSpaceAfter: 6 } })), { x: 0.7, y: 1.8, w: 3.8, h: 3.0, fontSize: 13, color: DARK, fontFace: "Arial", valign: "top" });

// Right: rules
s3.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.2, w: 4.2, h: 3.8, fill: { color: WHITE }, shadow: { type: "outer", blur: 3, offset: 1, color: "000000", opacity: 0.05 } });
s3.addText("游戏规则", { x: 5.5, y: 1.3, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: DARK, fontFace: "Arial" });
s3.addText([
  { text: "源管不能为空，目标管必须有空位", options: { bullet: true, breakLine: true } },
  { text: "目标顶层颜色必须与源管相同（或为空）", options: { bullet: true, breakLine: true } },
  { text: "每管默认容量 4 层（变容模式 4-7）", options: { bullet: true, breakLine: true } },
  { text: "全部单色或全空 = 通关", options: { bullet: true, breakLine: true } },
  { text: "步数计数 + Ctrl+Z 撤销 + R 重来", options: { bullet: true, breakLine: true } },
  { text: "拖拽自由移动管子位置", options: { bullet: true } },
], { x: 5.5, y: 1.8, w: 3.8, h: 3.0, fontSize: 13, color: DARK, fontFace: "Arial", valign: "top" });
addFooter(s3);

// ====== Slide 4: 特色功能 ======
let s4 = pres.addSlide();
s4.background = { color: BG };
s4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: GOLD } });
s4.addText("特色功能", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });

const specials = [
  { icon: "🎁", title: "盲盒模式", desc: "底部水层被彩虹流彩遮挡，上层倒空后逐层揭示，考验记忆力" },
  { icon: "🧪", title: "变容模式", desc: "每管容量不同(4-7层)，必须将颜色倒入容量匹配的管子" },
  { icon: "✋", title: "拖拽系统", desc: "自由拖拽移动试管到任意位置，松手弹开到最近空地" },
  { icon: "🔧", title: "关卡自制器", desc: "可视化编辑 + 盲盒/变容设置 + 可解性检测(DFS)" },
  { icon: "➕", title: "加管子", desc: "卡关时随时加空管降低难度" },
];
specials.forEach((f, i) => {
  const row = Math.floor(i / 2), col = i % 2;
  const cx = 0.5 + col * 4.7, cy = 1.2 + row * 1.4;
  s4.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: 4.4, h: 1.2, fill: { color: WHITE }, shadow: { type: "outer", blur: 3, offset: 1, color: "000000", opacity: 0.05 } });
  s4.addText(f.icon + "  " + f.title, { x: cx + 0.2, y: cy + 0.1, w: 4.0, h: 0.35, fontSize: 15, bold: true, color: DARK, fontFace: "Arial" });
  s4.addText(f.desc, { x: cx + 0.2, y: cy + 0.5, w: 4.0, h: 0.6, fontSize: 12, color: MUTED, fontFace: "Arial" });
});
addFooter(s4);

// ====== Slide 5: 视觉设计 ======
let s5 = pres.addSlide();
s5.background = { color: BG };
s5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: ACCENT } });
s5.addText("视觉设计", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });

const visuals = [
  { t: "简约清新风格", d: "暖白底色(#F7F5F0) + 柔和马卡龙色板(16色)，干净利落" },
  { t: "玻璃试管渲染", d: "Canvas 手绘直壁圆底试管，玻璃高光 + 内壁反光 + 底座" },
  { t: "动态水面特效", d: "正弦波浪水面 + 内部涟漪 + 侧面折射反光，借鉴 Cocos 实现" },
  { t: "四阶段倒水动画", d: "移动→倾斜倒水→回正→归位，水流/液滴/飞溅/波纹全程绘制" },
  { t: "盲盒彩虹流彩", d: "隐藏层用 HSL 全色相循环渐变 + ? 标记，随时间流动" },
  { t: "瓶盖 + 浮空选中", d: "完成即盖金色瓶盖，选中试管上浮 7px + 暖色光晕" },
];
visuals.forEach((v, i) => {
  s5.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.15 + i * 0.72, w: 9.0, h: 0.62, fill: { color: WHITE }, shadow: { type: "outer", blur: 2, offset: 1, color: "000000", opacity: 0.04 } });
  s5.addText(v.t, { x: 0.7, y: 1.15 + i * 0.72, w: 2.5, h: 0.62, fontSize: 13, bold: true, color: DARK, fontFace: "Arial", valign: "middle" });
  s5.addText(v.d, { x: 3.3, y: 1.15 + i * 0.72, w: 6.0, h: 0.62, fontSize: 12, color: MUTED, fontFace: "Arial", valign: "middle" });
});
addFooter(s5);

// ====== Slide 6: 技术架构 ======
let s6 = pres.addSlide();
s6.background = { color: BG };
s6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: GOLD } });
s6.addText("技术架构", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });

// Architecture blocks
const techs = [
  { layer: "渲染层", items: "Canvas 2D · 自绘玻璃管 · 水特效 · 动画系统 · 拖拽交互", color: "E8D5B0" },
  { layer: "逻辑层", items: "倒水验证 · 撤销栈 · 通关检测 · 瓶盖判定 · 盲盒揭示", color: "C8DCC8" },
  { layer: "数据层", items: "关卡生成(反向构造) · DFS可解性检测 · localStorage存储", color: "C8D0E8" },
  { layer: "音效层", items: "Web Audio API 合成倒水声 · 无外部音频依赖", color: "E8D0D0" },
];
techs.forEach((t, i) => {
  s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2 + i * 0.8, w: 1.8, h: 0.65, fill: { color: t.color } });
  s6.addText(t.layer, { x: 0.5, y: 1.2 + i * 0.8, w: 1.8, h: 0.65, fontSize: 14, bold: true, color: DARK, align: "center", valign: "middle", fontFace: "Arial" });
  s6.addText(t.items, { x: 2.5, y: 1.2 + i * 0.8, w: 7.0, h: 0.65, fontSize: 12, color: DARK, valign: "middle", fontFace: "Arial" });
});
s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.5, w: 9.0, h: 0.7, fill: { color: WHITE }, shadow: { type: "outer", blur: 2, offset: 1, color: "000000", opacity: 0.04 } });
s6.addText("技术亮点：单文件 HTML · 纯 JavaScript · 零依赖 · 1400+ 行 · 兼容所有现代浏览器 · 支持触摸和鼠标", { x: 0.7, y: 4.5, w: 8.6, h: 0.7, fontSize: 13, color: DARK, valign: "middle", fontFace: "Arial" });
addFooter(s6);

// ====== Slide 7: 创新点 ======
let s7 = pres.addSlide();
s7.background = { color: BG };
s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: ACCENT } });
s7.addText("创新点", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 32, color: DARK, bold: true, fontFace: "Arial" });

const innovations = [
  { n: "01", t: "反向构造关卡生成", d: "从已解状态做随机合法倒水搅乱，天然保证有解，无需事后验证。1空管极限模式同样适用。" },
  { n: "02", t: "盲盒记忆挑战", d: "底部水层彩虹流彩遮挡，上层倒空前不可见/不可操作，逐层揭示增加记忆难度。" },
  { n: "03", t: "变容模式", d: "打破固定4层容量，每管2-8层可变，颜色总数=目标容量，装错即卡关，深度策略性。" },
  { n: "04", t: "实时水物理特效", d: "动态波浪水面、内部涟漪、侧面反光，借鉴 Cocos 游戏引擎效果，纯 Canvas 实现。" },
  { n: "05", t: "自制关卡系统", d: "可视化编辑器 + 盲盒/变容参数 + DFS可解性校验 + localStorage持久化，玩家即创作者。" },
];
innovations.forEach((inv, i) => {
  const cy = 1.15 + i * 0.85;
  s7.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: cy, w: 0.7, h: 0.7, fill: { color: GOLD } });
  s7.addText(inv.n, { x: 0.5, y: cy, w: 0.7, h: 0.7, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial" });
  s7.addText(inv.t, { x: 1.4, y: cy, w: 8.1, h: 0.35, fontSize: 15, bold: true, color: DARK, fontFace: "Arial", valign: "middle" });
  s7.addText(inv.d, { x: 1.4, y: cy + 0.35, w: 8.1, h: 0.35, fontSize: 12, color: MUTED, fontFace: "Arial", valign: "top" });
});
addFooter(s7);

// ====== Slide 8: 总结 ======
let s8 = pres.addSlide();
s8.background = { color: DARK };
s8.addText("✨", { x: 0, y: 0.5, w: 10, h: 1.0, fontSize: 48, align: "center" });
s8.addText("简约清新的益智挑战", { x: 0.5, y: 1.5, w: 9, h: 0.7, fontSize: 32, color: WHITE, bold: true, align: "center", fontFace: "Arial" });

const summaryItems = [
  "丰富的游戏模式 — 闯关 / 盲盒 / 变容 / 自制",
  "精致的视觉效果 — 波浪水面 / 动态倒水 / 彩虹盲盒",
  "完善的自制系统 — 可视化编辑 / 可解性检测 / 云端存储",
  "零依赖纯前端 — 浏览器即开即玩 / 14KB 压缩后体积",
];
s8.addText(summaryItems.map((t, i) => ({ text: t, options: { breakLine: i < summaryItems.length - 1, paraSpaceAfter: 10 } })), { x: 1.5, y: 2.4, w: 7, h: 2.0, fontSize: 16, color: "CCCCCC", align: "center", fontFace: "Arial" });

// QR code hint
s8.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 4.5, w: 3, h: 0.6, fill: { color: "3A3A3A" } });
s8.addText("扫码立即体验 →", { x: 3.5, y: 4.5, w: 3, h: 0.6, fontSize: 14, color: GOLD, align: "center", valign: "middle", fontFace: "Arial" });

pres.writeFile({ fileName: "E:/学校资料/大一下学期（2026.3-2026.）/Project_all/倒水游戏合集/参赛项目/倒水游戏_展示PPT.pptx" })
  .then(() => console.log("PPT created successfully!"))
  .catch(err => console.error(err));
