/* Local, standalone mobile review record. No account or remote submission. */
(function () {
  'use strict';
  const M = window.REVIEW_MODEL, E = window.ScoreEngine;
  const KEY = 'scu-cs-review-v1';
  const root = document.getElementById('screen'), nav = document.getElementById('nav');
  const cats = M.categories, catById = Object.fromEntries(cats.map(c => [c.id,c]));
  const parents = {};
  Object.values(M.nodes).forEach(n => (n.nav || []).forEach(id => parents[id] = n.id));
  const blank = () => ({version:1,records:{},grades:{},professional:''});
  let state = blank(), loadError = '', toastTimer;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.version === 1 && saved.records && typeof saved.records === 'object' && !Array.isArray(saved.records)) {
      state.records = Object.fromEntries(Object.entries(saved.records).filter(([id,r]) => M.leaves.includes(id) && r && typeof r.data === 'object' && r.data !== null));
      state.grades = saved.grades && typeof saved.grades === 'object' && !Array.isArray(saved.grades) ? saved.grades : {};
      state.professional = saved.professional ?? '';
    }
  } catch (_) { loadError = '当前浏览器未能读取本机记录。请使用普通浏览器打开；填写后会再次尝试保存。'; }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const icon = (type, cls='') => {
    const paths = {
      arrow:'<path d="m9 5 7 7-7 7"/>', back:'<path d="m15 5-7 7 7 7"/>',
      check:'<path d="m5 12 4 4L19 6"/>', layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
      book:'<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Z"/><path d="M13 7a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2"/>',
      edit:'<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14l-1 7Z"/>', lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
      chart:'<path d="M4 20h17M7 16v-5m5 5V4m5 12V8"/>', award:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
      leaf:'<path d="M20 3C10 2 3 6 4 14c1 7 14 7 16-11Z"/><path d="M4 21 15 10"/>', dot:'<circle cx="12" cy="12" r="6"/>'
    };
    return '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[type]||paths.layers)+'</svg>';
  };
  function notify(message, error=false) {
    const el=document.getElementById('toast');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,error?4800:2400);
  }
  function persist(next, quiet=false) {
    try { localStorage.setItem(KEY, JSON.stringify(next));state=next;loadError='';return true; }
    catch (_) { if(!quiet)notify('未能保存到本机，请检查浏览器存储权限后重试',true);return false; }
  }
  function route() {
    const parts=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
    if(!parts.length || parts[0]==='home')return {kind:'home'};
    if(parts[0]==='summary'){
      if(parts[1]==='grade'&&catById[parts[2]])return {kind:'grade',id:parts[2]};
      if(parts[1]==='professional')return {kind:'professional'};
      if(parts[1]==='item-143')return {kind:'detail',id:'item-143',cat:null};
      return {kind:'summary'};
    }
    const cat=cats.find(c=>c.key===parts[0]);
    if(!cat)return {kind:'home'};
    if(!parts[1] || parts[1]===cat.id)return {kind:'category',id:cat.id,cat};
    const n=M.nodes[parts[1]];
    if(!n || n.category!==cat.id || !n.input&&!n.nav)return {kind:'category',id:cat.id,cat};
    return {kind:n.nav.length?'group':'detail',id:n.id,cat};
  }
  function hrefFor(id) {const n=M.nodes[id];return id==='item-143'?'#summary/item-143':'#'+catById[n.category].key+(id===n.category?'':'/'+id);}
  function go(hash) {if(location.hash===hash)render();else location.hash=hash;}
  function backHash(r) {
    if(r.kind==='grade'||r.kind==='professional'||r.id==='item-143')return '#summary';
    if(r.kind==='detail'||r.kind==='group')return hrefFor(parents[r.id]||r.cat.id);
    return '#home';
  }
  function topbar(r,brand=false) {
    return brand?'<header class="topbar"><div class="brand"><span class="brand-symbol">CS</span><div class="brand-text">综测记录</div></div><span class="edition">2025 年版</span></header>':
      '<header class="topbar"><button class="back" data-go="'+backHash(r)+'" aria-label="返回上一级">'+icon('back')+'返回</button><span class="top-location">'+esc(r.cat?r.cat.name:r.kind==='grade'?'综合评价 / 核定分':'综合评价')+'</span></header>';
  }
  function statusHTML(a) {
    const text=a.state==='done'?'已提交':a.state==='partial'?'已交 '+a.submitted+'/'+a.total+' 项':a.state==='draft'?'待提交':'未提交';
    return '<span class="status '+a.state+'">'+text+'</span>';
  }
  function capText(n) {
    if(n.id==='item-5')return '上限待确认';
    if(n.id==='item-10')return '上限35分 · 待确认';
    if(['item-52','item-101','item-118','item-132','item-142','item-143'].includes(n.id))return '原则上限10分';
    return n.cap===null?'满分100分':'最高 '+fmt(n.cap)+' 分';
  }
  function row(id) {
    const n=M.nodes[id],a=E.aggregate(id,M,state.records);
    return '<button class="row '+a.state+'" data-go="'+hrefFor(id)+'" aria-label="'+esc(n.label)+'，'+(a.state==='done'?'已提交':'未全部提交')+'，'+capText(n)+'"><span class="row-icon">'+icon(a.state==='done'?'check':n.nav.length?'layers':'edit')+'</span><span class="row-main"><span class="row-title">'+esc(n.label)+'</span><span class="row-sub">'+statusHTML(a)+'</span></span><span class="row-number"><strong class="'+(!a.submitted?'missing':'')+'">'+(a.submitted?fmt(a.score):'未填')+'</strong><small>'+capText(n)+'</small></span>'+icon('arrow','chevron')+'</button>';
  }
  function allProgress(){return cats.map(c=>E.aggregate(c.id,M,state.records)).reduce((a,b)=>({submitted:a.submitted+b.submitted,total:a.total+b.total}),{submitted:0,total:0});}
  function home() {
    const p=allProgress();
    return topbar({},true)+'<section class="hero hero-home"><h1>每一份成长<br>都有迹可循。</h1><p>欢迎进入 SCU CS 综测记录。</p><button class="primary" data-go="#de">开始填写 '+icon('arrow')+'</button><div class="hero-bottom"><div><span class="hero-number">'+p.submitted+'<small>/ '+p.total+' 项</small></span><div class="hero-caption">已标记提交</div></div></div></section><div class="section-head"><h2>五育评价</h2></div><div class="home-grid">'+cats.map(c=>{
      const a=E.aggregate(c.id,M,state.records);
      return '<button class="home-card '+a.state+'" data-go="#'+c.key+'"><div><div class="home-card-top"><span class="letter">'+c.short+'</span>'+statusHTML(a)+'</div><h2>'+c.name+'</h2><p>'+a.submitted+' / '+a.total+' 项已提交</p></div></button>';
    }).join('')+'</div><p class="home-privacy">'+icon('lock')+'记录保存在当前浏览器，不上传学校系统。</p>';
  }
  function category(r) {
    const c=r.cat,n=M.nodes[r.id],a=E.aggregate(r.id,M,state.records),t=E.total(M,state.records,state.grades,state.professional);
    const grade=E.number(t.effective[r.id]);
    return topbar(r,true)+'<section class="hero"><h1>'+c.name+'</h1><div class="hero-bottom"><div><div class="hero-number">'+(grade===null?'—':fmt(grade))+'<small>/ 100</small></div><div class="hero-caption">'+(grade===null?'总评核定分待填写':'总评核定分')+'</div></div><div class="hero-side">已提交记录<strong>'+a.submitted+' / '+a.total+' 项</strong></div></div></section><div class="section-head"><h2>评价模块</h2><span>已得分 / 最高分</span></div><div class="cards">'+n.nav.map(row).join('')+'</div>'+((r.id==='item-56'&&t.zeroIntellect)||(r.id==='item-133'&&t.zeroLabor)?'<div class="notice">已记录触发本育总体计0分的情形。下级明细保留，综合页按0分计入。</div>':'')+'';
  }
  function breadcrumb(n){return n.path.replace(/^综合素质评价 → 素质评价 → /,'').replace(/^综合素质评价 → /,'');}
  function group(r) {
    const n=M.nodes[r.id],a=E.aggregate(r.id,M,state.records);
    return topbar(r)+'<h1 class="intro-title">'+esc(n.label)+'</h1><div class="breadcrumb">'+esc(breadcrumb(n))+'</div><div class="title-meta"><span class="pill">'+esc(capText(n))+'</span>'+statusHTML(a)+'</div>'+(n.warning?'<div class="notice">'+esc(n.warning)+'</div>':'')+'<div class="cards">'+n.nav.map(row).join('')+'</div>'+((n.cap!==null&&a.raw>n.cap)?'<div class="notice">明细原始合计 '+fmt(a.raw)+' 分，按本层上限计入 '+fmt(a.score)+' 分。明细记录保留。</div>':'')+(n.id==='item-6'?'<p class="muted-note">民主评议由辅导员评价30%、班级评价50%、学生自评20%构成；各事项请填写按此口径确认的分数。</p>':'');
  }
  function table(headers,rows){return '<div class="score-table-wrap"><table class="score-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function tableFor(id){
    if(id==='item-67')return table(['级别 / 奖项','前5名','6—10名','其余'],[['国赛金奖',30,15,10],['国赛银奖',25,12,8],['国赛铜奖',20,10,6],['省赛金奖',20,10,'未列'],['省赛银奖',18,9,'未列'],['省赛铜奖',16,8,'未列']]);
    if(id==='item-76')return table(['赛事 / 级别','一等及以上','二等','三等'],[['学校一级 / 国家',25,20,15],['学校一级 / 省部',8,6,4],['学院专业 / 国家',15,12,9],['学院专业 / 省部',4,3,2],['学院专业 / 校院',3,2,1]]);
    if(id==='item-87')return table(['论文类别','基准分'],[['CCF-A（中英文）','30 / 篇'],['CCF-B（英文）','24 / 篇'],['CCF-C（英文）','15 / 篇'],['SCI、CCF-B/C中文','10 / 篇'],['北大核心、EI检索','6 / 篇']]);
    if(id==='item-94')return table(['大创项目','优秀结题','合格结题'],[['国家级',15,10],['省级',12,8],['校级',8,5],['院级',4,2]]);
    if(['item-111','item-126'].includes(id))return table(['比赛级别','个人一 / 二 / 三等','团体一 / 二 / 三等'],[['全国','10 / 10 / 10','5 / 5 / 5'],['省级','9 / 9 / 9','4 / 4 / 4'],['校级','6 / 4 / 2','3 / 2 / 1'],['院级','4 / 2 / 1','2 / 1 / 0.5']]);
    return '';
  }
  function deepDetails(id,depth=0){
    return (M.nodes[id].details||[]).map(cid=>{const n=M.nodes[cid];return '<div class="detail-block"><'+(depth?'h4':'h3')+'>'+esc(n.title)+'</'+(depth?'h4':'h3')+'><div class="detail-cap">'+esc(n.sourceCap)+'</div>'+(n.rule?'<div class="rule-copy">'+esc(n.rule)+'</div>':'')+deepDetails(cid,depth+1)+'</div>';}).join('');
  }
  function rulePanel(n){const extra=deepDetails(n.id);return '<section class="rule-panel"><h2 class="panel-heading">'+icon('book')+'计分细则</h2><div class="rule-copy">'+esc(n.rule||'按对应档次填写，并遵守全部上级累计上限。')+'</div>'+tableFor(n.id)+'<details><summary>完整说明</summary>'+extra+'<p class="rule-location">'+esc(n.location)+'</p></details></section>';}
  function numericField(name,label,value,options={}){
    return '<label class="field"><span class="field-label">'+esc(label)+'</span><input name="'+name+'" aria-label="'+esc(label)+'" type="number" inputmode="'+(options.integer?'numeric':'decimal')+'" min="0" '+(options.max!==undefined?'max="'+options.max+'" ':'')+'step="'+(options.integer?'1':'any')+'" value="'+esc(value)+'" placeholder="'+esc(options.placeholder||'请输入')+'" autocomplete="off"></label>';
  }
  function detail(r){
    const n=M.nodes[r.id],rec=state.records[r.id],data=rec?rec.data:{},a=E.aggregate(r.id,M,state.records),c=n.input;
    let field='';
    if(c.type==='choice')field='<label class="field"><span class="field-label">'+esc(c.label)+'</span><select name="value" aria-label="'+esc(c.label)+'"><option value="">请选择</option>'+c.options.map(([v,label])=>'<option value="'+esc(v)+'" '+(String(data.value)===v?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
    else field=numericField('value',c.label,data.value??'',{integer:['count','csp'].includes(c.type),max:c.type==='csp'?500:['score','dorm'].includes(c.type)?c.cap:undefined});
    if(c.type==='dorm')field+='<div class="form-grid">'+numericField('inspections','学年检查次数',data.inspections??'',{integer:true})+numericField('failures','个人不合格次数',data.failures??'',{integer:true})+'</div>';
    const reward=['item-101','item-118','item-132','item-142','item-53','item-54','item-55'].includes(n.id)?'<div class="notice">奖励加分须经学院认定；原文未为各情形单列固定分值，原则上共享本育10%奖励限额。</div>':['item-7','item-8','item-9'].includes(n.id)?'<p class="muted-note">定性评分的民主评议比例：辅导员30%、班级50%、学生自评20%。请填写按该口径确认的本项分数。</p>':'';
    return topbar(r)+'<h1 class="intro-title">'+esc(n.label)+'</h1><div class="breadcrumb">'+esc(breadcrumb(n))+'</div><div class="title-meta"><span class="pill">'+esc(capText(n))+'</span><span id="detail-status">'+statusHTML(a)+'</span></div>'+(n.warning?'<div class="notice">'+esc(n.warning)+'</div>':'')+reward+rulePanel(n)+'<form class="form-panel '+(a.state==='done'?'submitted':'')+'" id="record-form" data-id="'+r.id+'" novalidate><div class="form-heading"><h2 class="panel-heading">'+icon('edit')+'我的记录</h2></div>'+field+'<label class="field"><span class="field-label">活动记录 <span class="scroll-top-note">选填</span></span><textarea name="note" aria-label="活动记录（选填）" rows="2" maxlength="1000" placeholder="如：活动名称、时间、奖项或计分依据">'+esc(data.note||'')+'</textarea></label><div class="preview"><span>本项得分</span><strong id="score-preview">—<small>分</small></strong></div><p class="form-error" id="form-error" aria-live="polite"></p><div class="form-actions"><button class="primary" type="submit" id="submit-record">'+icon(a.state==='done'?'check':'edit')+(a.state==='done'?'已提交 · 保存修改':'保存并标记已提交')+'</button><button class="secondary" type="button" data-action="withdraw" '+(a.state==='done'?'':'hidden')+'>改为未提交</button></div></form>';
  }
  function summary(){
    const t=E.total(M,state.records,state.grades,state.professional),p=allProgress(),special=E.aggregate('item-143',M,state.records);
    return topbar({},true)+'<section class="hero"><h1>综合评价</h1><div class="hero-bottom"><div><div class="hero-number">'+fmt(t.overall)+'<small>/ 100</small></div><div class="hero-caption">'+(t.overall===null?'待填写专业成绩及五育核定分':'按已填写核定分计算')+'</div></div><div class="hero-side">五育已提交<strong>'+p.submitted+' / '+p.total+' 项</strong></div></div></section><div class="section-head"><h2>综合分组成</h2></div><section class="summary-panel"><div class="summary-line"><span>专业学习评价 <small>80%</small></span><button class="grade-button" data-go="#summary/professional">'+(E.number(state.professional)===null?'填写成绩 ›':fmt(state.professional)+' / 100 ›')+'</button></div><div class="summary-line"><span>素质评价 <small>20%</small></span><strong>'+fmt(t.quality)+'<small>/ 100</small></strong></div><p class="formula">综合评价 = 专业学习 × 80% + 素质评价 × 20%</p></section><div class="section-head"><h2>五育总评核定分</h2></div><div class="cards">'+cats.map(c=>{
      const a=E.aggregate(c.id,M,state.records),g=E.number(t.effective[c.id]),forced=(c.id==='item-56'&&t.zeroIntellect)||(c.id==='item-133'&&t.zeroLabor);
      return '<button class="row '+(g!==null?'done':'')+'" data-go="#summary/grade/'+c.id+'"><span class="row-icon">'+(g!==null?icon('check'):'<span>'+c.short+'</span>')+'</span><span class="row-main"><span class="row-title">'+c.name+'</span><span class="row-sub">素质占比 '+Math.round(c.weight*100)+'% · '+a.submitted+'/'+a.total+' 项已交</span>'+(forced?'<p class="grade-hint">已触发总体计0分规则</p>':'')+'</span><span class="row-number"><strong class="'+(g===null?'missing':'')+'">'+(g===null?'待填写':fmt(g))+'</strong><small>最高100分</small></span>'+icon('arrow','chevron')+'</button>';
    }).join('')+'</div><p class="muted-note">各项原始分自动汇总，总评请填写核定分。</p><div class="section-head"><h2>学校特别奖励</h2></div>'+row('item-143')+'<p class="muted-note">特别奖励已记录 '+fmt(special.score)+' 分。原文未明确其加入位置，暂不叠加到上述综合分。</p>';
  }
  function gradePage(r){
    const prof=r.kind==='professional',c=prof?null:catById[r.id],t=E.total(M,state.records,state.grades,state.professional);
    const forced=!prof&&((r.id==='item-56'&&t.zeroIntellect)||(r.id==='item-133'&&t.zeroLabor));
    const value=prof?state.professional:forced?0:state.grades[r.id]??'';
    const n=prof?null:M.nodes[r.id];
    return topbar(r)+'<h1 class="intro-title">'+(prof?'专业学习评价':c.name+'核定分')+'</h1><div class="breadcrumb">综合评价 → '+(prof?'专业学习评价':c.name+' → 核定分')+'</div><section class="rule-panel"><h2 class="panel-heading">'+icon('book')+'填写说明</h2><div class="rule-copy">'+(prof?'填写参评学年必修课按学分加权的平均成绩，满分100分。以第一次考试成绩为准。\n专业成绩 = Σ（课程成绩 × 课程学分）÷ Σ课程学分。':'各模块已提交原始分见下方。原文对分项百分制折算的口径不清，请填写学院核定后的本育总评成绩（满分100），用于综合分计算。')+'</div></section>'+(prof?'':'<section class="summary-panel">'+n.nav.map(id=>{const a=E.aggregate(id,M,state.records);return '<div class="score-item"><span>'+esc(M.nodes[id].label)+'<small>（原始分）</small></span><b>'+fmt(a.score)+'</b></div>';}).join('')+'</section>')+(forced?'<div class="notice">已提交的明细触发本育总体计0分规则，此处固定按0分计。若实际情况有误，请返回对应明细更正。</div>':'')+'<form class="form-panel" id="grade-form" data-id="'+(prof?'professional':r.id)+'" novalidate>'+numericField('value',prof?'必修课加权平均成绩':'本育总评核定分',value,{max:100})+'<p class="form-error" id="grade-error" aria-live="polite"></p><button class="primary" type="submit">保存'+(prof?'成绩':'核定分')+'</button></form>';
  }
  function renderNav(r){
    const active=r.cat?r.cat.key:['summary','grade','professional'].includes(r.kind)||r.id==='item-143'?'summary':'';
    nav.innerHTML=cats.map(c=>{const a=E.aggregate(c.id,M,state.records);return '<button data-go="#'+c.key+'" class="'+(active===c.key?'active':'')+'" '+(active===c.key?'aria-current="page"':'')+' aria-label="'+c.name+'"><span class="nav-letter">'+c.short+'</span><span>'+c.name+'</span>'+(a.submitted?'<i class="nav-dot" aria-hidden="true"></i>':'')+'</button>';}).join('')+'<button data-go="#summary" class="'+(active==='summary'?'active':'')+'" '+(active==='summary'?'aria-current="page"':'')+'>'+icon('chart')+'<span>综合评价</span></button>';
  }
  function render(){
    const r=route();
    root.innerHTML='<div class="page '+(['group','detail','grade','professional'].includes(r.kind)?'detail':'')+'">'+(r.kind==='home'?home():r.kind==='category'?category(r):r.kind==='group'?group(r):r.kind==='detail'?detail(r):r.kind==='summary'?summary():gradePage(r))+(loadError?'<div class="notice">'+esc(loadError)+'</div>':'')+'</div>';
    renderNav(r);document.title=(r.id&&M.nodes[r.id]?M.nodes[r.id].label+' · ':'')+'SCU CS 综测记录';
    window.scrollTo(0,0);
    if(r.kind==='detail')preview(false);
    const gradeForm=document.getElementById('grade-form');
    if(gradeForm&&r.kind==='grade'){
      const t=E.total(M,state.records,state.grades,state.professional);
      if((r.id==='item-56'&&t.zeroIntellect)||(r.id==='item-133'&&t.zeroLabor))gradeForm.elements.value.disabled=true;
    }
  }
  function formData(form){return Object.fromEntries(new FormData(form).entries());}
  function preview(showError){
    const form=document.getElementById('record-form');if(!form)return null;
    const n=M.nodes[form.dataset.id],result=E.evaluate(n.input,formData(form));
    document.getElementById('score-preview').innerHTML=(result.valid?fmt(result.score):'—')+'<small>分</small>';
    document.getElementById('form-error').textContent=result.valid?(result.zeroLabor?'已触发学年劳动教育总体计0分规则':''):showError?result.reason:'';
    return result;
  }
  root.addEventListener('input',event=>{
    const form=event.target.closest('#record-form');if(!form)return;
    const id=form.dataset.id,next={...state,records:{...state.records,[id]:{data:formData(form),submitted:false}}};
    const saved=persist(next,true);form.classList.remove('submitted');
    document.getElementById('detail-status').innerHTML='<span class="status draft">'+(saved?'待提交':'尚未保存')+'</span>';
    document.getElementById('submit-record').innerHTML=icon('edit')+'保存并标记已提交';
    form.querySelector('[data-action="withdraw"]').hidden=true;preview(true);renderNav(route());
    if(!saved)document.getElementById('form-error').textContent='未能保存到本机；点击提交可重试。';
  });
  root.addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    if(form.id==='record-form'){
      const result=preview(true);if(!result.valid)return;
      const id=form.dataset.id,next={...state,records:{...state.records,[id]:{data:formData(form),submitted:true}}};
      if(!persist(next))return;
      form.classList.add('submitted');
      document.getElementById('detail-status').innerHTML='<span class="status done">已提交</span>';
      document.getElementById('submit-record').innerHTML=icon('check')+'已提交 · 保存修改';
      form.querySelector('[data-action="withdraw"]').hidden=false;renderNav(route());notify('已保存，已标记提交');
    } else if(form.id==='grade-form'){
      const value=form.elements.value.value,n=E.number(value),error=document.getElementById('grade-error');
      if(n===null||n>100){error.textContent='请填写0至100之间的有效分数';return;}
      const next=form.dataset.id==='professional'?{...state,professional:value}:{...state,grades:{...state.grades,[form.dataset.id]:value}};
      if(persist(next)){notify('已保存');go('#summary');}
    }
  });
  document.addEventListener('click',event=>{
    const goButton=event.target.closest('[data-go]');if(goButton){go(goButton.dataset.go);return;}
    const action=event.target.closest('[data-action]');if(action&&action.dataset.action==='withdraw'){
      const form=document.getElementById('record-form'),id=form.dataset.id,rec=state.records[id];
      if(!rec)return;
      if(persist({...state,records:{...state.records,[id]:{...rec,submitted:false}}})){render();notify('已改为未提交，填写内容保留');}
    }
  });
  window.addEventListener('hashchange',render);
  window.addEventListener('storage',event=>{if(event.key===KEY)notify('记录在另一页面发生变化，重新打开本页可读取最新内容');});
  render();
})();
