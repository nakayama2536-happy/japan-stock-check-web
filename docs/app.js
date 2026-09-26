const arrows={STRONG_UP:"↑↑",UP:"↑",NEUTRAL:"→",DOWN:"↓",STRONG_DOWN:"↓↓"};
const confidenceLabels={LOW:"低",MEDIUM:"中",HIGH:"高",NOT_AVAILABLE:"—"};
const actionLabels={WAIT:"待機",HOLD:"保有継続",BUY:"新規買い",ADD:"追加買い",REDUCE:"縮小",SELL:"売却"};
const signalLabels={
  REVERSAL_WATCH:"反転監視",
  DC_WATCH:"デッドクロス監視",
  NEUTRAL:"中立",
  ADD_WAIT:"追加待ち",
  SELL_WATCH:"売却監視",
  EVENT_REVIEW:"イベント確認"
};
const qualityLabels={PROVISIONAL:"暫定",HOLD:"要確認",FINAL:"確認済み",CONFIRMED:"確認済み",ERROR:"取得失敗",STALE:"更新遅延"};
const sourceReasonLabels={
  SHADOW_SOURCE_MATCH:"独立データ照合一致",
  HIGH_MISMATCH:"高値データ差異あり",
  LOW_MISMATCH:"安値データ差異あり",
  OPEN_MISMATCH:"始値データ差異あり",
  CLOSE_MISMATCH:"終値データ差異あり",
  VOLUME_MISMATCH:"出来高データ差異あり",
  INDEPENDENT_SOURCE_UNAVAILABLE:"独立データ取得不可",
  PRIMARY_FETCH_FAILED:"Primaryデータ取得失敗",
  HISTORY_TOO_SHORT:"テクニカル履歴不足",
  DATE_MISMATCH:"基準日不一致",
  FIELD_MISMATCH:"データ項目差異あり"
};
const runStatusLabels={
  SHADOW_COMMITTED:"検証結果保存済み",
  SHADOW_PARTIAL:"検証結果保存済み・要確認",
  RUN_FAILED:"実行失敗",
  NO_NEW_TARGET:"休場日",
  RUN_UNCONFIRMED:"市場日未確認",
  NOT_RUN:"未実行"
};

const pct=v=>v==null?"—":(v*100).toFixed(1)+"%";
const pctPoint=v=>v==null?"—":(Number(v)>0?"+":"")+Number(v).toFixed(2)+"%";
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const fmtDate=v=>v?String(v).replace(/-/g,"/"):"—";
const fmtDateTime=v=>{
  if(!v)return "—";
  try{return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}
  catch(_){return String(v);}
};
const metric=(label,value,target,ok)=>"<div class=\"metric "+(ok?"ok":"")+"\"><span>"+esc(label)+"</span><b>"+esc(value)+"</b><small>目標 "+esc(target)+"</small></div>";

const chart28Svg=history=>{
  const xs=(history||[]).filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(String(p.date||""))&&Number.isFinite(Number(p.value))).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(xs.length<2)return '<div class="history-wait">28日履歴を準備中です。</div>';
  const day=86400000,w=640,h=150,pl=28,pr=18,pt=15,pb=24;
  const ms=d=>Date.parse(String(d)+"T00:00:00Z");
  const end=ms(xs[xs.length-1].date),start=end-27*day;
  const vis=xs.filter(p=>ms(p.date)>=start&&ms(p.date)<=end);
  const vals=vis.map(p=>Number(p.value));
  let lo=Math.min(...vals),hi=Math.max(...vals);if(lo===hi){lo-=1;hi+=1}
  const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
  const x=d=>pl+(ms(d)-start)*(w-pl-pr)/(27*day),y=v=>pt+(hi-Number(v))*(h-pt-pb)/(hi-lo);
  const grid=[.25,.5,.75].map(t=>{const yy=(pt+t*(h-pt-pb)).toFixed(1);return '<line class="chart-grid" x1="'+pl+'" y1="'+yy+'" x2="'+(w-pr)+'" y2="'+yy+'"/>';}).join("");
  const sd=new Date(start);let sunday=start+((7-sd.getUTCDay())%7)*day,weeks="";
  for(;sunday<=end;sunday+=7*day){const xx=(pl+(sunday-start)*(w-pl-pr)/(27*day)).toFixed(1),d=new Date(sunday),lab=(d.getUTCMonth()+1)+"/"+d.getUTCDate();weeks+='<line class="chart-week" x1="'+xx+'" y1="'+pt+'" x2="'+xx+'" y2="'+(h-pb)+'"/><text x="'+xx+'" y="'+(h-5)+'" text-anchor="middle">'+lab+'</text>';}
  let path="";vis.forEach((p,i)=>{path+=(i?" L ":"M ")+x(p.date).toFixed(1)+","+y(p.value).toFixed(1);});
  return '<svg class="market-chart" viewBox="0 0 '+w+' '+h+'" role="img">'+grid+weeks+'<path class="chart-line" d="'+path+'"/></svg>';
};

const num=(v,d=2)=>v==null?"—":Number(v).toLocaleString("ja-JP",{minimumFractionDigits:d,maximumFractionDigits:d});
const ratio=v=>v==null?"—":Number(v).toFixed(2)+"倍";
const technicalLabels={
  BULLISH:"強気",IMPROVING:"改善",BEARISH:"弱気",WEAKENING:"鈍化",NEUTRAL:"中立",
  GC_NEW:"GC発生",GC_ACTIVE:"GC継続",DC_NEW:"DC発生",DC_ACTIVE:"DC継続",NONE:"なし",
  UPTREND:"上昇構造",DOWNTREND:"下降構造",HIGHER_LOW:"安値切上げ",LOWER_HIGH:"高値切下げ",RANGE:"レンジ",
  UP:"上向き",DOWN:"下向き",NOT_AVAILABLE:"判定不能"
};


const stateLabels={
  PASS:"正常",FAIL:"要確認",PENDING:"確認中",FRESH:"最新",STALE:"更新待ち",
  ELIGIBLE:"判断可能",NOT_ELIGIBLE:"判断不可",BLOCKED:"保留",
  CURRENT:"最新",CONFIRMED:"確認済み",MISSING:"未取得",DECISION:"判断可能"
};
const directionLabels={STRONG_UP:"強い上向き",UP:"上向き",NEUTRAL:"中立",DOWN:"下向き",STRONG_DOWN:"強い下向き"};
const directionClass=v=>({STRONG_UP:"dir-up-strong",UP:"dir-up",NEUTRAL:"dir-neutral",DOWN:"dir-down",STRONG_DOWN:"dir-down-strong"}[v]||"dir-neutral");
const sourceDisplayName=v=>({
  YFINANCE_REFERENCE:"Yahoo Finance（参考）",
  KABUTAN:"株探",
  MONEX_SCOUTER:"マネックス",
  INVESTING:"Investing.com"
}[v]||v||"—");
const stateJa=v=>stateLabels[String(v||"").toUpperCase()]||v||"—";
const checkStateJa=v=>({PASS:"一致",PENDING:"確認中",FAIL:"要確認"}[v]||v||"—");
const actionJa=v=>actionLabels[String(v||"WAIT").toUpperCase()]||v||"—";
const WORKFLOW_URL="https://github.com/nakayama2536-happy/japan-stock-check/actions/workflows/update-japan.yml";
const QUALITY_WORKFLOW_URL="https://github.com/nakayama2536-happy/japan-stock-check/actions/workflows/diagnose-quality.yml";
let currentSnapshot=null,currentSnapshotKey="",pollTimer=null,lastUiCheckAt=null;

function toast(message,ms=3500){
  let el=document.getElementById("app-toast");
  if(!el){el=document.createElement("div");el.id="app-toast";el.className="app-toast";document.body.appendChild(el);}
  el.textContent=message;el.classList.add("show");
  clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),ms);
}
function snapshotKey(d){return [d?.latest_decision_run_id,d?.latest_decision_as_of,d?.updated_at,d?.market_checked_at].join("|");}
function openWorkflowUpdate(){
  localStorage.setItem("jpstock.awaitUpdate","1");
  window.open(WORKFLOW_URL,"_blank","noopener");
  toast("GitHubで「Run workflow」を実行してください。反映を自動確認します。",5000);
  startPolling();
}
function startPolling(){
  if(pollTimer)clearInterval(pollTimer);
  let n=0;
  pollTimer=setInterval(async()=>{
    n++;
    const changed=await load({silent:true,onlyIfChanged:true});
    if(changed){
      clearInterval(pollTimer);pollTimer=null;
      localStorage.removeItem("jpstock.awaitUpdate");
      toast("新しいデータを確認しました。",4500);
    }else if(n>=48){
      clearInterval(pollTimer);pollTimer=null;
      toast("4分以内に更新を確認できませんでした。GitHubの実行結果を確認してください。",6500);
    }
  },5000);
}
function bindUpdateControls(){
  const refresh=document.getElementById("refresh-data-btn");
  if(refresh)refresh.onclick=async()=>{
    refresh.disabled=true;refresh.textContent="確認中…";
    const changed=await load({manual:true});
    if(!changed){
      const closed=(currentSnapshot?.market_run_status||currentSnapshot?.run_status)==="NO_NEW_TARGET";
      const latest=fmtDate(currentSnapshot?.latest_decision_as_of);
      toast(closed?"本日は休場日のため、最新判断日は "+latest+" のままです。表示データは再確認済みです。":"新しい判断データはまだありません。表示中のデータを再確認しました。",6000);
    }
  };
  const update=document.getElementById("github-update-btn");
  if(update)update.onclick=openWorkflowUpdate;
}
function openQualityInvestigation(){
  window.open(QUALITY_WORKFLOW_URL,"_blank","noopener");
  toast("GitHubで「Run workflow」を実行すると、最新判断日のデータを再取得・再照合します。",6000);
}
function bindQualityAction(){
  const btn=document.getElementById("quality-investigate-btn");
  if(btn)btn.onclick=openQualityInvestigation;
}
window.addEventListener("focus",async()=>{
  if(localStorage.getItem("jpstock.awaitUpdate")==="1"){
    const changed=await load({silent:true,onlyIfChanged:true});
    if(changed){
      localStorage.removeItem("jpstock.awaitUpdate");
      if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
      toast("更新完了を確認しました。",4500);
    }else startPolling();
  }
});

function movingAverage(rows,n){
  return rows.map((r,i)=>{
    if(i<n-1)return null;
    const xs=rows.slice(i-n+1,i+1).map(x=>Number(x.close)).filter(Number.isFinite);
    return xs.length===n?xs.reduce((a,b)=>a+b,0)/n:null;
  });
}
function stockChartSvg(doc,sec){
  const allRows=(doc?.rows||[]).filter(r=>r?.date&&Number.isFinite(Number(r.close))).slice(-90);
  if(allRows.length<2)return '<div class="history-wait">チャートデータを準備中です。</div>';
  const allMa5=movingAverage(allRows,5),allMa25=movingAverage(allRows,25),allMa75=movingAverage(allRows,75);
  const day=86400000,ms=d=>Date.parse(String(d)+"T00:00:00Z");
  const endAll=ms(allRows[allRows.length-1].date),cut=endAll-30*day;
  let startIndex=allRows.findIndex(r=>ms(r.date)>=cut);
  if(startIndex<0)startIndex=Math.max(0,allRows.length-22);
  const rows=allRows.slice(startIndex),ma5=allMa5.slice(startIndex),ma25=allMa25.slice(startIndex),ma75=allMa75.slice(startIndex);
  const w=680,h=235,pl=52,pr=18,pt=16,pb=30;
  const start=ms(rows[0].date),end=ms(rows[rows.length-1].date),span=Math.max(day,end-start);
  const series=[...rows.map(r=>Number(r.close)),...ma5.filter(Number.isFinite),...ma25.filter(Number.isFinite),...ma75.filter(Number.isFinite)];
  const levels=[sec?.levels?.support_1,sec?.levels?.resistance_1].map(Number).filter(Number.isFinite);
  series.push(...levels);
  let lo=Math.min(...series),hi=Math.max(...series);if(lo===hi){lo-=1;hi+=1;}
  const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
  const x=d=>pl+(ms(d)-start)*(w-pl-pr)/span;
  const y=v=>pt+(hi-Number(v))*(h-pt-pb)/(hi-lo);
  const linePath=vals=>{
    let p="",started=false;
    vals.forEach((v,i)=>{
      if(!Number.isFinite(v))return;
      p+=(started?" L ":"M ")+x(rows[i].date).toFixed(1)+","+y(v).toFixed(1);started=true;
    });return p;
  };
  let grid="";
  for(let i=0;i<4;i++){
    const v=hi-(hi-lo)*i/3,yy=y(v).toFixed(1);
    grid+='<line class="stock-grid" x1="'+pl+'" y1="'+yy+'" x2="'+(w-pr)+'" y2="'+yy+'"/><text class="stock-axis" x="'+(pl-6)+'" y="'+(Number(yy)+4)+'" text-anchor="end">'+Math.round(v).toLocaleString("ja-JP")+'</text>';
  }
  const sd=new Date(start);let sunday=start+((7-sd.getUTCDay())%7)*day,weeks="";
  for(;sunday<=end;sunday+=7*day){
    const xx=x(new Date(sunday).toISOString().slice(0,10)).toFixed(1),d=new Date(sunday),lab=(d.getUTCMonth()+1)+"/"+d.getUTCDate();
    weeks+='<line class="stock-week" x1="'+xx+'" y1="'+pt+'" x2="'+xx+'" y2="'+(h-pb)+'"/><text class="stock-date" x="'+xx+'" y="'+(h-7)+'" text-anchor="middle">'+lab+'</text>';
  }
  const levelLine=(v,cls,label)=>Number.isFinite(Number(v))?'<line class="'+cls+'" x1="'+pl+'" y1="'+y(v).toFixed(1)+'" x2="'+(w-pr)+'" y2="'+y(v).toFixed(1)+'"/><text class="stock-level-label" x="'+(w-pr-2)+'" y="'+(y(v)-4).toFixed(1)+'" text-anchor="end">'+label+" "+Math.round(v).toLocaleString("ja-JP")+'</text>':"";
  return '<svg class="stock-chart" viewBox="0 0 '+w+' '+h+'" role="img">'+grid+weeks+
    '<path class="stock-close" d="'+linePath(rows.map(r=>Number(r.close)))+'"/>'+
    '<path class="stock-ma5" d="'+linePath(ma5)+'"/>'+
    '<path class="stock-ma25" d="'+linePath(ma25)+'"/>'+
    '<path class="stock-ma75" d="'+linePath(ma75)+'"/>'+
    levelLine(sec?.levels?.support_1,"stock-support","支持")+
    levelLine(sec?.levels?.resistance_1,"stock-resistance","抵抗")+
  '</svg><div class="stock-legend"><span class="lg-close">終値</span><span class="lg-ma5">MA5</span><span class="lg-ma25">MA25</span><span class="lg-ma75">MA75</span><span>直近1か月</span></div>';
}
async function loadStockChart(details,sec){
  if(details.dataset.loaded==="1")return;
  const target=details.querySelector(".stock-chart-target");
  try{
    const r=await fetch("data/charts/"+encodeURIComponent(sec.code)+".json?t="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("chart "+r.status);
    target.innerHTML=stockChartSvg(await r.json(),sec);
    details.dataset.loaded="1";
  }catch(_){target.innerHTML='<div class="history-wait">チャートを取得できません。次回更新後に再確認してください。</div>';}
}
function bindStockCharts(){
  document.querySelectorAll(".stock-chart-details").forEach(details=>{
    details.addEventListener("toggle",()=>{
      if(!details.open)return;
      const sec=currentSnapshot?.securities?.find(x=>String(x.code)===details.dataset.code);
      if(sec)loadStockChart(details,sec);
    });
  });
}
function forecastDetailPanel(s){
  const rows=["1","3","5","14"].map(h=>{
    const o=s.outlook?.[h]||{},a=o.analog||{};
    const median=a.median_return_pct==null?"—":(Number(a.median_return_pct)>0?"+":"")+Number(a.median_return_pct).toFixed(2)+"%";
    const share=a.historical_up_share_pct==null?"—":Number(a.historical_up_share_pct).toFixed(1)+"%";
    return '<div class="forecast-row"><div class="fday">'+h+'日</div><div class="fdir '+directionClass(o.direction)+'">'+(arrows[o.direction]||"—")+' '+esc(directionLabels[o.direction]||"—")+'</div><div class="fmain">中央値 '+esc(median)+'<div class="fsub">過去上昇割合 '+esc(share)+' / 類似 '+esc(a.sample_count??"—")+'件 / 信頼度 '+esc(confidenceLabels[o.confidence]||"—")+'</div></div></div>';
  }).join("");
  return '<details class="forecast-details"><summary>予測の詳細を見る</summary><div class="forecast-list">'+rows+'</div><div class="forecast-note">過去の類似局面から見た統計的な目安です。「過去上昇割合」は将来の上昇確率ではありません。</div></details>';
}

function commonTone(value){
  const v=String(value||"").toUpperCase();
  if(["PASS","FRESH","ELIGIBLE","DECISION","CURRENT","CONFIRMED"].includes(v))return "common-ok";
  if(["FAIL","STALE","MISSING","NOT_ELIGIBLE","BLOCKED"].includes(v))return "common-ng";
  return "common-warn";
}
function renderCommonOverview(c){
  const root=document.getElementById("common-overview");
  if(!root)return;
  if(!c||c.schema_version!=="1.0"){root.innerHTML="";return;}
  const q=c.data_quality||{},snap=c.snapshot||{},ms=c.market_state||{},items=c.decision_items||[];
  const eligible=items.filter(x=>x.eligibility==="ELIGIBLE").length;
  const blocked=items.length-eligible;
  const watch=items.filter(x=>x.monitor?.state==="WATCH").length;
  const groups=[];
  items.forEach(x=>{
    const conditions=x.change_conditions||[];
    if(!conditions.length)return;
    const name=x.subject_label||x.ticker||x.subject_id||"";
    const existing=groups.find(g=>g.name===name);
    const labels=conditions.map(y=>(y.target_action?actionJa(y.target_action)+"：":"")+(y.label||"")).filter(Boolean);
    if(existing)existing.labels.push(...labels);else groups.push({name,labels});
  });
  const next=groups.slice(0,3);
  const analyses={};
  items.forEach(x=>{const a=x.analysis_action||"WAIT";analyses[a]=(analyses[a]||0)+1;});
  const analysisSummary=Object.entries(analyses).map(([k,v])=>actionJa(k)+" "+v).join(" / ")||"—";
  const nextHtml=next.length
    ? next.map(x=>'<div class="common-next-row"><b>'+esc(x.name)+'</b><span>'+esc([...new Set(x.labels)].join(" / "))+'</span></div>').join("")
    : '<div class="common-next-empty">変化条件はありません。</div>';
  const internal='<div class="common-grid">'+
      '<div class="common-box '+commonTone(q.qc_state)+'"><span>品質</span><b>'+esc(stateJa(q.qc_state))+'</b></div>'+
      '<div class="common-box '+commonTone(q.data_state)+'"><span>データ</span><b>'+esc(stateJa(q.data_state))+'</b></div>'+
      '<div class="common-box '+commonTone(ms.state)+'"><span>市場</span><b>'+esc(stateJa(ms.state))+'</b></div>'+
      '<div class="common-box '+commonTone(snap.state)+'"><span>更新状態</span><b>'+esc(stateJa(snap.state))+'</b></div>'+
    '</div>';
  root.innerHTML='<article class="common-overview">'+
    '<div class="section-heading"><div><span class="eyebrow">共通10秒確認</span><h2>判断できる状態か</h2></div><span class="reference-pill">共通仕様（試行）</span></div>'+
    '<div class="common-summary">'+
      '<div><span>判断可能</span><b>'+eligible+'/'+items.length+'</b></div>'+
      '<div><span>要確認</span><b>'+blocked+'</b></div>'+
      '<div><span>監視</span><b>'+watch+'</b></div>'+
      '<div><span>参考分析</span><b>'+esc(analysisSummary)+'</b></div>'+
    '</div>'+
    '<div class="common-next"><div class="common-next-title">次に判断が変わる条件</div>'+nextHtml+'</div>'+
    '<details class="supplement-details"><summary>品質・データ状態を見る</summary><div class="disclosure-body">'+internal+'</div></details>'+
    '<details class="supplement-details"><summary>基準時刻・共通仕様を見る</summary><div class="disclosure-body">基準 '+esc(fmtDate(c.timestamps?.market_as_of))+' / 計算 '+esc(fmtDateTime(c.timestamps?.calculated_at))+' / 共通仕様 '+esc(c.common_spec_version||"—")+'</div></details>'+
  '</article>';
}

function setupNav(){
  document.querySelectorAll("nav [data-view]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.dataset.view;
      document.querySelectorAll(".view").forEach(v=>v.hidden=v.id!==id);
      document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b===btn));
      window.scrollTo({top:0,behavior:"smooth"});
    });
  });
}

function friendlyMessage(d,status,latest){
  if(status==="NO_NEW_TARGET")return latest?"本日は休場日です。直近の判断 "+fmtDate(latest)+" を表示しています。":"本日は休場日です。直近判断はまだありません。";
  if(status==="RUN_UNCONFIRMED")return latest?"市場日判定を確認中です。直近の判断 "+fmtDate(latest)+" を表示しています。":"市場日判定を確認中です。";
  if(d.decision_mode==="SHADOW")return "独立データ源との照合を行う検証中です。参考分析は表示しますが、正式売買判断にはまだ使用しません。";
  return d.market_message||"最新データを表示しています。";
}

function actionSummary(items,key){
  const order=["BUY","ADD","HOLD","WAIT","REDUCE","SELL"];
  const counts={};
  (items||[]).forEach(s=>{
    const a=(s[key]||"WAIT").toUpperCase();
    counts[a]=(counts[a]||0)+1;
  });
  return order.filter(a=>counts[a]).map(a=>actionJa(a)+" "+counts[a]).join(" / ")||"—";
}

function formalDecisionText(d,s){
  if(d?.decision_mode==="SHADOW")return "なし";
  return s?.formal_decision||"WAIT";
}

function formalSummaryText(d,items){
  if(d?.decision_mode==="SHADOW")return "なし（検証中）";
  return actionSummary(items,"formal_decision");
}

function renderBanner(d){
  const marketStatus=d.market_run_status||d.run_status||"—";
  const latest=d.latest_decision_as_of||null;
  const v=d.shadow_validation||{},t=v.thresholds||{};
  const mode=d.decision_mode==="SHADOW"?"検証モード":"正式モード";
  const ready=!!v.production_candidate;
  const runOk=(v.run_count||0)>=(t.min_runs||20);
  const sourceOk=v.source_fetch_rate!=null&&v.source_fetch_rate>=(t.source_fetch_rate_min||0.95);
  const ohlcvOk=v.ohlcv_match_rate!=null&&v.ohlcv_match_rate>=(t.ohlcv_match_rate_min||0.98);
  const sampleOk=(v.decision_sample_count||0)>=(t.min_decision_samples||60);
  document.getElementById("meta").innerHTML="<span>最新判断 "+fmtDate(latest)+"</span><small>"+esc(runStatusLabels[marketStatus]||marketStatus)+"</small>";
  const metrics='<div class="validation-grid">'+
      metric("実行回数",(v.run_count??0)+"/"+(t.min_runs??20),String(t.min_runs??20),runOk)+
      metric("取得率",pct(v.source_fetch_rate),pct(t.source_fetch_rate_min??0.95),sourceOk)+
      metric("株価一致",pct(v.ohlcv_match_rate),pct(t.ohlcv_match_rate_min??0.98),ohlcvOk)+
      metric("判断比較",(v.decision_sample_count??0)+"/"+(t.min_decision_samples??60),String(t.min_decision_samples??60),sampleOk)+
    "</div>";
  const closedNote=marketStatus==="NO_NEW_TARGET"?'<br>本日は休場日のため、判断日は '+esc(fmtDate(latest))+' のままです。':"";
  document.getElementById("banner").innerHTML=
    '<div class="banner compact-banner">'+
      '<div class="banner-head"><div><b>'+esc(mode)+'</b><div class="banner-sub">'+esc(friendlyMessage(d,marketStatus,latest))+'</div></div>'+
      '<span class="status-pill '+(ready?"ready":"pending")+'">本番移行 '+(ready?"候補":"未達")+'</span></div>'+
      '<div class="updated">データ生成 '+esc(fmtDateTime(d.updated_at||d.market_checked_at))+' / 表示確認 '+esc(fmtDateTime(lastUiCheckAt||new Date().toISOString()))+closedNote+'</div>'+
      '<div class="update-actions"><button id="refresh-data-btn" class="secondary-action">最新状態を確認</button><button id="github-update-btn" class="primary-action">GitHubで市場データ更新</button></div>'+
      '<details class="technical validation-details"><summary>検証の進み具合</summary>'+
        metrics+
        '<div>市場実行：'+esc(d.market_run_id||d.run_id||"—")+'</div>'+
        '<div>判断実行：'+esc(d.latest_decision_run_id||d.run_id||"—")+'</div>'+
        '<div>判断一致率：'+esc(pct(v.decision_match_rate))+' / 目標 '+esc(pct(t.decision_match_rate_min??0.95))+'</div>'+
      '</details>'+
    '</div>';
  bindUpdateControls();
}

function renderTodayOverview(d){
  const root=document.getElementById("today-overview"),items=d.securities||[];
  if(!items.length){root.innerHTML='<article class="overview-panel"><div class="section-heading"><div><span class="eyebrow">本日の確認</span><h2>今日の要点</h2></div></div><div class="overview-empty">銘柄判断データ待ちです。</div></article>';return;}
  const issueCount=items.filter(s=>sourceCheckState(s)!=="PASS").length;
  const formalSummary=formalSummaryText(d,items),shadowSummary=actionSummary(items,"shadow_action");
  const rows=items.map(s=>{
    const qState=sourceCheckState(s);
    const horizon=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<span class="mini-outlook '+directionClass(o.direction)+'"><small>'+h+'日</small><b>'+(arrows[o.direction]||"—")+'</b></span>';
    }).join("");
    return '<div class="overview-stock rich">'+
      '<div class="overview-name"><b>'+esc(s.name)+'</b><small>'+esc(s.code)+' / '+(s.price==null?"—":Number(s.price).toLocaleString("ja-JP")+"円")+'</small></div>'+
      '<div class="overview-action-main"><span>参考</span><b>'+esc(actionJa(s.shadow_action))+'</b><small>'+esc(cardQualityText(s))+'</small></div>'+
      '<div class="mini-outlooks">'+horizon+'</div>'+
      '<span class="check-pill '+qState.toLowerCase()+'">'+esc(checkStateJa(qState))+'</span>'+
    '</div>';
  }).join("");
  root.innerHTML='<article class="overview-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">本日の確認</span><h2>今日の要点</h2></div><span class="reference-pill">約30秒で確認</span></div>'+
    '<div class="overview-grid">'+
      '<div class="overview-metric"><span>正式判断</span><b>'+esc(formalSummary)+'</b></div>'+
      '<div class="overview-metric"><span>参考分析</span><b>'+esc(shadowSummary)+'</b></div>'+
      '<div class="overview-metric '+(issueCount?"warn":"ok")+'"><span>要確認</span><b>'+issueCount+'銘柄</b></div>'+
      '<div class="overview-metric"><span>判断基準日</span><b>'+esc(fmtDate(d.latest_decision_as_of))+'</b></div>'+
    '</div>'+
    '<details class="overview-list"><summary>6銘柄を一覧で確認</summary>'+rows+'</details>'+
    '<p class="overview-note">一覧では参考判断、現在値、1・3・5・14日の方向、データ照合状態をまとめて確認できます。</p>'+
  '</article>';
}

function renderMarketEnvironment(d){
  const root=document.getElementById("market-environment"),items=d.market_environment||[];
  if(!items.length){root.innerHTML='<article class="market-panel"><div class="section-heading"><div><span class="eyebrow">市場全体</span><h2>市場環境</h2></div><span class="reference-pill">参考情報</span></div><div class="market-empty">次回更新から日経平均・TOPIX・USD/JPYを表示します。</div></article>';return;}
  const marketStatusJa=v=>({ERROR:"取得失敗",STALE:"更新待ち",OK:"正常"}[v]||v||"—");
  const cards=items.map(m=>{
    const decimals=Number.isInteger(m.display_decimals)?m.display_decimals:2;
    const value=m.value==null?"—":Number(m.value).toLocaleString("ja-JP",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    const dir=(m.direction||"UNKNOWN").toLowerCase();
    const status=m.status==="OK"?"":'<span class="market-status">'+esc(marketStatusJa(m.status))+'</span>';
    return '<div class="market-item"><div class="market-name">'+esc(m.name)+status+'</div>'+
      '<div class="market-value">'+value+(m.unit?'<small>'+esc(m.unit)+'</small>':"")+'</div>'+
      '<div class="market-change '+dir+'">'+esc(pctPoint(m.change_pct))+'</div><div class="market-date">'+esc(fmtDate(m.as_of))+'</div></div>';
  }).join("");
  const chartItems=items.filter(m=>Array.isArray(m.history)&&m.history.length>=2).map(m=>{
    const decimals=Number.isInteger(m.display_decimals)?m.display_decimals:2;
    const latest=m.value==null?"—":Number(m.value).toLocaleString("ja-JP",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    return '<div class="market-chart-card"><div class="market-chart-head"><b>'+esc(m.name)+'</b><span>28日 / 最新 '+esc(latest)+'</span></div>'+chart28Svg(m.history)+'</div>';
  }).join("");
  root.innerHTML='<article class="market-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">市場全体</span><h2>市場環境</h2></div><span class="reference-pill">売買判断外・参考</span></div>'+
    '<div class="market-grid">'+cards+'</div>'+
    (chartItems?'<details class="supplement-details"><summary>市場環境の28日グラフを見る</summary><div class="disclosure-body"><div class="market-chart-list">'+chartItems+'</div><p>横線は値の目安、縦の点線は1週間ごとの区切りです。</p></div></details>':'')+
    '<details class="supplement-details"><summary>市場環境の見方</summary><div class="disclosure-body">個別銘柄の背景確認用です。このパネル単独では正式判断を変更しません。</div></details>'+
  '</article>';
}


function sourceCheckState(s){
  const q=(s.data_quality||"").toUpperCase();
  const reason=(s.source_gate_reason||"").toUpperCase();
  if(["ERROR","STALE","HOLD"].includes(q)||reason.includes("MISMATCH")||reason==="PRIMARY_FETCH_FAILED")return "FAIL";
  if(s.source_evidence?.crosscheck_match===true||reason==="SHADOW_SOURCE_MATCH")return "PASS";
  return "PENDING";
}

function cardQualityText(s){
  const q=s.data_quality||"—";
  if(q==="PROVISIONAL"&&sourceCheckState(s)==="PASS")return "暫定一致";
  return qualityLabels[q]||q;
}

function qualityAdvice(s){
  const r=String(s.source_gate_reason||"").toUpperCase();
  if(r.includes("MISMATCH"))return "同一日の株価を再取得・再照合します。継続する場合は取得時刻、補正有無、独立取得元の値を確認します。";
  if(r==="INDEPENDENT_SOURCE_UNAVAILABLE")return "独立データを再取得します。継続する場合は取得元の応答、URL、ページ形式変更を確認します。";
  if(r==="PRIMARY_FETCH_FAILED")return "主データを再取得します。継続する場合は取得サービスの応答と取得処理を確認します。";
  if(r.includes("DATE"))return "主データと独立データの基準日を再確認し、同一営業日のデータへ揃えます。";
  return "最新判断日のデータを再取得・再判定し、原因が残る場合は取得元と照合条件を確認します。";
}
function renderDataQuality(d){
  const root=document.getElementById("data-quality"),items=d.securities||[];
  if(!items.length){root.innerHTML="";return;}
  const states=items.map(s=>({s,state:sourceCheckState(s)})),counts={PASS:0,PENDING:0,FAIL:0};
  states.forEach(x=>counts[x.state]=(counts[x.state]||0)+1);
  const issues=states.filter(x=>x.state!=="PASS");
  const summary=["PASS","PENDING","FAIL"].map(k=>
    '<div class="quality-count '+k.toLowerCase()+'"><span>'+esc(checkStateJa(k))+'</span><b>'+counts[k]+'</b><small>/ '+items.length+'銘柄</small></div>'
  ).join("");
  const rows=states.map(({s,state})=>{
    const reason=sourceReasonLabels[s.source_gate_reason]||s.source_gate_reason||"確認待ち";
    const src=sourceDisplayName(s.source_evidence?.primary)+" ↔ "+sourceDisplayName(s.source_evidence?.independent);
    return '<div class="quality-row"><div><b>'+esc(s.code+" "+s.name)+'</b><small>'+esc(reason)+'</small></div>'+
      '<span class="check-pill '+state.toLowerCase()+'">'+esc(checkStateJa(state))+'</span><div class="quality-source">'+esc(src)+'</div></div>';
  }).join("");
  const issueHtml=issues.length
    ? '<div class="quality-alert"><div class="alert-title">確認事項 '+issues.length+'件</div>'+issues.map(({s,state})=>{
        const reason=sourceReasonLabels[s.source_gate_reason]||s.source_gate_reason||"確認待ち";
        return '<div class="alert-row"><span class="check-pill '+state.toLowerCase()+'">'+esc(checkStateJa(state))+'</span><b>'+esc(s.code+" "+s.name)+'</b><span>'+esc(reason)+'</span></div>';
      }).join("")+
      '<button id="quality-investigate-btn" class="quality-action-btn">要確認を再調査・再判定</button>'+
      '<details class="quality-remedy"><summary>調査・対策内容を見る</summary>'+
        issues.map(({s})=>'<div class="remedy-row"><b>'+esc(s.name)+'</b><span>'+esc(qualityAdvice(s))+'</span></div>').join("")+
      '</details></div>'
    : '<div class="quality-all-clear">独立データとの照合で要確認項目はありません。</div>';
  root.innerHTML='<article class="quality-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">データ品質</span><h2>データの確認状態</h2></div><span class="reference-pill">独立データ照合</span></div>'+
    '<div class="quality-counts">'+summary+'</div>'+issueHtml+
    '<details class="quality-details"><summary>6銘柄の照合結果を見る</summary>'+rows+'</details>'+
    '<details class="supplement-details"><summary>データ品質の見方</summary><div class="disclosure-body">「一致」は独立データとの照合が合っている状態です。再調査ボタンは、休場日でも最新判断日を指定して再取得・再照合します。</div></details>'+
  '</article>';
  bindQualityAction();
}

function technicalPanel(s){
  const t=s.technical||{},l=s.levels||{};
  const has=Object.keys(t).length>0||Object.keys(l).length>0||s.weekly_trend;
  if(!has)return '<details class="technical-panel"><summary>テクニカル詳細</summary><div class="technical-empty">次回更新から詳細指標を表示します。</div></details>';
  const trend=technicalLabels[s.weekly_trend]||s.weekly_trend||"—";
  const macd=(technicalLabels[t.macd_state]||t.macd_state||"—")+' / '+(technicalLabels[t.macd_cross_state]||t.macd_cross_state||"—");
  const structure=technicalLabels[t.price_structure]||t.price_structure||"—";
  const tile=(label,value,note="",wide=false)=>'<div class="tech-tile '+(wide?"wide":"")+'"><span>'+esc(label)+'</span><b>'+esc(value)+'</b>'+(note?'<small>'+esc(note)+'</small>':"")+'</div>';
  return '<details class="technical-panel">'+
    '<summary>テクニカル詳細</summary>'+
    '<div class="tech-compact-grid">'+
      tile("日足",structure)+tile("週足",trend)+
      tile("MA5",num(t.ma5,2)+"円")+
      tile("MA25",num(t.ma25,2)+"円","5日傾き "+(t.ma25_slope5_pct==null?"—":Number(t.ma25_slope5_pct).toFixed(2)+"%"))+
      tile("MA75",num(t.ma75,2)+"円","5日傾き "+(t.ma75_slope5_pct==null?"—":Number(t.ma75_slope5_pct).toFixed(2)+"%"))+
      tile("RSI14",num(t.rsi14,1))+
      tile("出来高20日比",ratio(t.volume_ratio20))+
      tile("MACD",macd,"MACD "+num(t.macd,3)+" / Signal "+num(t.macd_signal,3),true)+
      tile("転換線 / 基準線",num(t.ichimoku_tenkan,2)+" / "+num(t.ichimoku_kijun,2)+"円")+
      tile("支持 / 抵抗",num(l.support_1,2)+" / "+num(l.resistance_1,2)+"円")+
    '</div>'+
    '<div class="tech-note">主要指標を一覧化しています。各指標単独では売買判断にしません。</div>'+
  '</details>';
}

function renderCards(d){
  const cards=document.getElementById("cards");cards.innerHTML="";
  if(!d.securities?.length){cards.innerHTML='<div class="card empty">直近の銘柄判断はまだありません。次の営業日更新後に表示されます。</div>';return;}
  for(const s of d.securities){
    const os=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<div class="h '+directionClass(o.direction)+'"><span>'+h+'日</span><div class="arrow '+directionClass(o.direction)+'">'+(arrows[o.direction]||"—")+'</div><div class="h-direction">'+esc(directionLabels[o.direction]||"—")+'</div><small>信頼度 '+(confidenceLabels[o.confidence]||"—")+'</small></div>';
    }).join("");
    const nc=(s.next_conditions||[]).map(x=>{
      const symbols={PENDING:"△",NOT_AVAILABLE:"—",PASS:"○",MET:"○",FAILED:"×",NOT_MET:"×"};
      return '<div><span class="cond-symbol">'+(symbols[x.status]||"•")+'</span>'+esc(x.label)+'</div>';
    }).join("")||'<div class="muted">追加条件なし</div>';
    const q=s.data_quality||"—",qText=cardQualityText(s);
    const qClass=["HOLD","ERROR","STALE"].includes(q)?"quality-hold":["FINAL","CONFIRMED"].includes(q)?"quality-ok":"quality-provisional";
    const formal=formalDecisionText(d,s),shadow=s.shadow_action||"WAIT",signal=s.reference_signal||"—";
    cards.insertAdjacentHTML("beforeend",
      '<article class="card stock-card">'+
        '<div class="top"><div><div class="code">'+esc(s.code)+'</div><h2>'+esc(s.name)+'</h2></div><span class="quality-badge '+qClass+'">'+esc(qText)+'</span></div>'+
        '<div class="price">'+(s.price==null?"—":Number(s.price).toLocaleString("ja-JP")+"円")+'</div>'+
        '<div class="section-label">参考分析（検証中）</div>'+
        '<div class="decision shadow">'+esc(actionJa(shadow))+'</div>'+
        '<div class="formal">正式判断：<b>'+esc(formal)+'</b><span>'+esc(d.decision_mode==="SHADOW"?"現在は検証中":actionJa(formal))+'</span></div>'+
        '<div class="reference">参考シグナル：<b>'+esc(signalLabels[signal]||"中立")+'</b></div>'+
        '<div class="grid">'+os+'</div>'+
        forecastDetailPanel(s)+
        '<div class="conditions"><b>次に判断が変わる条件</b>'+nc+'</div>'+
        '<details class="stock-chart-details supplement-details" data-code="'+esc(s.code)+'"><summary>株価グラフを見る</summary><div class="disclosure-body"><div class="stock-chart-target"><div class="history-wait compact">開くと最新グラフを読み込みます。</div></div></div></details>'+
        technicalPanel(s)+
        '<details class="data-details"><summary>判断データを見る</summary><div>基準日：'+esc(fmtDate(s.as_of))+'</div><div class="detail-note">'+esc(s.reason_summary||"")+'</div></details>'+
      '</article>'
    );
  }
  bindStockCharts();
}

function renderHelp(d){
  const v=d.shadow_validation||{};
  const t=v.thresholds||{};
  const ready=!!v.production_candidate;

  document.getElementById("help").innerHTML=
    '<article class="help-card hero-help">'+
      '<h1>画面の見方</h1>'+
      '<p>最初に「今日の要点」で全体を確認し、その後に市場環境と必要な銘柄だけ詳細を見る構成です。</p>'+
      '<div class="help-flow"><span>① 今日の要点</span><span>② 市場環境</span><span>③ 銘柄詳細</span><span>④ データ品質</span></div>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>今日の要点</h2>'+
      '<p>正式判断、参考分析、要確認銘柄数、判断基準日を最初に確認します。「6銘柄を一覧で確認」を開くと、各銘柄の正式判断・参考分析・1日方向・Source照合状態を一覧できます。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>市場環境</h2>'+
      '<p>日経平均、TOPIX、USD/JPYを個別株判断の背景確認用として表示します。市場環境は参照情報であり、この表示だけで正式判断を変更しません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>正式判断と参考分析</h2>'+
      '<div class="help-row"><b>正式判断</b><p>実運用で採用する判定です。現在は本番用データ契約未接続のため、検証結果を正式判断へ自動反映しません。</p></div>'+
      '<div class="help-row"><b>参考分析（検証中）</b><p>新しい分析ロジックを本番に影響させず検証する結果です。WAIT、HOLDなどが表示されても、現段階では参考情報です。</p></div>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>判定の意味</h2>'+
      '<div class="term-grid">'+
        '<div><b>WAIT</b><span>待機</span></div><div><b>HOLD</b><span>保有継続</span></div>'+
        '<div><b>BUY</b><span>新規買い</span></div><div><b>ADD</b><span>追加買い</span></div>'+
        '<div><b>REDUCE</b><span>縮小</span></div><div><b>SELL</b><span>売却</span></div>'+
      '</div>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>1・3・5・14日の方向</h2>'+
      '<div class="arrow-guide">'+
        '<div><b>↑↑</b><span>強い上向き</span></div><div><b>↑</b><span>上向き</span></div><div><b>→</b><span>中立</span></div><div><b>↓</b><span>下向き</span></div><div><b>↓↓</b><span>強い下向き</span></div>'+
      '</div>'+
      '<p class="note">「信頼度 低・中・高」は分析結果の確からしさの目安です。上昇・下落の確率そのものではありません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>テクニカル詳細</h2>'+
      '<p>各銘柄のカードを開くと、日足・週足、MA5/25/75、MACD、RSI14、出来高20日比、一目の転換線・基準線、支持線・抵抗線を確認できます。正式判断の根拠確認用で、各指標単独では売買判断にしません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>次の条件</h2>'+
      '<p><b>△</b> は監視中・未確定、<b>○</b> は条件成立、<b>×</b> は条件非成立、<b>—</b> は判定不能を表します。条件が複数ある場合は、必要条件がそろうかを確認します。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<div class="help-title-line"><h2>検証の進み具合</h2><span class="status-pill '+(ready?"ready":"pending")+'">本番移行 '+(ready?"候補":"未達")+'</span></div>'+
      '<div class="progress-list">'+
        '<div><span>検証実行</span><b>'+(v.run_count??0)+' / '+(t.min_runs??20)+'</b></div>'+
        '<div><span>データ取得率</span><b>'+pct(v.source_fetch_rate)+' / '+pct(t.source_fetch_rate_min??0.95)+'</b></div>'+
        '<div><span>株価データ一致率</span><b>'+pct(v.ohlcv_match_rate)+' / '+pct(t.ohlcv_match_rate_min??0.98)+'</b></div>'+
        '<div><span>判断比較数</span><b>'+(v.decision_sample_count??0)+' / '+(t.min_decision_samples??60)+'</b></div>'+
        '<div><span>判断一致率</span><b>'+pct(v.decision_match_rate)+' / '+pct(t.decision_match_rate_min??0.95)+'</b></div>'+
      '</div>'+
      '<p class="note">基準達成だけで自動的に正式運用へ切り替える設計ではありません。本番用データ契約の接続・確認後に移行判断します。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>データ品質</h2>'+
      '<div class="help-row"><b>暫定一致</b><p>独立データとの値照合は一致していますが、本番用データ契約確定前なので正式判断には未採用です。</p></div>'+
      '<div class="help-row"><b>一致</b><p>主データと独立データの照合が一致した状態です。本番運用確定を意味しません。</p></div>'+
      '<div class="help-row"><b>確認中</b><p>独立データ未取得などで照合が完了していない状態です。</p></div>'+
      '<div class="help-row"><b>要確認</b><p>データ差異、取得失敗、更新遅延などがあり確認が必要な状態です。</p></div>'+
    '</article>';
}

function renderAll(d,commonResult){
  currentSnapshot=d;
  renderBanner(d);
  renderCommonOverview(commonResult);
  renderTodayOverview(d);
  renderMarketEnvironment(d);
  renderCards(d);
  renderDataQuality(d);
  renderHelp(d);
}
async function load(opts={}){
  try{
    const stamp=Date.now();
    const [r,commonResult]=await Promise.all([
      fetch("data/app_snapshot.json?t="+stamp,{cache:"no-store"}),
      fetch("data/common_snapshot.json?t="+stamp,{cache:"no-store"}).then(x=>x.ok?x.json():null).catch(()=>null)
    ]);
    if(!r.ok)throw new Error("snapshot "+r.status);
    const d=await r.json(),nextKey=snapshotKey(d),changed=!!currentSnapshotKey&&nextKey!==currentSnapshotKey;
    lastUiCheckAt=new Date().toISOString();
    if(opts.onlyIfChanged&&!changed)return false;
    currentSnapshotKey=nextKey;
    renderAll(d,commonResult);
    if(opts.manual&&changed)toast("新しいデータを読み込みました。");
    return changed;
  }catch(e){
    if(!opts.silent)document.getElementById("banner").innerHTML='<div class="banner error">データ読み込みに失敗しました。通信状態を確認して再度お試しください。</div>';
    return false;
  }
}

setupNav();
load();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js?v=1.5.1");
