// ╔══════════════════════════════════════════════════════╗
// ║  倒水游戏 · Water Sort  —  微信小游戏版                  ║
// ╚══════════════════════════════════════════════════════╝
var canvas=wx.createCanvas(),ctx=canvas.getContext('2d');
var sw=canvas.width,sh=canvas.height;

// ── wx 适配 ──
function now(){return Date.now();}
var LS_KEY='ws_custom';
function loadLevels(){try{return wx.getStorageSync(LS_KEY)||[];}catch(e){return[];}}
function saveLevels(v){wx.setStorageSync(LS_KEY,v);}

// ── 常量 ──
var TW=56,RIM_H=10,GAP=20,BOTTOM_R=28,WALL=4;
var IW=TW-WALL*2,LAYER_H=36,INNER_R=BOTTOM_R-WALL,FB_DURATION=380;
function straightH(c){return c*LAYER_H-10;}
function totalH(c){return RIM_H+straightH(c)+BOTTOM_R;}
var PALETTE=['#F4A7A0','#A8D8C8','#A0C4F4','#F4E4A0','#C8B8E8','#F4C8A0','#5BC0BE','#E8B8C8','#B8C8E0','#D8C8B0','#FF7B7B','#7BC67E','#8B7CB8','#6B8FA0','#D4956B','#6B6B6B'];

// ── Canvas 圆角矩形 ──
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

// ── 工具 ──
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function topIdx(w){for(var i=w.length-1;i>=0;i--)if(w[i]!=='transparent')return i;return-1;}
function topClr(w){var i=topIdx(w);return i===-1?'transparent':w[i];}
function topRun(w){var i=topIdx(w);if(i===-1)return 0;var c=w[i],n=0;for(var j=i;j>=0&&w[j]===c;j--)n++;return n;}
function space(w){var n=0;for(var i=w.length-1;i>=0&&w[i]==='transparent';i--)n++;return n;}
function filled(w){var n=0;for(var i=0;i<w.length;i++)if(w[i]!=='transparent')n++;return n;}
function pure(w){var f=w[0];for(var i=1;i<w.length;i++)if(w[i]!==f)return false;return true;}
function vTopIdx(w,h){for(var i=w.length-1;i>=0;i--){if(w[i]==='transparent')continue;if(i<h)return-1;return i;}return-1;}
function vTopClr(w,h){var i=vTopIdx(w,h);return i===-1?'transparent':w[i];}
function vTopRun(w,h){var i=vTopIdx(w,h);if(i===-1)return 0;var c=w[i],n=0;for(var j=i;j>=h&&w[j]===c;j--)n++;return n;}
function lighten(h,a){var n=parseInt(h.slice(1),16);return'rgb('+Math.min(255,(n>>16)+a)+','+Math.min(255,(n>>8&255)+a)+','+Math.min(255,(n&255)+a)+')';}
function darken(h,a){var n=parseInt(h.slice(1),16);return'rgb('+Math.max(0,(n>>16)-a)+','+Math.max(0,(n>>8&255)-a)+','+Math.max(0,(n&255)-a)+')';}

// ── 状态 ──
var screen='menu',playMode='challenge',playLevelId=null,playBack='menu';
var tubes=[],tubeCaps=[],hiddenMask=[],hiddenMaskInit=[],tubesInit=[],capsInit=[];
var moves=0,won=false,selected=-1,undoStack=[],colorN=6;
var transferAnims=[],cachedSlots=null,feedback=null,revealAnim=null;
var slots=[],cw,ch,hintThinking=false,HINT_TIMEOUT=4000;
var btnRects=[];
var editTubes=[],editCaps=[],editHidden=[],editActiveColor=0,editBlindMode=false;
var myLevelsPage=0;

// ── 难度配置 ──
var DIFFS=[
  {n:5,e:2,sh:60,label:'⭐ 简单',hint:'5色·2空管'},
  {n:6,e:2,sh:80,label:'⭐⭐ 中等',hint:'6色·2空管'},
  {n:7,e:2,sh:120,label:'⭐⭐⭐ 困难',hint:'7色·2空管'},
  {n:8,e:2,sh:160,label:'🌟🌟 专家',hint:'8色·2空管'},
  {n:10,e:2,sh:200,label:'💀 地狱',hint:'10色·2空管'}
];
var VC_DIFFS=[
  {n:3,label:'🌱 入门',hint:'3色·容量4~5'},
  {n:4,label:'🌿 初级',hint:'4色·容量4~6'},
  {n:5,label:'🌳 中级',hint:'5色·容量4~6'},
  {n:6,label:'🏔 高级',hint:'6色·容量4~7'}
];
var BB_DIFFS=[
  {n:5,label:'🎁 简单',hint:'5色·1~2盲',mxH:1,tr:0.25},
  {n:6,label:'🎁 中等',hint:'6色·2~3盲',mxH:2,tr:0.35},
  {n:7,label:'🎁 困难',hint:'7色·3~5盲',mxH:2,tr:0.5},
  {n:8,label:'🎁 专家',hint:'8色·4~6盲',mxH:2,tr:0.6}
];

// ══════════════════════════════════════
//  生成器 + 解谜器（照搬 web 版）
// ══════════════════════════════════════

function fallbackGen(nc,emp){var cs=shuffle([].concat(PALETTE)).slice(0,nc);var all=[];for(var i=0;i<nc;i++)for(var j=0;j<4;j++)all.push(cs[i]);all=shuffle(all);var lst=[];for(var i=0;i<nc;i++){var w=[];for(var j=0;j<4;j++)w.push(all[i*4+j]);lst.push(w);}for(var i=0;i<emp;i++)lst.push(['transparent','transparent','transparent','transparent']);return lst;}

function checkSolvable(tubes,md){md=md||600;
  var _ti=function(w){for(var i=w.length-1;i>=0;i--)if(w[i]!=='transparent')return i;return-1;};
  var _tc=function(w){var i=_ti(w);return i===-1?'transparent':w[i];};
  var _tr=function(w){var i=_ti(w);if(i===-1)return 0;var c=w[i],n=0;for(var j=i;j>=0&&w[j]===c;j--)n++;return n;};
  var _sp=function(w){var n=0;for(var i=w.length-1;i>=0&&w[i]==='transparent';i--)n++;return n;};
  var _pu=function(w){var f=w[0];for(var i=1;i<w.length;i++)if(w[i]!==f)return false;return true;};
  var vis=new Set();
  function key(s){var nm=s.map(function(t){return t.join(',');});var em=[],pu=[],re=[];for(var i=0;i<nm.length;i++){var t=nm[i];var ly=t.split(',');if(ly.every(function(c){return c==='transparent';}))em.push(t);else if(ly.every(function(c){return c===ly[0];}))pu.push(t);else re.push(t);}return re.sort().concat(pu.sort()).concat(em.sort()).join('|');}
  function dfs(s,d){
    if(d>md)return false;if(s.every(_pu))return true;
    var k=key(s);if(vis.has(k))return false;vis.add(k);
    for(var fr=0;fr<s.length;fr++){if(_pu(s[fr]))continue;var st=_tc(s[fr]);if(st==='transparent')continue;
      for(var to=0;to<s.length;to++){if(fr===to)continue;var dt=_tc(s[to]);if(dt!=='transparent'&&dt!==st)continue;if(_sp(s[to])===0)continue;
        var sf=[].concat(s[fr]),st2=[].concat(s[to]);var cn=Math.min(_tr(s[fr]),_sp(s[to]));
        var rm=0;for(var i=s[fr].length-1;i>=0&&rm<cn;i--)if(s[fr][i]===st){s[fr][i]='transparent';rm++;}
        var ad=0;for(var i=0;i<s[to].length&&ad<cn;i++)if(s[to][i]==='transparent'){s[to][i]=st;ad++;}
        if(dfs(s,d+1))return true;s[fr]=sf;s[to]=st2;
      }
    }return false;
  }return dfs(tubes.map(function(t){return[].concat(t);}),0);
}

function genLevelSmart(nc,emp,shm,d){d=d||0;if(d>50)return fallbackGen(nc,emp);
  var cs=shuffle([].concat(PALETTE)).slice(0,nc);var lst=[];
  for(var i=0;i<nc;i++){var w=[];for(var j=0;j<4;j++)w.push(cs[i]);lst.push(w);}
  for(var i=0;i<emp;i++)lst.push(['transparent','transparent','transparent','transparent']);
  var eff=0,mt=shm*20;
  for(var k=0;k<mt&&eff<shm;k++){var fr,to;do{fr=Math.floor(Math.random()*lst.length);to=Math.floor(Math.random()*lst.length);}while(fr===to);
    var sc=topClr(lst[fr]);if(sc==='transparent')continue;var dc=topClr(lst[to]);if(dc!=='transparent'&&dc!==sc)continue;
    var rn=topRun(lst[fr]),sp=space(lst[to]),cn=Math.min(rn,sp);if(cn<=0)continue;
    var rm=0;for(var i=lst[fr].length-1;i>=0&&rm<cn;i--)if(lst[fr][i]===sc){lst[fr][i]='transparent';rm++;}
    var ad=0;for(var i=0;i<lst[to].length&&ad<cn;i++)if(lst[to][i]==='transparent'){lst[to][i]=sc;ad++;}eff++;}
  if(eff<3||lst.every(pure))return genLevelSmart(nc,emp,shm,d+1);
  var res=lst.map(function(w){return[].concat(w);});
  if(!checkSolvable(res,Math.max(800,nc*120)))return genLevelSmart(nc,emp,shm,d+1);
  return res;
}

function genVaricapLevel(nc){var cs=shuffle([].concat(PALETTE)).slice(0,nc);var caps=[4,5,6,7,4,5,6,7,4,5];var all=[];for(var i=0;i<nc;i++)for(var j=0;j<caps[i];j++)all.push(cs[i]);all=shuffle(all);var lst=[],idx=0;for(var i=0;i<nc;i++){var w=[];for(var j=0;j<caps[i];j++)w.push(all[idx++]);lst.push(w);}lst.push(['transparent','transparent','transparent','transparent']);lst.push(['transparent','transparent','transparent','transparent']);if(lst.every(pure))return genVaricapLevel(nc);return{tubes:lst,caps:lst.map(function(w){return w.length;})};}

function genBlindbox(n,mxH,tr){var data=genLevelSmart(n,2,50+n*10);var nth=Math.max(1,Math.floor(data.length*tr));var cand=data.map(function(t,i){return{i:i,f:filled(t)};}).filter(function(x){return x.f>=2;});var sfd=shuffle([].concat(cand));var mask=[];for(var i=0;i<data.length;i++)mask.push(0);var hid=0;for(var i=0;i<sfd.length;i++){if(hid>=nth)break;var c=sfd[i];var mh=Math.min(mxH,c.f-1);if(mh<1)continue;var h=1+Math.floor(Math.random()*mh);mask[c.i]=h;hid++;}return{data:data,mask:mask};}

// ── 提示 ──
function findHint(tubes,caps,hidMsk,tm){tm=tm||HINT_TIMEOUT;var st=now(),md=Math.max(800,tubes.length*80);
  var _ti=function(w){for(var i=w.length-1;i>=0;i--)if(w[i]!=='transparent')return i;return-1;};
  var _tc=function(w){var i=_ti(w);return i===-1?'transparent':w[i];};
  var _tr=function(w){var i=_ti(w);if(i===-1)return 0;var c=w[i],n=0;for(var j=i;j>=0&&w[j]===c;j--)n++;return n;};
  var _sp=function(w){var n=0;for(var i=w.length-1;i>=0&&w[i]==='transparent';i--)n++;return n;};
  var _pu=function(w){var f=w[0];for(var i=1;i<w.length;i++)if(w[i]!==f)return false;return true;};
  function key(s){var nm=s.map(function(t){return t.join(',');});var em=[],pu=[],re=[];for(var i=0;i<nm.length;i++){var t=nm[i];var ly=t.split(',');if(ly.every(function(c){return c==='transparent';}))em.push(t);else if(ly.every(function(c){return c===ly[0];}))pu.push(t);else re.push(t);}return re.sort().concat(pu.sort()).concat(em.sort()).join('|');}
  var vis=new Set();
  function dfs(s,d,fm){if(d>md||(d%200===0&&now()-st>tm))return'timeout';if(s.every(_pu))return true;var k=key(s);if(vis.has(k))return false;vis.add(k);
    var mvs=[],fe=-1;for(var i=0;i<s.length;i++)if(_tc(s[i])==='transparent'){fe=i;break;}
    for(var fr=0;fr<s.length;fr++){if(_pu(s[fr]))continue;var sc=_tc(s[fr]);if(sc==='transparent')continue;var sr=_tr(s[fr]);
      for(var to=0;to<s.length;to++){if(fr===to)continue;var dt=_tc(s[to]);if(dt!=='transparent'&&dt!==sc)continue;var sp=_sp(s[to]);if(sp===0)continue;if(dt==='transparent'&&to!==fe)continue;var cn=Math.min(sr,sp);
        if(dt===sc){var asr=sr-cn;var tt=[].concat(s[to]);var ta=0;for(var i=0;i<tt.length&&ta<cn;i++)if(tt[i]==='transparent'){tt[i]=sc;ta++;}var cp=tt.every(function(c){return c===tt[0];});if(!cp&&asr>0)continue;}
        var sc2=cn*10;var at2=[].concat(s[to]);var ad2=0;for(var i=0;i<at2.length&&ad2<cn;i++)if(at2[i]==='transparent'){at2[i]=sc;ad2++;}if(at2.every(function(c){return c===at2[0];}))sc2+=100;else if(dt!=='transparent')sc2+=50;mvs.push({fr:fr,to:to,cn:cn,sc2:sc2,sc:sc});}}
    mvs.sort(function(a,b){return b.sc2-a.sc2;});
    for(var mi=0;mi<mvs.length;mi++){var mv=mvs[mi];var fr=mv.fr,to=mv.to,cn=mv.cn,sc=mv.sc;var sf=[].concat(s[fr]),st2=[].concat(s[to]);
      var rm=0;for(var i=s[fr].length-1;i>=0&&rm<cn;i--)if(s[fr][i]===sc){s[fr][i]='transparent';rm++;}
      var ad=0;for(var i=0;i<s[to].length&&ad<cn;i++)if(s[to][i]==='transparent'){s[to][i]=sc;ad++;}
      var move=fm!==null?fm:{from:fr,to:to};var r=dfs(s,d+1,move);if(r===true)return move;if(r&&r!=='timeout'&&typeof r==='object')return r;s[fr]=sf;s[to]=st2;}
    return false;}
  try{var r=dfs(tubes.map(function(t){return[].concat(t);}),0,null);if(r==='timeout')return'timeout';return(r&&typeof r==='object')?r:null;}catch(e){return null;}
}

// ══════════════════════════════════════
//  游戏逻辑（照搬）
// ══════════════════════════════════════

function resetFromData(data,mask,caps){tubesInit=data.map(function(t){return[].concat(t);});tubes=data.map(function(t){return[].concat(t);});capsInit=caps?[].concat(caps):data.map(function(t){return t.length;});tubeCaps=[].concat(capsInit);if(mask){hiddenMaskInit=[].concat(mask);}else{hiddenMaskInit=[];for(var i=0;i<data.length;i++)hiddenMaskInit.push(0);}hiddenMask=[].concat(hiddenMaskInit);revealAnim=null;colorN=new Set(tubes.flat()).size-1;moves=0;won=false;selected=-1;undoStack=[];feedback=null;transferAnims=[];layout();screen='game';}

function restartLevel(){tubes=tubesInit.map(function(t){return[].concat(t);});tubeCaps=[].concat(capsInit);hiddenMask=[].concat(hiddenMaskInit);revealAnim=null;moves=0;won=false;selected=-1;undoStack=[];feedback=null;transferAnims=[];layout();}

function isCapped(i){if(!pure(tubes[i])||filled(tubes[i])===0||hiddenMask[i]>0)return false;var clr=tubes[i][0];if(clr==='transparent')return false;var total=0;for(var ti=0;ti<tubes.length;ti++)for(var tj=0;tj<tubes[ti].length;tj++)if(tubes[ti][tj]===clr)total++;return total===tubes[i].length;}
function isAnimating(i){return transferAnims.some(function(a){return a.from===i||a.to===i;});}

function attempt(from,to){var src=tubes[from],dst=tubes[to];var hid=hiddenMask[from];var sc=vTopClr(src,hid);if(sc==='transparent'){reject(from);return;}if(space(dst)===0){reject(from);return;}var dc=topClr(dst);if(dc!=='transparent'&&dc!==sc){reject(from);return;}var run=vTopRun(src,hid),sp=space(dst),cnt=Math.min(run,sp);var ohf=hiddenMask[from];undoStack.push({from:from,to:to,color:sc,count:cnt,oldHiddenFrom:ohf});cachedSlots=slots.map(function(s){return{x:s.x,y:s.y};});var fp=cachedSlots[from],tp=cachedSlots[to];var thT=totalH(tubeCaps[to]||4);var topI=topIdx(src),wf=topI>=0?(topI+0.8)/src.length:0.25;var mt=Math.PI/180*(20+(1-wf)*55);var drops=[];for(var d=0;d<8;d++)drops.push({delay:0.35+Math.random()*0.3,radius:2.5+Math.random()*4,offsetX:(Math.random()-0.5)*10});transferAnims.push({from:from,to:to,fromColor:sc,count:cnt,elapsed:0,duration:1100,_last:now(),_soundPlayed:false,fromOrigX:fp.x,fromOrigY:fp.y,fromTargetX:Math.max(4,tp.x-TW*0.6),fromTargetY:tp.y-thT*0.5,sourceX:fp.x,sourceY:fp.y,sourceTilt:0,targetBump:1,droplets:drops,preSource:src.slice(),preTarget:dst.slice(),maxTilt:mt,oldHiddenFrom:ohf});moves++;}
function reject(idx){feedback={tube:idx,kind:'reject',t:now()};}

function undo(){if(won||undoStack.length===0)return;var act=undoStack.pop();var from=act.from,to=act.to,color=act.color,count=act.count,ohf=act.oldHiddenFrom;var rm=0;for(var i=tubes[to].length-1;i>=0&&rm<count;i--)if(tubes[to][i]===color){tubes[to][i]='transparent';rm++;}var ad=0;for(var i=0;i<tubes[from].length&&ad<count;i++)if(tubes[from][i]==='transparent'){tubes[from][i]=color;ad++;}if(ohf!==undefined)hiddenMask[from]=ohf;moves=Math.max(0,moves-1);selected=-1;feedback=null;}

function checkWin(){if(!tubes.every(pure))return;won=true;var par=colorN*7,stars=1;if(moves<=par*1.1)stars=3;else if(moves<=par*1.7)stars=2;var emoji=['','⭐','🌟🌟','🌟🌟🌟'][stars];var back=playMode==='custom'?playBack:'menu';wx.showModal({title:'恭喜通关！',content:emoji+'\n'+moves+' 步完成',showCancel:false,confirmText:'返回',success:function(){screen=back;layout();}});}

function addTubeDuringPlay(){if(won||transferAnims.length>0)return;var cap=playMode==='varicap'?1:4;tubes.push([]);for(var i=0;i<cap;i++)tubes[tubes.length-1].push('transparent');tubeCaps.push(cap);hiddenMask.push(0);layout();selected=-1;}

function triggerHint(){if(hintThinking||won||transferAnims.length>0)return;if(!tubes||tubes.length===0||tubes.every(pure))return;hintThinking=true;selected=-1;setTimeout(function(){var r=findHint(tubes,tubeCaps,hiddenMask,HINT_TIMEOUT);hintThinking=false;if(r&&typeof r==='object'){attempt(r.from,r.to);}},30);}

// ── 布局 ──
function layout(){cw=sw;ch=sh;if(screen!=='game'){slots=[];return;}if(!tubes||tubes.length===0)return;var perRow=Math.max(2,Math.floor((cw-40)/(TW+GAP)));var rows=Math.ceil(tubes.length/perRow);var rowHts=[];for(var r=0;r<rows;r++){var st=r*perRow,ed=Math.min(st+perRow,tubes.length);var mh=totalH(4);for(var i=st;i<ed;i++)mh=Math.max(mh,totalH(tubeCaps[i]||4));rowHts.push(mh);}var trh=0;for(var r=0;r<rowHts.length;r++)trh+=rowHts[r]+16;slots=[];var topY=Math.max(40,Math.round((ch-trh)/2));for(var r=0;r<rows;r++){var st=r*perRow,ed=Math.min(st+perRow,tubes.length);var cnt=ed-st,rw=cnt*TW+(cnt-1)*GAP,rx=(cw-rw)/2;for(var i=st;i<ed;i++){var cap=tubeCaps[i]||4;var th=totalH(cap);slots.push({x:rx+(i-st)*(TW+GAP),y:topY+(rowHts[r]-th)});}topY+=rowHts[r]+16;}}

// ══════════════════════════════════════
//  渲染（照搬 web 版 Canvas 代码）
// ══════════════════════════════════════
function drawBg(){ctx.fillStyle='#f7f5f0';ctx.fillRect(0,0,cw,ch);}

function drawStand(x,y,cap){var cx=x+TW/2,boY=y+RIM_H+straightH(cap)+BOTTOM_R;ctx.fillStyle='#e8e4dc';ctx.beginPath();ctx.ellipse(cx,boY+1,TW/2+1,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dcd7ce';ctx.beginPath();ctx.ellipse(cx,boY-1,TW/2-1,2,0,0,Math.PI*2);ctx.fill();}
function drawCap(x,y,cap){var cx=x+TW/2,topY=y+RIM_H;ctx.fillStyle='#d5c4a1';ctx.strokeStyle='#b8a888';ctx.lineWidth=1.5;rr(x-3,topY-10,TW+6,12,5);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,0.35)';rr(x,topY-8,TW,3,2);ctx.fill();ctx.fillStyle='rgba(0,0,0,0.10)';rr(x-1,topY-1,TW+2,4,2);ctx.fill();}

function drawTube(x,y,water,sel,fbKind,hidden,rv,rvPrev,cap,tubeIdx){cap=cap||4;var sh=straightH(cap),th=totalH(cap);var cx=x+TW/2,bodyTop=y+RIM_H,sBot=bodyTop+sh;var innerX=x+WALL,innerTopY=bodyTop+WALL;ctx.save();if(sel){var glow=ctx.createRadialGradient(cx,y+th/2,TW*0.3,cx,y+th/2,TW*1.5);glow.addColorStop(0,'rgba(200,170,110,0.22)');glow.addColorStop(1,'rgba(200,170,110,0)');ctx.fillStyle=glow;ctx.fillRect(x-24,y-8,TW+48,th+20);}
var tp=function(){ctx.beginPath();ctx.moveTo(x,bodyTop);ctx.lineTo(x,sBot);ctx.arc(cx,sBot,BOTTOM_R,Math.PI,0,true);ctx.lineTo(x+TW,bodyTop);ctx.closePath();};tp();ctx.fillStyle='rgba(248,246,243,0.55)';ctx.fill();tp();ctx.strokeStyle='rgba(175,170,162,0.50)';ctx.lineWidth=1.8;ctx.stroke();
ctx.save();ctx.beginPath();ctx.moveTo(innerX,innerTopY);ctx.lineTo(innerX,sBot);ctx.arc(cx,sBot,INNER_R,Math.PI,0,true);ctx.lineTo(innerX+IW,innerTopY);ctx.closePath();ctx.clip();
if(fbKind){ctx.fillStyle=fbKind==='reject'?'rgba(255,120,120,0.18)':'rgba(120,255,120,0.15)';ctx.fillRect(innerX,innerTopY,IW,sBot+INNER_R-innerTopY);}
var blocks=[];for(var bi=0;bi<water.length;bi++){if(water[bi]==='transparent')continue;var bc=water[bi];if(blocks.length>0&&blocks[blocks.length-1].c===bc)blocks[blocks.length-1].n++;else blocks.push({c:bc,n:1});}
var totalL=0;for(var bj=0;bj<blocks.length;bj++)totalL+=blocks[bj].n;
var innDp=sBot+INNER_R;var ts=now()/1000;var drawIdx=0;
for(var bi2=0;bi2<blocks.length;bi2++){var clr=blocks[bi2].c,cnt=blocks[bi2].n;var ly=innDp-(drawIdx+cnt)*LAYER_H,lh=cnt*LAYER_H+1;if(water._partialIdx>=0&&water._partialIdx>=drawIdx&&water._partialIdx<drawIdx+cnt){lh-=(1-water._partialFrac)*LAYER_H;ly+=(1-water._partialFrac)*LAYER_H;}var isHid=hidden>0&&drawIdx<hidden;var isTop=(bi2===blocks.length-1);
if(isHid){var g=ctx.createLinearGradient(innerX,ly,innerX+IW,ly+lh);var h0=((ts*50+ly*3)%360);g.addColorStop(0,'hsl('+h0+',80%,45%)');g.addColorStop(0.25,'hsl('+((h0+60)%360)+',85%,42%)');g.addColorStop(0.5,'hsl('+((h0+120)%360)+',80%,48%)');g.addColorStop(0.75,'hsl('+((h0+180)%360)+',85%,40%)');g.addColorStop(1,'hsl('+((h0+240)%360)+',80%,46%)');ctx.fillStyle=g;ctx.fillRect(innerX,ly,IW,lh);ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('?',cx,ly+lh/2+5);}
else{var g2=ctx.createLinearGradient(0,ly,0,ly+lh);g2.addColorStop(0,lighten(clr,20));g2.addColorStop(0.55,clr);g2.addColorStop(1,darken(clr,12));ctx.fillStyle=g2;ctx.fillRect(innerX,ly,IW,lh);if(isTop){var sY2=ly;var nw2=now()/1000;ctx.strokeStyle='rgba(255,255,255,0.40)';ctx.lineWidth=1.8;var wa=1.5,sx2=innerX+3,ex2=innerX+IW-3;ctx.beginPath();ctx.moveTo(sx2,sY2+Math.sin(nw2*3+sx2*0.04)*wa);for(var wx=sx2+2;wx<=ex2;wx+=2)ctx.lineTo(wx,sY2+Math.sin(nw2*3+wx*0.04)*wa);ctx.stroke();}}
drawIdx+=cnt;}ctx.restore();ctx.restore();}

function buildSrcWater(pre,color,count,prog){var w=pre.slice();var rm=0;for(var i=w.length-1;i>=0&&rm<count;i--){if(w[i]===color){w[i]='transparent';rm++;}}w._partialIdx=-1;return w;}

function finishTransferAnim(a){var wf=tubes[a.from],wt=tubes[a.to];var rm=0;for(var i=wf.length-1;i>=0&&rm<a.count;i--)if(wf[i]===a.fromColor){wf[i]='transparent';rm++;}var ad=0;for(var i=0;i<wt.length&&ad<a.count;i++)if(wt[i]==='transparent'){wt[i]=a.fromColor;ad++;}if(a.oldHiddenFrom>0&&vTopIdx(wf,a.oldHiddenFrom)===-1){revealAnim={tube:a.from,startTime:now(),prevHidden:a.oldHiddenFrom};hiddenMask[a.from]=a.oldHiddenFrom-1;}checkWin();}

// ── 整个渲染循环 ──
function render(nowTs){
  if(screen!=='game'){ctx.clearRect(0,0,cw,ch);drawBg();drawUI();return;}
  if(!tubes||tubes.length===0||slots.length===0){ctx.clearRect(0,0,cw,ch);drawBg();drawUI();return;}
  ctx.clearRect(0,0,cw,ch);drawBg();
  var easeIn=function(x){return x<0.5?2*x*x:-1+(4-2*x)*x;},easeOt=function(x){return 1-(1-x)*(1-x);};
  for(var ai=transferAnims.length-1;ai>=0;ai--){var a=transferAnims[ai];var dt2=nowTs-(a._last||nowTs);if(dt2<0)dt2=0;if(dt2>33)dt2=33;a.elapsed=Math.min(a.duration,a.elapsed+dt2);a._last=nowTs;var at2=Math.min(a.elapsed/a.duration,1);
    if(at2<=0.12){var p1=easeIn(at2/0.12);a.sourceX=a.fromOrigX+(a.fromTargetX-a.fromOrigX)*p1;a.sourceY=a.fromOrigY+(a.fromTargetY-a.fromOrigY)*p1;a.sourceTilt=0;a.targetBump=1;}
    else if(at2<=0.60){a.sourceX=a.fromTargetX;a.sourceY=a.fromTargetY;var p2=(at2-0.12)/0.48,wob=Math.sin(a.elapsed*0.015)*(4*Math.PI/180)*p2;a.sourceTilt=a.maxTilt*easeIn(p2)+wob;var bp=Math.max(0,Math.min(1,(at2-0.25)/0.2));a.targetBump=1+Math.sin(bp*Math.PI)*0.06;}
    else if(at2<=0.78){a.sourceX=a.fromTargetX;a.sourceY=a.fromTargetY;a.sourceTilt=a.maxTilt*(1-easeOt((at2-0.60)/0.18));a.targetBump=1;}
    else{a.sourceX=a.fromTargetX+(a.fromOrigX-a.fromTargetX)*easeIn((at2-0.78)/0.22);a.sourceY=a.fromTargetY+(a.fromOrigY-a.fromTargetY)*easeIn((at2-0.78)/0.22);a.sourceTilt=0;a.targetBump=1;}
    a._animT=at2;a._pourP=Math.max(0,Math.min(1,(at2-0.12)/0.48));if(at2>=1){finishTransferAnim(a);transferAnims.splice(ai,1);}}
  var fbTube=-1,fbKind=null;if(feedback){var age=nowTs-feedback.t;if(age<FB_DURATION){fbTube=feedback.tube;fbKind=feedback.kind;}else feedback=null;}
  var pourIdxs=[];for(var ai=0;ai<transferAnims.length;ai++)pourIdxs.push(transferAnims[ai].from);
  for(var i=0;i<tubes.length;i++){if(pourIdxs.indexOf(i)>=0){var pos=slots[i];drawStand(pos.x,pos.y,tubeCaps[i]||4);continue;}var pos=slots[i];var floatY=(selected===i&&transferAnims.length===0)?-7:0;var cap=tubeCaps[i]||4;ctx.save();var cx2=pos.x+TW/2,cy2=pos.y+totalH(cap)/2;ctx.translate(cx2,cy2);ctx.translate(-cx2,-cy2);drawStand(pos.x,pos.y+floatY,cap);drawTube(pos.x,pos.y+floatY,tubes[i],selected===i,(fbTube===i)?fbKind:null,hiddenMask[i]||0,1,0,cap,i);var isP=transferAnims.some(function(a2){return a2.from===i||a2.to===i;});if(!isP&&isCapped(i))drawCap(pos.x,pos.y+floatY,cap);ctx.restore();}
  for(var ai=0;ai<transferAnims.length;ai++){var a2=transferAnims[ai];var cap2=tubeCaps[a2.from]||4;var water2=buildSrcWater(a2.preSource,a2.fromColor,a2.count,a2._pourP);var pivX=a2.sourceX+TW,pivY=a2.sourceY;ctx.save();ctx.translate(pivX,pivY);ctx.rotate(a2.sourceTilt);ctx.translate(-pivX,-pivY);drawTube(a2.sourceX,a2.sourceY,water2,false,null,hiddenMask[a2.from]||0,1,0,cap2,a2.from);ctx.restore();}
  drawUI();
}

// ══════════════════════════════════════
//  Canvas UI（替代 HTML）
// ══════════════════════════════════════
function drawBtn2(x,y,w,h,txt,disabled,color){
  ctx.fillStyle=color||'#fff';ctx.strokeStyle=disabled?'#ddd':'#e2ded8';ctx.lineWidth=1.5;rr(x,y,w,h,22);ctx.fill();ctx.stroke();
  ctx.fillStyle=disabled?'#ccc':'#3b3b3b';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+w/2,y+h/2);
}

function drawUI(){
  btnRects=[];
  if(screen==='menu'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('💧 倒水游戏',sw/2,sh*0.12);
    var btns=[{id:'challenge',txt:'🎮  闯关模式'},{id:'special',txt:'🌟  特殊关卡'},{id:'editor',txt:'🔧  关卡自制器'},{id:'mylevels',txt:'📁  我的关卡'},{id:'help',txt:'📖  游戏说明'}];
    var bw=240,bh=44,sy=sh*0.22,gp=12;
    for(var i=0;i<btns.length;i++){var by=sy+i*(bh+gp);drawBtn2((sw-bw)/2,by,bw,bh,btns[i].txt);btnRects.push({id:btns[i].id,x:(sw-bw)/2,y:by,w:bw,h:bh});}
  }else if(screen==='game'){
    var bw2=70,bh2=36,gp2=8;var btns2=[
      {id:'undo',txt:'↩ 撤销',disabled:undoStack.length===0||won||transferAnims.length>0},
      {id:'hint',txt:hintThinking?'💭':'💡 提示',disabled:won||transferAnims.length>0||hintThinking},
      {id:'reset',txt:'↻ 重来',disabled:transferAnims.length>0},
      {id:'addtube',txt:'＋ 管子',disabled:won||transferAnims.length>0},
      {id:'back',txt:'← 返回',disabled:transferAnims.length>0}
    ];var totW=btns2.length*bw2+(btns2.length-1)*gp2;var sx=(sw-totW)/2,gy=sh-bh2-16;
    for(var i=0;i<btns2.length;i++){drawBtn2(sx,gy,bw2,bh2,btns2[i].txt,btns2[i].disabled);btnRects.push({id:btns2[i].id,x:sx,y:gy,w:bw2,h:bh2});sx+=bw2+gp2;}
    ctx.fillStyle='#3b3b3b';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('步数 '+moves,sw/2,gy-10);
  }else if(screen==='challenge'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('闯关模式',sw/2,30);
    ctx.font='13px sans-serif';ctx.fillStyle='#888';ctx.fillText('随机生成（反向构造·保证有解）',sw/2,54);
    var bw3=300,bh3=38,sy3=72,gp3=6;for(var i=0;i<DIFFS.length;i++){var by3=sy3+i*(bh3+gp3);drawBtn2((sw-bw3)/2,by3,bw3,bh3,DIFFS[i].label+'    '+DIFFS[i].hint);btnRects.push({id:'diff_'+i,x:(sw-bw3)/2,y:by3,w:bw3,h:bh3,di:i});}
    drawBtn2(10,10,60,30,'← 返回');btnRects.push({id:'back',x:10,y:10,w:60,h:30});
  }else if(screen==='special'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('特殊关卡',sw/2,30);
    ctx.font='13px sans-serif';ctx.fillStyle='#888';ctx.fillText('🎁 盲盒模式',sw/2,54);
    var bw4=300,bh4=34,sy4=70,gp4=5;
    for(var i=0;i<BB_DIFFS.length;i++){var by4=sy4+i*(bh4+gp4);drawBtn2((sw-bw4)/2,by4,bw4,bh4,BB_DIFFS[i].label+'  '+BB_DIFFS[i].hint);btnRects.push({id:'bb_'+i,x:(sw-bw4)/2,y:by4,w:bw4,h:bh4,bi:i});}
    sy4+=BB_DIFFS.length*(bh4+gp4)+10;ctx.fillText('🧪 变容模式',sw/2,sy4);sy4+=20;
    for(var i=0;i<VC_DIFFS.length;i++){var by5=sy4+i*(bh4+gp4);drawBtn2((sw-bw4)/2,by5,bw4,bh4,VC_DIFFS[i].label+'  '+VC_DIFFS[i].hint);btnRects.push({id:'vc_'+i,x:(sw-bw4)/2,y:by5,w:bw4,h:bh4,vi:i});}
    drawBtn2(10,10,60,30,'← 返回');btnRects.push({id:'back',x:10,y:10,w:60,h:30});
  }else if(screen==='editor'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('关卡自制器',sw/2,28);
    // 色板
    var palY=52,ss=26,pg=5,tpw=PALETTE.length*ss+(PALETTE.length-1)*pg+ss+pg;var px=(sw-tpw)/2;
    for(var i=0;i<PALETTE.length;i++){ctx.fillStyle=PALETTE[i];ctx.beginPath();ctx.arc(px+ss/2,palY+ss/2,ss/2,0,Math.PI*2);ctx.fill();if(i===editActiveColor){ctx.strokeStyle='#333';ctx.lineWidth=2.5;ctx.stroke();}btnRects.push({id:'ec_'+i,x:px,y:palY,w:ss,h:ss,ci:i});px+=ss+pg;}
    ctx.fillStyle='#fff';ctx.strokeStyle='#ccc';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px+ss/2,palY+ss/2,ss/2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#999';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('✕',px+ss/2,palY+ss/2+4);btnRects.push({id:'ec_erase',x:px,y:palY,w:ss,h:ss});
    // 管子（简化：横向排列）
    var etY=95,eg=8;for(var ti=0;ti<editTubes.length;ti++){var etX=20+ti*(TW+eg);var sh2=straightH(editCaps[ti]||4),th2=totalH(editCaps[ti]||4);var cx3=etX+TW/2,boTop=etY+RIM_H,sb2=boTop+sh2;
      ctx.save();ctx.beginPath();ctx.moveTo(etX,boTop);ctx.lineTo(etX,sb2);ctx.arc(cx3,sb2,BOTTOM_R,Math.PI,0,true);ctx.lineTo(etX+TW,boTop);ctx.closePath();ctx.fillStyle='rgba(255,255,255,0.8)';ctx.fill();ctx.strokeStyle='#ccc';ctx.lineWidth=1.5;ctx.stroke();
      var rev=[].concat(editTubes[ti]).reverse();for(var ri=0;ri<rev.length;ri++){var li=editTubes[ti].length-1-ri;var cy2=sb2+INNER_R-(ri+1)*LAYER_H;ctx.fillStyle=(li<(editHidden[ti]||0))?'#6b6b6b':(rev[ri]==='transparent'?'#f5f3f0':rev[ri]);ctx.fillRect(etX+WALL,cy2,IW,LAYER_H);if(ri===rev.length-1&&ctx.fillStyle!=='#f5f3f0'){ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(etX+WALL,cy2+2);ctx.lineTo(etX+IW,cy2+2);ctx.stroke();}}
      ctx.restore();ctx.fillStyle='#888';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(editCaps[ti]+'格',etX+TW/2,etY+th2+12);
      // ±按钮
      drawBtn2(etX-2,etY+th2+16,24,20,'-');btnRects.push({id:'ecapm_'+ti,x:etX-2,y:etY+th2+16,w:24,h:20,ti:ti});
      drawBtn2(etX+TW-22,etY+th2+16,24,20,'+');btnRects.push({id:'ecapp_'+ti,x:etX+TW-22,y:etY+th2+16,w:24,h:20,ti:ti});
      // 整个管区域可点击涂色
      btnRects.push({id:'etube_'+ti,x:etX+WALL,y:boTop,W:IW,H:sh2+INNER_R-WALL,ti:ti});
    }
    var eby=etY+totalH(4)+60;drawBtn2(20,eby,60,34,'＋ 管');btnRects.push({id:'eadd',x:20,y:eby,w:60,h:34});drawBtn2(90,eby,60,34,'－ 管');btnRects.push({id:'erm',x:90,y:eby,w:60,h:34});drawBtn2(160,eby,70,34,'💾 保存');btnRects.push({id:'esave',x:160,y:eby,w:70,h:34});drawBtn2(240,eby,60,34,'▶ 试玩');btnRects.push({id:'etest',x:240,y:eby,w:60,h:34});
    drawBtn2(10,6,60,30,'← 返回');btnRects.push({id:'back',x:10,y:6,w:60,h:30});
  }else if(screen==='mylevels'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('我的关卡',sw/2,30);
    var lvs=loadLevels();if(lvs.length===0){ctx.font='15px sans-serif';ctx.fillStyle='#999';ctx.textAlign='center';ctx.fillText('还没有自制关卡',sw/2,sh/2);}else{
      var pageSize=8,start=myLevelsPage*pageSize,end=Math.min(start+pageSize,lvs.length);
      for(var i=start;i<end;i++){var lv=lvs[i];var ly2=70+(i-start)*50;ctx.fillStyle='#fff';ctx.strokeStyle='#ddd';ctx.lineWidth=1;rr(20,ly2,sw-40,42,10);ctx.fill();ctx.stroke();ctx.fillStyle='#333';ctx.font='14px sans-serif';ctx.textAlign='left';ctx.fillText(lv.name||'关卡',30,ly2+18);ctx.fillStyle='#999';ctx.font='11px sans-serif';ctx.fillText((lv.colorCount||0)+'色 · '+(lv.tubes?lv.tubes.length:0)+'管',30,ly2+34);drawBtn2(sw-70,ly2+6,50,28,'▶');btnRects.push({id:'playlv_'+i,x:sw-70,y:ly2+6,w:50,h:28,li:i});}
    }
    drawBtn2(10,6,60,30,'← 返回');btnRects.push({id:'back',x:10,y:6,w:60,h:30});
  }else if(screen==='help'){
    ctx.fillStyle='#3b3b3b';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('📖 游戏说明',sw/2,30);
    var lines=['目标：将相同颜色集中到同一试管','规则：点击选管再点另一根倒水','只能倒空管或同色水上方','每管最多装对应容量的水','底部：UNDO撤销 RESET重来 +TUBE加管 ←返回','提示按钮自动执行一步倒水'];
    ctx.font='14px sans-serif';ctx.textAlign='left';ctx.fillStyle='#555';for(var i=0;i<lines.length;i++)ctx.fillText(lines[i],20,70+i*26);
    drawBtn2(10,6,60,30,'← 返回');btnRects.push({id:'back',x:10,y:6,w:60,h:30});
  }
}

// ── 编辑器逻辑 ──
function initEditor(){editTubes=[];for(var i=0;i<3;i++)editTubes.push(['transparent','transparent','transparent','transparent']);editCaps=[4,4,4];editHidden=[0,0,0];editActiveColor=0;editBlindMode=false;screen='editor';layout();}
function changeCap(ti,d){var nc=editCaps[ti]+d;if(nc<2||nc>8)return;var old=editTubes[ti];var nw=[];for(var i=0;i<nc;i++)nw.push('transparent');for(var i=0;i<Math.min(old.length,nc);i++)nw[i]=old[i];editTubes[ti]=nw;editCaps[ti]=nc;if(editHidden[ti]>=nc)editHidden[ti]=Math.max(0,nc-1);}
function addEditTube(){if(editTubes.length>=12)return;editTubes.push(['transparent','transparent','transparent','transparent']);editCaps.push(4);editHidden.push(0);}
function rmEditTube(){if(editTubes.length<=2)return;editTubes.pop();editCaps.pop();editHidden.pop();}
function saveLevel(){var cs=new Set();var he=false;editTubes.forEach(function(t){var f=0;t.forEach(function(c){if(c!=='transparent')cs.add(c);else f++;});if(f>0)he=true;});if(cs.size<2){wx.showModal({title:'',content:'请至少使用2种颜色！',showCancel:false});return;}if(!he){wx.showModal({title:'',content:'请添加至少一根空管！',showCancel:false});return;}var data=editTubes.map(function(t){return[].concat(t);});var caps=editCaps,hid=editHidden;
  function doSave(){var lvs=loadLevels();var id=Date.now().toString(36);lvs.push({id:id,name:'自制关卡',tubes:data,caps:caps,hidden:hid,colorCount:cs.size,createdAt:Date.now()});saveLevels(lvs);wx.showModal({title:'',content:'已保存！',showCancel:false});}
  if(checkSolvable(data)){doSave();}else{wx.showModal({title:'',content:'该关卡可能无解，仍要保存？',success:function(r){if(r.confirm)doSave();}});}
}
function testLevel(){var cs=new Set();var he=false;editTubes.forEach(function(t){var f=0;t.forEach(function(c){if(c!=='transparent')cs.add(c);else f++;});if(f>0)he=true;});if(cs.size<2){wx.showModal({title:'',content:'请至少使用2种颜色！',showCancel:false});return;}if(!he){wx.showModal({title:'',content:'请添加至少一根空管！',showCancel:false});return;}var data=editTubes.map(function(t){return[].concat(t);});var caps=editCaps,hid=editHidden;
  function doTest(){playMode='custom';playLevelId=null;playBack='editor';resetFromData(data,hid,caps);}
  if(checkSolvable(data)){doTest();}else{wx.showModal({title:'',content:'该关卡可能无解，仍要试玩？',success:function(r){if(r.confirm)doTest();}});}
}

// ── 触控（无拖拽，纯点击） ──
function getPos(e){var t=e.touches?e.touches[0]:e;return{x:t.clientX||t.x||0,y:t.clientY||t.y||0};}

function hitBtn(p){for(var i=btnRects.length-1;i>=0;i--){var b=btnRects[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return b;}return null;}

canvas.addEventListener('touchstart',function(e){
  var p=getPos(e),b=hitBtn(p);
  if(b){handleBtn(b,p);return;}
  if(screen==='game')handleGameTap(p);
});

function handleBtn(b,p){
  if(!b.id)return;
  if(b.id==='back'){screen='menu';layout();return;}
  if(b.id==='challenge'){screen='challenge';layout();return;}
  if(b.id==='special'){screen='special';layout();return;}
  if(b.id==='editor'){initEditor();return;}
  if(b.id==='mylevels'){screen='mylevels';layout();return;}
  if(b.id==='help'){screen='help';layout();return;}
  if(b.id==='undo'){undo();return;}
  if(b.id==='hint'){triggerHint();return;}
  if(b.id==='reset'){restartLevel();return;}
  if(b.id==='addtube'){addTubeDuringPlay();return;}
  if(b.id&&b.id.indexOf('diff_')===0){var d=DIFFS[b.di];if(d){playMode='challenge';playLevelId=null;var data2=genLevelSmart(d.n,d.e,d.sh);resetFromData(data2);}return;}
  if(b.id&&b.id.indexOf('bb_')===0){var d2=BB_DIFFS[b.bi];if(d2){var bm=genBlindbox(d2.n,d2.mxH,d2.tr);playMode='blindbox';resetFromData(bm.data,bm.mask);}return;}
  if(b.id&&b.id.indexOf('vc_')===0){var d3=VC_DIFFS[b.vi];if(d3){var vg=genVaricapLevel(d3.n);playMode='varicap';resetFromData(vg.tubes,null,vg.caps);}return;}
  if(b.id&&b.id.indexOf('ec_')===0){if(b.id==='ec_erase'){editActiveColor=-1;return;}editActiveColor=b.ci;return;}
  if(b.id&&b.id.indexOf('etube_')===0){var ti=b.ti;var relY=p.y-(slots.length>0?0:0);var cap=editCaps[ti]||4;var sh2=straightH(cap);var boTop=95+RIM_H;var sb2=boTop+sh2;var innDp=sb2+INNER_R;var clkY=p.y;var li=-1;for(var ri=0;ri<editTubes[ti].length;ri++){var cy2=innDp-(ri+1)*LAYER_H;if(clkY>=cy2&&clkY<=cy2+LAYER_H){li=editTubes[ti].length-1-ri;break;}}if(li>=0){var color=editActiveColor===-1?'transparent':PALETTE[editActiveColor]||PALETTE[0];editTubes[ti][li]=color;}return;}
  if(b.id&&b.id.indexOf('ecapm_')===0){changeCap(b.ti,-1);return;}
  if(b.id&&b.id.indexOf('ecapp_')===0){changeCap(b.ti,1);return;}
  if(b.id==='eadd'){addEditTube();return;}
  if(b.id==='erm'){rmEditTube();return;}
  if(b.id==='esave'){saveLevel();return;}
  if(b.id==='etest'){testLevel();return;}
  if(b.id&&b.id.indexOf('playlv_')===0){var lvs2=loadLevels();var lv=lvs2[b.li];if(lv){playMode='custom';playLevelId=lv.id;playBack='mylevels';resetFromData(lv.tubes.map(function(t){return[].concat(t);}),lv.hidden||null,lv.caps||null);screen='game';}return;}
}

function handleGameTap(p){
  for(var i=0;i<slots.length;i++){var s=slots[i],cap=tubeCaps[i]||4;if(p.x>=s.x&&p.x<=s.x+TW&&p.y>=s.y&&p.y<=s.y+totalH(cap)){
    if(won)return;if(i>=tubes.length||isAnimating(i))return;
    if(selected===-1){if(vTopIdx(tubes[i],hiddenMask[i])===-1)return;if(isCapped(i))return;selected=i;}
    else if(selected===i){selected=-1;}
    else{var from=selected,to=i;selected=-1;if(isAnimating(to)||isCapped(to))return;attempt(from,to);}
    return;}}
}

// ── 主循环 ──
function gameLoop(){if(screen==='game'){var n=now();render(n);}else{ctx.clearRect(0,0,sw,sh);drawBg();drawUI();}}
setInterval(gameLoop,1000/60);
layout();
