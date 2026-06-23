// ============================================================
// 倒水游戏 · Water Sort Puzzle · 微信小游戏版
// ============================================================
var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');
var sw = canvas.width;
var sh = canvas.height;
var s = Math.min(sw / 375, sh / 667); // 缩放比例

// ────────── 常量 ──────────
var TW = Math.round(56 * s), RIM_H = Math.round(10 * s), GAP = Math.round(20 * s);
var BOTTOM_R = Math.round(TW / 2), WALL = Math.round(4 * s);
var IW = TW - WALL * 2, LAYER_H = Math.round(36 * s), INNER_R = BOTTOM_R - WALL;

function straightH(cap) { return cap * LAYER_H + Math.round(6 * s); }
function totalH(cap) { return RIM_H + straightH(cap) + BOTTOM_R; }

var PALETTE = [
  '#F4A7A0', '#A8D8C8', '#A0C4F4', '#F4E4A0', '#C8B8E8',
  '#F4C8A0', '#5BC0BE', '#E8B8C8', '#B8C8E0', '#D8C8B0',
  '#FF7B7B', '#7BC67E', '#8B7CB8', '#6B8FA0', '#D4956B', '#6B6B6B',
];

// ────────── 工具函数 ──────────
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function topIdx(w) { for (var i = w.length - 1; i >= 0; i--) if (w[i] !== 'transparent') return i; return -1; }
function topClr(w) { var i = topIdx(w); return i === -1 ? 'transparent' : w[i]; }
function topRun(w) { var i = topIdx(w); if (i === -1) return 0; var c = w[i], n = 0; for (var j = i; j >= 0 && w[j] === c; j--) n++; return n; }
function space(w) { var n = 0; for (var i = w.length - 1; i >= 0 && w[i] === 'transparent'; i--) n++; return n; }
function filled(w) { var n = 0; for (var i = 0; i < w.length; i++) if (w[i] !== 'transparent') n++; return n; }
function pure(w) { var f = w[0]; for (var i = 1; i < w.length; i++) if (w[i] !== f) return false; return true; }
function lighten(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgb(' + Math.min(255, (n >> 16) + a) + ',' + Math.min(255, (n >> 8 & 255) + a) + ',' + Math.min(255, (n & 255) + a) + ')'; }
function darken(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgb(' + Math.max(0, (n >> 16) - a) + ',' + Math.max(0, (n >> 8 & 255) - a) + ',' + Math.max(0, (n & 255) - a) + ')'; }

// ────────── 状态 ──────────
var tubes = [], tubeCaps = [], hiddenMask = [], hiddenMaskInit = [], tubesInit = [], capsInit = [];
var moves = 0, won = false, selected = -1, undoStack = [], colorN = 6;
var transferAnims = [], cachedSlots = null, feedback = null, revealAnim = null;
var dragState = null, slots = [];
var screen = 'menu', playMode = 'challenge', currentMenu = 0;
var myLevelsPage = 0;

// ────────── 关卡生成 ──────────
function genLevelSmart(numColors, emptyTubes, shuffleMoves, depth) {
  if (!depth) depth = 0;
  if (depth > 50) return fallbackGen(numColors, emptyTubes);
  var colors = shuffle(PALETTE.slice()).slice(0, numColors);
  var list = [];
  for (var ci = 0; ci < numColors; ci++) { var w = []; for (var i = 0; i < 4; i++) w.push(colors[ci]); list.push(w); }
  for (var e = 0; e < emptyTubes; e++) list.push(['transparent', 'transparent', 'transparent', 'transparent']);
  var eff = 0;
  for (var k = 0; k < shuffleMoves * 20 && eff < shuffleMoves; k++) {
    var from = Math.floor(Math.random() * list.length), to = Math.floor(Math.random() * list.length);
    if (from === to) continue;
    var src = list[from], dst = list[to];
    var sc = topClr(src); if (sc === 'transparent') continue;
    var dc = topClr(dst); if (dc !== 'transparent' && dc !== sc) continue;
    var run = topRun(src), sp = space(dst), cnt = Math.min(run, sp);
    if (cnt <= 0) continue;
    var rm = 0; for (var i = src.length - 1; i >= 0 && rm < cnt; i--) if (src[i] === sc) { src[i] = 'transparent'; rm++; }
    var ad = 0; for (var i = 0; i < dst.length && ad < cnt; i++) if (dst[i] === 'transparent') { dst[i] = sc; ad++; }
    eff++;
  }
  if (eff < 3 || list.every(pure)) return genLevelSmart(numColors, emptyTubes, shuffleMoves, depth + 1);
  return list.map(function (w) { return w.slice(); });
}
function fallbackGen(numColors, emptyTubes) {
  var colors = shuffle(PALETTE.slice()).slice(0, numColors);
  var all = []; for (var ci = 0; ci < numColors; ci++) for (var i = 0; i < 4; i++) all.push(colors[ci]);
  all = shuffle(all);
  var list = [];
  for (var t = 0; t < numColors; t++) { var w = []; for (var i = 0; i < 4; i++) w.push(all[t * 4 + i]); list.push(w); }
  for (var e = 0; e < emptyTubes; e++) list.push(['transparent', 'transparent', 'transparent', 'transparent']);
  return list;
}
// ────────── 游戏逻辑 ──────────
function resetFromData(data, mask, caps) {
  tubesInit = data.map(function (t) { return t.slice(); });
  tubes = data.map(function (t) { return t.slice(); });
  capsInit = caps ? caps.slice() : data.map(function (t) { return t.length; });
  tubeCaps = capsInit.slice();
  hiddenMaskInit = mask ? mask.slice() : new Array(data.length).fill(0);
  hiddenMask = hiddenMaskInit.slice();
  revealAnim = null;
  colorN = new Set(tubes.flat()).size - 1;
  moves = 0; won = false; selected = -1; undoStack = []; feedback = null; transferAnims = [];
  layout();
}
function reset(n) {
  if (!n) n = colorN;
  colorN = n;
  var data = genLevelSmart(n, 2, 50 + n * 10);
  resetFromData(data);
}
function restartLevel() {
  tubes = tubesInit.map(function (t) { return t.slice(); });
  tubeCaps = capsInit.slice();
  hiddenMask = hiddenMaskInit.slice();
  revealAnim = null;
  moves = 0; won = false; selected = -1; undoStack = []; feedback = null; transferAnims = [];
  layout();
}
function isCapped(i) {
  if (!pure(tubes[i]) || filled(tubes[i]) === 0 || hiddenMask[i] > 0) return false;
  var clr = tubes[i][0]; if (clr === 'transparent') return false;
  var total = 0; for (var ti = 0; ti < tubes.length; ti++) for (var tj = 0; tj < tubes[ti].length; tj++) if (tubes[ti][tj] === clr) total++;
  return total === tubes[i].length;
}
function isAnimating(i) { return transferAnims.some(function (a) { return a.from === i || a.to === i; }); }
function tap(idx) {
  if (won) return;
  if (idx < 0) { selected = -1; return; }
  if (idx >= tubes.length) return;
  if (isAnimating(idx)) return;
  if (selected === -1) {
    if (topIdx(tubes[idx]) === -1) return;
    if (isCapped(idx)) return;
    selected = idx;
  } else if (selected === idx) { selected = -1; }
  else { var from = selected, to = idx; selected = -1; if (isAnimating(to) || isCapped(to)) return; attempt(from, to); }
}
function attempt(from, to) {
  var src = tubes[from], dst = tubes[to];
  var sc = topClr(src); if (sc === 'transparent') return;
  if (space(dst) === 0) return;
  var dc = topClr(dst); if (dc !== 'transparent' && dc !== sc) return;
  var run = topRun(src), sp = space(dst), cnt = Math.min(run, sp);
  var oldHiddenFrom = hiddenMask[from];
  undoStack.push({ from: from, to: to, color: sc, count: cnt, oldHiddenFrom: oldHiddenFrom });
  cachedSlots = slots.map(function (s) { return { x: s.x, y: s.y }; });
  var fp = cachedSlots[from], tp = cachedSlots[to];
  var thT = totalH(tubeCaps[to] || 4);
  var topI = topIdx(src), waterFrac = topI >= 0 ? (topI + 0.8) / src.length : 0.25;
  var maxTilt = Math.PI / 180 * (20 + (1 - waterFrac) * 55);
  var droplets = [];
  for (var d = 0; d < 8; d++) droplets.push({ delay: 0.35 + Math.random() * 0.3, radius: 2.5 + Math.random() * 4, offsetX: (Math.random() - 0.5) * 10 });
  transferAnims.push({ from: from, to: to, fromColor: sc, count: cnt, elapsed: 0, duration: 1100, _last: Date.now(), _soundPlayed: false,
    fromOrigX: fp.x, fromOrigY: fp.y, fromTargetX: Math.max(4, tp.x - TW * 0.6), fromTargetY: tp.y - thT * 0.5,
    sourceX: fp.x, sourceY: fp.y, sourceTilt: 0, targetBump: 1,
    droplets: droplets, preSource: src.slice(), preTarget: dst.slice(), maxTilt: maxTilt, oldHiddenFrom: oldHiddenFrom });
  moves++;
}
function undo() {
  if (won || undoStack.length === 0) return;
  var act = undoStack.pop();
  var from = act.from, to = act.to, color = act.color, count = act.count, oldHiddenFrom = act.oldHiddenFrom;
  var rm = 0; for (var i = tubes[to].length - 1; i >= 0 && rm < count; i--) if (tubes[to][i] === color) { tubes[to][i] = 'transparent'; rm++; }
  var ad = 0; for (var i = 0; i < tubes[from].length && ad < count; i++) if (tubes[from][i] === 'transparent') { tubes[from][i] = color; ad++; }
  if (oldHiddenFrom !== undefined) hiddenMask[from] = oldHiddenFrom;
  moves = Math.max(0, moves - 1); selected = -1; feedback = null;
}
function checkWin() {
  if (tubes.every(pure)) {
    won = true;
    var par = colorN * 7, stars = 1;
    if (moves <= par * 1.1) stars = 3; else if (moves <= par * 1.7) stars = 2;
  }
}

// ────────── 布局 ──────────
function layout() {
  if (!tubes || tubes.length === 0) return;
  var w = Math.min(sw - Math.round(24 * s), Math.round(1100 * s));
  var perRow = Math.max(2, Math.floor((w - Math.round(40 * s)) / (TW + GAP)));
  var rows = Math.ceil(tubes.length / perRow);
  var rowHeights = [];
  for (var r = 0; r < rows; r++) { var maxH = totalH(4); for (var i = r * perRow; i < Math.min((r + 1) * perRow, tubes.length); i++) maxH = Math.max(maxH, totalH(tubeCaps[i] || 4)); rowHeights.push(maxH); }
  var neededH = rowHeights.reduce(function (a, b) { return a + b + Math.round(16 * s); }, 0) + Math.round(100 * s);
  var ch2 = Math.max(sh - Math.round(120 * s), neededH * 1.6, Math.round(500 * s));
  // canvas height respects sw/sh
  slots = [];
  var topY = Math.round(40 * s);
  for (var r = 0; r < rows; r++) {
    var start = r * perRow, end = Math.min(start + perRow, tubes.length);
    var cnt = end - start, rw = cnt * TW + (cnt - 1) * GAP, rx = (w - rw) / 2;
    for (var i = start; i < end; i++) {
      var cap = tubeCaps[i] || 4, th = totalH(cap);
      slots.push({ x: rx + (i - start) * (TW + GAP), y: topY + (rowHeights[r] - th) });
    }
    topY += rowHeights[r] + Math.round(16 * s);
  }
}
function tubeBounds(i) { var s = slots[i]; var cap = tubeCaps[i] || 4; return { x: s.x - 4, y: s.y - 4, w: TW + 8, h: totalH(cap) + 8 }; }
function tubeOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function hasOverlap(idx, cx, cy) {
  var b0 = { x: cx - 4, y: cy - 4, w: TW + 8, h: totalH(tubeCaps[idx] || 4) + 8 };
  for (var i = 0; i < tubes.length; i++) { if (i === idx) continue; if (tubeOverlap(b0, tubeBounds(i))) return true; }
  return false;
}
function findFreeSpot(idx, px, py) {
  if (!hasOverlap(idx, px, py)) return { x: px, y: py };
  for (var r = Math.round(10 * s); r <= Math.round(300 * s); r += Math.round(15 * s)) {
    for (var a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      var nx = px + Math.cos(a) * r, ny = py + Math.sin(a) * r;
      nx = Math.max(2, Math.min(sw - TW - 2, nx));
      ny = Math.max(2, Math.min(sh - totalH(tubeCaps[idx] || 4) - 2, ny));
      if (!hasOverlap(idx, nx, ny)) return { x: nx, y: ny };
    }
  }
  return { x: Math.max(2, Math.min(sw - TW - 2, Math.random() * sw)), y: Math.max(2, Math.min(sh - totalH(tubeCaps[idx] || 4) - 2, Math.random() * sh)) };
}
function addEmptyTube() {
  if (won || transferAnims.length > 0) return;
  var idx = tubes.length;
  tubes.push(['transparent', 'transparent', 'transparent', 'transparent']);
  tubeCaps.push(4); hiddenMask.push(0);
  var free = findFreeSpot(idx, Math.round(40 * s) + Math.random() * (sw - TW - Math.round(80 * s)), Math.round(40 * s) + Math.random() * Math.round(200 * s));
  slots.push({ x: free.x, y: free.y });
  selected = -1;
}

// ── 命中检测 ──
function hit(mx, my) {
  for (var i = tubes.length - 1; i >= 0; i--) {
    var s = slots[i]; var th = totalH(tubeCaps[i] || 4);
    if (mx >= s.x - 4 && mx <= s.x + TW + 4 && my >= s.y - 4 && my <= s.y + th + 6) return i;
  }
  return -1;
}

// ── 动画辅助 ──
function buildSourceWater(pre, color, count, progress) {
  var w = pre.slice(), total = count * progress;
  var full = Math.floor(total), frac = total - full;
  var rm = 0; for (var i = w.length - 1; i >= 0 && rm < full; i--) { if (w[i] === color) { w[i] = 'transparent'; rm++; } }
  if (frac > 0.001 && full < count) { for (var i2 = w.length - 1; i2 >= 0; i2--) { if (w[i2] === color) { w._partialIdx = i2; w._partialFrac = 1 - frac; break; } } }
  return w;
}
function buildTargetWater(pre, color, count, progress) {
  var w = pre.slice(), total = count * progress;
  var full = Math.floor(total), frac = total - full;
  var ad = 0; for (var i = 0; i < w.length && ad < full; i++) { if (w[i] === 'transparent') { w[i] = color; ad++; } }
  if (frac > 0.001 && full < count) { var ad2 = 0; for (var i2 = 0; i2 < w.length; i2++) { if (w[i2] === 'transparent') { ad2++; if (ad2 === 1) { w[i2] = color; w._partialIdx = i2; w._partialFrac = frac; break; } } } }
  return w;
}
function finishTransferAnim(a) {
  var wf = tubes[a.from], wt = tubes[a.to];
  var rm = 0; for (var i = wf.length - 1; i >= 0 && rm < a.count; i--) if (wf[i] === a.fromColor) { wf[i] = 'transparent'; rm++; }
  var ad = 0; for (var i = 0; i < wt.length && ad < a.count; i++) if (wt[i] === 'transparent') { wt[i] = a.fromColor; ad++; }
  if (a.oldHiddenFrom > 0 && topIdx(wf) < a.oldHiddenFrom) { hiddenMask[a.from] = a.oldHiddenFrom - 1; }
  checkWin();
}

// ── 音效 ──
function playPourSound() {
  try {
    var ac = wx.createWebAudioContext();
    var dur = 0.48, sr = ac.sampleRate || 44100;
    var buf = ac.createBuffer(1, sr * dur, sr);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / (sr * 0.02)) * Math.min(1, (d.length - i) / (sr * 0.08));
    var src = ac.createBufferSource(); src.buffer = buf;
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency = 800; bp.Q = 0.8;
    var gain = ac.createGain(); gain.gain = 0.06;
    src.connect(bp); bp.connect(gain); gain.connect(ac.destination);
    src.start(); setTimeout(function () { ac.close(); }, 600);
  } catch (e) { }
}

// ── 存储 ──
var LS_KEY = 'watersort_levels';
function loadLevels() { try { return wx.getStorageSync(LS_KEY) || []; } catch (e) { return []; } }
function saveLevels(levels) { wx.setStorageSync(LS_KEY, levels); }

// ═══════════════════════════════════════════════
//  绘图
// ═══════════════════════════════════════════════
function drawBg() { ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, sw, sh); }
function drawStand(x, y, cap) {
  var cx = x + TW / 2, bottomY = y + RIM_H + straightH(cap) + BOTTOM_R;
  ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.ellipse(cx, bottomY + 1, TW / 2 + 1, Math.round(3 * s), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dcd7ce'; ctx.beginPath(); ctx.ellipse(cx, bottomY - 1, TW / 2 - 1, Math.round(2 * s), 0, 0, Math.PI * 2); ctx.fill();
}
function drawCap(x, y, cap) {
  var cx = x + TW / 2, topY = y + RIM_H;
  ctx.fillStyle = '#d5c4a1'; ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 3, topY - Math.round(10 * s)); ctx.lineTo(x + TW + 3, topY - Math.round(10 * s));
  ctx.lineTo(x + TW + 3, topY + 2); ctx.lineTo(x - 3, topY + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, topY - Math.round(8 * s), TW, Math.round(3 * s));
  ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x - 1, topY - 1, TW + 2, Math.round(4 * s));
}
function drawTube(x, y, water, sel, fbKind, hidden, rv, rvPrev, cap) {
  if (!hidden) hidden = 0; if (!rv) rv = 1; if (!rvPrev) rvPrev = 0; if (!cap) cap = 4;
  var sh2 = straightH(cap), th = totalH(cap);
  var cx = x + TW / 2, bodyTop = y + RIM_H, straightBot = bodyTop + sh2;
  var innerX = x + WALL, innerTopY = bodyTop + WALL;
  ctx.save();
  if (sel) { var glow = ctx.createRadialGradient(cx, y + th / 2, TW * 0.3, cx, y + th / 2, TW * 1.5); glow.addColorStop(0, 'rgba(200,170,110,0.22)'); glow.addColorStop(1, 'rgba(200,170,110,0)'); ctx.fillStyle = glow; ctx.fillRect(x - Math.round(24 * s), y - Math.round(8 * s), TW + Math.round(48 * s), th + Math.round(20 * s)); }
  ctx.beginPath(); ctx.moveTo(x, bodyTop); ctx.lineTo(x, straightBot); ctx.arc(cx, straightBot, BOTTOM_R, Math.PI, 0, true); ctx.lineTo(x + TW, bodyTop); ctx.closePath();
  ctx.fillStyle = 'rgba(248,246,243,0.55)'; ctx.fill();
  ctx.strokeStyle = 'rgba(175,170,162,0.50)'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.moveTo(innerX, innerTopY); ctx.lineTo(innerX, straightBot); ctx.arc(cx, straightBot, INNER_R, Math.PI, 0, true); ctx.lineTo(innerX + IW, innerTopY); ctx.closePath(); ctx.clip();
  var layers = []; for (var i = 0; i < water.length; i++) if (water[i] !== 'transparent') layers.push(water[i]);
  var innerDeepest = straightBot + INNER_R;
  for (var i = 0; i < layers.length; i++) {
    var ly = innerDeepest - (i + 1) * LAYER_H, lh = LAYER_H + 1, clr = layers[i];
    if (water._partialIdx === i) { lh = LAYER_H * water._partialFrac + 0.5; ly = ly + LAYER_H - lh; }
    var isHidden = hidden > 0 && i < hidden;
    if (isHidden) {
      var g = ctx.createLinearGradient(innerX, ly, innerX + IW, ly + lh);
      var h0 = (Date.now() / 1000 * 50 + ly * 3) % 360;
      g.addColorStop(0, 'hsl(' + h0 + ',80%,45%)');
      g.addColorStop(0.25, 'hsl(' + ((h0 + 60) % 360) + ',85%,42%)');
      g.addColorStop(0.5, 'hsl(' + ((h0 + 120) % 360) + ',80%,48%)');
      g.addColorStop(0.75, 'hsl(' + ((h0 + 180) % 360) + ',85%,40%)');
      g.addColorStop(1, 'hsl(' + ((h0 + 240) % 360) + ',80%,46%)');
      ctx.fillStyle = g; ctx.fillRect(innerX, ly, IW, lh);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold ' + Math.round(16 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', cx, ly + lh / 2 + 5);
    } else {
      var g2 = ctx.createLinearGradient(0, ly, 0, ly + lh); g2.addColorStop(0, lighten(clr, 20)); g2.addColorStop(0.55, clr); g2.addColorStop(1, darken(clr, 12)); ctx.fillStyle = g2; ctx.fillRect(innerX, ly, IW, lh);
      if (i === layers.length - 1) { ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fillRect(innerX + 2, ly, IW - 4, 1.5); }
    }
  }
  if (layers.length === 0) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(innerX + 2, innerTopY + sh2 * 0.35, IW - 4, sh2 * 0.45); }
  ctx.restore();
  ctx.fillStyle = 'rgba(248,246,243,0.45)'; ctx.strokeStyle = 'rgba(175,170,162,0.48)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(cx, bodyTop, TW / 2, Math.round(4 * s), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + WALL + 3, bodyTop + Math.round(14 * s)); ctx.lineTo(x + WALL + 3, straightBot - Math.round(14 * s)); ctx.stroke();
  ctx.restore();
}
// ── 倒水特效 ──
function drawPourAnim(a) {
  var animT = a._animT, pourP = a._pourP;
  var tp = cachedSlots[a.to]; if (!tp) return;
  var color = a.fromColor;
  var tiltFrac = Math.min(1, a.sourceTilt / (Math.PI / 180 * 60));
  var thSrc = totalH(tubeCaps[a.from] || 4);
  var fx = a.sourceX + TW * (0.5 + tiltFrac * 0.5);
  var fy = a.sourceY + thSrc * 0.2 + tiltFrac * thSrc * 0.6;
  var capT = tubeCaps[a.to] || 4, thT = totalH(capT);
  var tmpW = buildTargetWater(a.preTarget, a.fromColor, a.count, pourP);
  var totalAdd = a.count * pourP, fullAdd = Math.floor(totalAdd), fracAdd = totalAdd - fullAdd;
  var curW = a.preTarget.slice();
  var ad = 0; for (var ai = 0; ai < curW.length && ad < fullAdd; ai++) { if (curW[ai] === 'transparent') { curW[ai] = a.fromColor; ad++; } }
  var surfIdx = -1, surfFrac = 1;
  for (var li = curW.length - 1; li >= 0; li--) { if (curW[li] !== 'transparent') { surfIdx = li; break; } }
  if (fracAdd > 0.001 && fullAdd < a.count) { surfIdx = surfIdx >= 0 ? surfIdx + 1 : 0; surfFrac = fracAdd; }
  var layerH = thT / curW.length;
  var tx = tp.x + TW / 2;
  var ty = surfIdx >= 0 ? tp.y + thT - (surfIdx + 1) * layerH + layerH * (1 - surfFrac) : tp.y + thT * 0.75;
  var alpha = 1; if (animT < 0.15) alpha = (animT - 0.08) / 0.07; if (animT > 0.65) alpha = Math.max(0, (0.82 - animT) / 0.17);
  ctx.globalAlpha = alpha;
  var streamW = 3 + a.sourceTilt / (Math.PI / 180 * 70) * 2.5;
  ctx.strokeStyle = color; ctx.lineWidth = streamW; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  if (streamW > 1.5) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = streamW * 0.3; ctx.beginPath(); ctx.moveTo(tx, fy); ctx.lineTo(tx, ty); ctx.stroke(); }
  for (var d = 0; d < a.droplets.length; d++) {
    var drop = a.droplets[d];
    var dp = Math.max(0, Math.min(1, (animT - 0.12 - drop.delay * 0.5) / 0.55));
    if (dp <= 0 || dp >= 1) continue;
    ctx.beginPath(); ctx.arc(tx + drop.offsetX, fy + (ty - fy) * dp, drop.radius * 0.7, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.7; ctx.fill();
  }
  var ra = Math.max(0, (animT - 0.2) / 0.15); ra = Math.min(ra, (0.75 - animT) / 0.1 + 0.3); ra = Math.max(0, Math.min(1, ra));
  if (ra > 0) { var rp = (animT - 0.2) * 3; for (var r = 0; r < 3; r++) { ctx.strokeStyle = color; ctx.lineWidth = 1 * (1 - r * 0.25); ctx.globalAlpha = ra * (1 - r * 0.3) * 0.4; ctx.beginPath(); ctx.arc(tx, ty + Math.round(12 * s), Math.max(1, (rp * 12 + r * 7)), 0, Math.PI * 2); ctx.stroke(); } }
  if (animT > 0.2 && animT < 0.7) { var spl = Math.sin((animT - 0.2) / 0.5 * Math.PI); var seed = Math.floor(a.elapsed / 80); for (var sp = 0; sp < 5; sp++) { ctx.beginPath(); ctx.arc(tx + Math.sin(seed * 7 + sp * 2.3) * 10, ty + 8 - Math.abs(Math.cos(seed * 3 + sp)) * 15 * spl, (1 + Math.abs(Math.cos(seed + sp)) * 2.5), 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = alpha * spl * 0.5; ctx.fill(); } }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}

// ═══════════════════════════════════════════════
//  渲染
// ═══════════════════════════════════════════════
var btnRects = [];
function drawBtn(x, y, w, h, text, color, textColor) {
  if (!textColor) textColor = '#fff';
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1.5;
  var r = Math.round(10 * s);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = textColor; ctx.font = 'bold ' + Math.round(16 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}
function drawBadge(x, y, text) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  var r = Math.round(22 * s), bw = Math.round(100 * s), bh = Math.round(32 * s);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r); ctx.lineTo(x + bw, y + bh - r); ctx.arcTo(x + bw, y + bh, x + bw - r, y + bh, r); ctx.lineTo(x + r, y + bh); ctx.arcTo(x, y + bh, x, y + bh - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d4a853'; ctx.font = 'bold ' + Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + bw / 2, y + bh / 2);
}

function render(now) {
  if (!tubes || tubes.length === 0 || slots.length === 0) { ctx.clearRect(0, 0, sw, sh); drawBg(); return; }
  ctx.clearRect(0, 0, sw, sh); drawBg();

  // ── 更新动画 ──
  var easeInOut = function (x) { return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x; };
  var easeOut = function (x) { return 1 - (1 - x) * (1 - x); };
  for (var ai = transferAnims.length - 1; ai >= 0; ai--) {
    var a = transferAnims[ai];
    var dt = now - (a._last || now); if (dt < 0) dt = 0; if (dt > 33) dt = 33;
    a.elapsed = Math.min(a.duration, a.elapsed + dt); a._last = now;
    var animT = Math.min(a.elapsed / a.duration, 1);
    if (!a._soundPlayed) { playPourSound(); a._soundPlayed = true; }
    if (animT <= 0.12) { var p1 = easeInOut(animT / 0.12); a.sourceX = a.fromOrigX + (a.fromTargetX - a.fromOrigX) * p1; a.sourceY = a.fromOrigY + (a.fromTargetY - a.fromOrigY) * p1; a.sourceTilt = 0; a.targetBump = 1; }
    else if (animT <= 0.60) { a.sourceX = a.fromTargetX; a.sourceY = a.fromTargetY; var p2 = (animT - 0.12) / 0.48, wobble = Math.sin(a.elapsed * 0.015) * (4 * Math.PI / 180) * p2; a.sourceTilt = a.maxTilt * easeInOut(p2) + wobble; var bp = Math.max(0, Math.min(1, (animT - 0.25) / 0.2)); a.targetBump = 1 + Math.sin(bp * Math.PI) * 0.06; }
    else if (animT <= 0.78) { a.sourceX = a.fromTargetX; a.sourceY = a.fromTargetY; a.sourceTilt = a.maxTilt * (1 - easeOut((animT - 0.60) / 0.18)); a.targetBump = 1; }
    else { a.sourceX = a.fromTargetX + (a.fromOrigX - a.fromTargetX) * easeInOut((animT - 0.78) / 0.22); a.sourceY = a.fromTargetY + (a.fromOrigY - a.fromTargetY) * easeInOut((animT - 0.78) / 0.22); a.sourceTilt = 0; a.targetBump = 1; }
    a._animT = animT; a._pourP = Math.max(0, Math.min(1, (animT - 0.12) / 0.48));
    if (animT >= 1) { finishTransferAnim(a); transferAnims.splice(ai, 1); }
  }

  // ── 第一遍：普通管 + 目标管 ──
  var pourIdxs = new Set();
  transferAnims.forEach(function (a) { pourIdxs.add(a.from); });
  for (var i = 0; i < tubes.length; i++) {
    if (pourIdxs.has(i)) { var pos = slots[i]; drawStand(pos.x, pos.y, tubeCaps[i] || 4); continue; }
    var pos = slots[i]; var floatY = (selected === i && transferAnims.length === 0) ? -Math.round(7 * s) : 0;
    var cap = tubeCaps[i] || 4;
    var water = tubes[i], bump = 1;
    transferAnims.forEach(function (a) { if (i === a.to) { water = buildTargetWater(a.preTarget, a.fromColor, a.count, a._pourP); bump = a.targetBump || 1; } });
    ctx.save(); var cx = pos.x + TW / 2, cy = pos.y + totalH(cap) / 2;
    ctx.translate(cx, cy); ctx.scale(bump, bump); ctx.translate(-cx, -cy);
    drawStand(pos.x, pos.y + floatY, cap);
    drawTube(pos.x, pos.y + floatY, water, selected === i, null, hiddenMask[i] || 0, 1, 0, cap);
    var isPourInvolved = transferAnims.some(function (a) { return a.from === i || a.to === i; });
    if (!isPourInvolved && isCapped(i)) drawCap(pos.x, pos.y + floatY, cap);
    ctx.restore();
  }
  // ── 第二遍：源管 ──
  transferAnims.forEach(function (a) {
    var cap = tubeCaps[a.from] || 4;
    var water = buildSourceWater(a.preSource, a.fromColor, a.count, a._pourP);
    var pivX = a.sourceX + TW, pivY = a.sourceY;
    ctx.save(); ctx.translate(pivX, pivY); ctx.rotate(a.sourceTilt); ctx.translate(-pivX, -pivY);
    drawTube(a.sourceX, a.sourceY, water, false, null, hiddenMask[a.from] || 0, 1, 0, cap);
    ctx.restore();
  });
  // ── 动画特效 ──
  transferAnims.forEach(function (a) { if (a._animT > 0.08 && a._animT < 0.82) drawPourAnim(a); });
  // ── 拖拽中的管子 ──
  if (dragState) {
    var i = dragState.idx, cap = tubeCaps[i] || 4;
    drawStand(slots[i].x, slots[i].y, cap);
    drawTube(slots[i].x, slots[i].y, tubes[i], false, null, hiddenMask[i] || 0, 1, 0, cap);
    if (isCapped(i)) drawCap(slots[i].x, slots[i].y, cap);
  }

  // ── 游戏内按钮 ──
  btnRects = [];
  var barY = sh - Math.round(60 * s);
  drawBadge(Math.round(8 * s), barY, 'Moves: ' + moves);
  drawBtn(Math.round(115 * s), barY, Math.round(60 * s), Math.round(32 * s), 'UNDO', '#f0c060', '#333');
  btnRects.push({ id: 'undo', x: Math.round(115 * s), y: barY, w: Math.round(60 * s), h: Math.round(32 * s) });
  drawBtn(Math.round(180 * s), barY, Math.round(70 * s), Math.round(32 * s), 'RESTART', '#90ee90', '#333');
  btnRects.push({ id: 'restart', x: Math.round(180 * s), y: barY, w: Math.round(70 * s), h: Math.round(32 * s) });
  drawBtn(Math.round(255 * s), barY, Math.round(55 * s), Math.round(32 * s), '+TUBE', '#b8d8ff', '#333');
  btnRects.push({ id: 'add_tube', x: Math.round(255 * s), y: barY, w: Math.round(55 * s), h: Math.round(32 * s) });
  drawBtn(Math.round(sw - Math.round(70 * s)), barY, Math.round(62 * s), Math.round(32 * s), 'HOME', '#90ee90', '#333');
  btnRects.push({ id: 'home', x: Math.round(sw - Math.round(70 * s)), y: barY, w: Math.round(62 * s), h: Math.round(32 * s) });

  // ── 通关弹窗 ──
  if (won) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, sw, sh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(36 * s) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('YOU WON!', sw / 2, sh / 2 - Math.round(40 * s));
    var bw = Math.round(80 * s), bh = Math.round(36 * s);
    var bx = (sw - bw) / 2, by = sh / 2;
    drawBtn(bx, by, bw, bh, 'OK', '#90ee90', '#333');
    btnRects.push({ id: 'win_ok', x: bx, y: by, w: bw, h: bh });
  }
}

// ═══════════════════════════════════════════════
//  菜单界面
// ═══════════════════════════════════════════════
function renderMenu() {
  ctx.clearRect(0, 0, sw, sh);
  ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, sw, sh);
  var cx = sw / 2, cy = sh / 2;
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + Math.round(28 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧪 倒水游戏', cx, cy - Math.round(120 * s));
  ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.fillStyle = '#888';
  ctx.fillText('Water Sort Puzzle', cx, cy - Math.round(90 * s));
  var buttons = [
    { text: '🎯 闯关模式', y: cy - Math.round(40 * s), id: 'challenge' },
    { text: '🌟 特殊关卡', y: cy + Math.round(10 * s), id: 'special' },
    { text: '📁 我的关卡', y: cy + Math.round(60 * s), id: 'mylevels' },
    { text: '📖 游戏说明', y: cy + Math.round(110 * s), id: 'help' },
  ];
  btnRects = [];
  buttons.forEach(function (b) {
    var bw = Math.round(220 * s), bh = Math.round(40 * s), bx = cx - bw / 2, by = b.y - bh / 2;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
    var r = Math.round(12 * s);
    ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r); ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = Math.round(16 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, cx, b.y);
    btnRects.push({ id: b.id, x: bx, y: by, w: bw, h: bh });
  });
}
function renderChallenge() {
  ctx.clearRect(0, 0, sw, sh);
  ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, sw, sh);
  var cx = sw / 2, startY = Math.round(60 * s);
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + Math.round(20 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('闯关模式', cx, startY);
  var diffs = [{ t: '⭐ 简单 - 5色', n: 5, e: 2, sh2: 60 }, { t: '⭐⭐ 中等 - 6色', n: 6, e: 2, sh2: 80 }, { t: '⭐⭐⭐ 困难 - 6色·1空', n: 6, e: 1, sh2: 100 }, { t: '🌟🌟 专家 - 7色·1空', n: 7, e: 1, sh2: 120 }, { t: '💀 地狱 - 8色·1空', n: 8, e: 1, sh2: 150 }];
  btnRects = [];
  diffs.forEach(function (d, i) {
    var bw = Math.round(240 * s), bh = Math.round(36 * s), bx = cx - bw / 2, by = startY + Math.round(35 * s) + i * Math.round(45 * s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
    var r = Math.round(10 * s);
    ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r); ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = Math.round(15 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.t, cx, by + bh / 2);
    btnRects.push({ id: 'gen_' + i, n: d.n, e: d.e, sh2: d.sh2, x: bx, y: by, w: bw, h: bh });
  });
  // 返回按钮
  var bw = Math.round(60 * s), bh = Math.round(32 * s), bx = Math.round(10 * s), by = Math.round(10 * s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  var r = Math.round(8 * s);
  ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r); ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#333'; ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('← 返回', bx + bw / 2, by + bh / 2);
  btnRects.push({ id: 'back', x: bx, y: by, w: bw, h: bh });
}
function renderHelp() {
  ctx.clearRect(0, 0, sw, sh); ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, sw, sh);
  var cx = sw / 2;
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + Math.round(18 * s) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('📖 游戏说明', cx, Math.round(50 * s));
  var lines = ['目标：将所有相同颜色的水集中到同一试管', '规则：', '1. 点击选管，再点击另一根倒水', '2. 只能倒空管或同色水上方', '3. 每管最多装对应容量的水', '快捷键：无（微信小游戏触屏操作）', '底部按钮：UNDO撤销 RESTART重来 +TUBE加管 HOME回菜单'];
  ctx.font = Math.round(13 * s) + 'px sans-serif'; ctx.textAlign = 'left';
  lines.forEach(function (l, i) { ctx.fillText(l, Math.round(20 * s), Math.round(100 * s) + i * Math.round(28 * s)); });
  btnRects = [];
  var bw = Math.round(60 * s), bh = Math.round(32 * s), bx = Math.round(10 * s), by = Math.round(10 * s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  var r = Math.round(8 * s);
  ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r); ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#333'; ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('← 返回', bx + bw / 2, by + bh / 2);
  btnRects.push({ id: 'back', x: bx, y: by, w: bw, h: bh });
}
function renderMyLevels() {
  ctx.clearRect(0, 0, sw, sh); ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, sw, sh);
  var cx = sw / 2;
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + Math.round(18 * s) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('📁 我的关卡', cx, Math.round(50 * s));
  var levels = loadLevels();
  btnRects = [];
  if (levels.length === 0) {
    ctx.fillStyle = '#888'; ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('还没有自制关卡', cx, sh / 2);
  } else {
    var pageSize = 8;
    for (var i = myLevelsPage * pageSize; i < Math.min((myLevelsPage + 1) * pageSize, levels.length); i++) {
      var l = levels[i];
      var bw = Math.round(280 * s), bh = Math.round(36 * s), bx = cx - bw / 2, by = Math.round(90 * s) + (i - myLevelsPage * pageSize) * Math.round(42 * s);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      var rr = Math.round(8 * s);
      ctx.beginPath(); ctx.moveTo(bx + rr, by); ctx.lineTo(bx + bw - rr, by); ctx.arcTo(bx + bw, by, bx + bw, by + rr, rr); ctx.lineTo(bx + bw, by + bh - rr); ctx.arcTo(bx + bw, by + bh, bx + bw - rr, by + bh, rr); ctx.lineTo(bx + rr, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - rr, rr); ctx.lineTo(bx, by + rr); ctx.arcTo(bx, by, bx + rr, by, rr); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.font = Math.round(13 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(l.name + ' (' + l.colorCount + '色)', cx, by + bh / 2);
      btnRects.push({ id: 'play_level_' + i, levelIndex: i, x: bx, y: by, w: bw, h: bh });
      // 删除
      var dx = bx + bw + Math.round(5 * s), dw = Math.round(30 * s);
      ctx.fillStyle = '#fdd'; ctx.fillRect(dx, by, dw, bh);
      ctx.fillStyle = '#c00'; ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✕', dx + dw / 2, by + bh / 2);
      btnRects.push({ id: 'del_level_' + i, levelIndex: i, x: dx, y: by, w: dw, h: bh });
    }
  }
  var bw = Math.round(60 * s), bh = Math.round(32 * s), bx = Math.round(10 * s), by = Math.round(10 * s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  var r = Math.round(8 * s);
  ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r); ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#333'; ctx.font = Math.round(14 * s) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('← 返回', bx + bw / 2, by + bh / 2);
  btnRects.push({ id: 'back', x: bx, y: by, w: bw, h: bh });
}

// ═══════════════════════════════════════════════
//  输入
// ═══════════════════════════════════════════════
var DRAG_THRESH = 5;
wx.onTouchStart(function (e) {
  var t = e.touches[0]; if (!t) return;
  var mx = t.clientX, my = t.clientY;
  if (screen === 'menu' || screen === 'challenge' || screen === 'help' || screen === 'mylevels') return;
  if (screen === 'game') {
    // 先检查按钮
    for (var bi = btnRects.length - 1; bi >= 0; bi--) {
      var b = btnRects[bi];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (b.id === 'undo') { undo(); return; }
        if (b.id === 'restart') { restartLevel(); return; }
        if (b.id === 'add_tube') { addEmptyTube(); return; }
        if (b.id === 'home' || b.id === 'win_ok') { screen = 'menu'; reset(6); return; }
        return;
      }
    }
    if (won) return;
    var idx = hit(mx, my);
    if (idx >= 0 && !isAnimating(idx)) {
      dragState = { idx: idx, startX: mx, startY: my, origX: slots[idx].x, origY: slots[idx].y, moved: false };
    }
  }
});
wx.onTouchMove(function (e) {
  if (!dragState) return;
  var t = e.touches[0]; if (!t) return;
  var mx = t.clientX, my = t.clientY;
  var dx = mx - dragState.startX, dy = my - dragState.startY;
  if (Math.abs(dx) < DRAG_THRESH && Math.abs(dy) < DRAG_THRESH) return;
  dragState.moved = true;
  slots[dragState.idx].x = dragState.origX + dx;
  slots[dragState.idx].y = dragState.origY + dy;
  var cap = tubeCaps[dragState.idx] || 4;
  slots[dragState.idx].x = Math.max(2, Math.min(sw - TW - 2, slots[dragState.idx].x));
  slots[dragState.idx].y = Math.max(2, Math.min(sh - totalH(cap) - 2, slots[dragState.idx].y));
});
wx.onTouchEnd(function (e) {
  if (!dragState) return;
  var idx = dragState.idx, moved = dragState.moved;
  dragState = null;
  if (moved) {
    var free = findFreeSpot(idx, slots[idx].x, slots[idx].y);
    slots[idx].x = free.x; slots[idx].y = free.y;
  } else {
    tap(idx);
  }
});

// ── 菜单触摸 ──
wx.onTouchEnd(function (e) {
  if (screen === 'game') return; // handled above
  var t = e.changedTouches[0]; if (!t) return;
  var mx = t.clientX, my = t.clientY;
  for (var bi = btnRects.length - 1; bi >= 0; bi--) {
    var b = btnRects[bi];
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      if (b.id === 'challenge') { screen = 'challenge'; return; }
      if (b.id === 'special') { screen = 'game'; resetFromData(genLevelSmart(5, 2, 60).concat([['transparent','transparent','transparent','transparent'],['transparent','transparent','transparent','transparent']])); return; }
      if (b.id === 'mylevels') { screen = 'mylevels'; return; }
      if (b.id === 'help') { screen = 'help'; return; }
      if (b.id === 'back') { screen = 'menu'; return; }
      if (b.id && b.id.startsWith('gen_')) {
        var data = genLevelSmart(b.n, b.e, b.sh2);
        playMode = 'challenge'; screen = 'game'; resetFromData(data); return;
      }
      if (b.id && b.id.startsWith('play_level_')) {
        var levels = loadLevels();
        var l = levels[b.levelIndex]; if (!l) return;
        var data = l.tubes.map(function (t) { return t.slice(); });
        playMode = 'custom'; screen = 'game'; resetFromData(data); return;
      }
      if (b.id && b.id.startsWith('del_level_')) {
        var levels = loadLevels();
        levels.splice(b.levelIndex, 1); saveLevels(levels); return;
      }
    }
  }
});

// ═══════════════════════════════════════════════
//  主循环
// ═══════════════════════════════════════════════
function loop(ts) {
  if (screen === 'menu') renderMenu();
  else if (screen === 'challenge') renderChallenge();
  else if (screen === 'help') renderHelp();
  else if (screen === 'mylevels') renderMyLevels();
  else if (screen === 'game') render(ts);
  requestAnimationFrame(loop);
}
reset(6);
layout();
requestAnimationFrame(loop);
