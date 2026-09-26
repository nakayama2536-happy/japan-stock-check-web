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
  CURRENT:"最新",CONFIRMED:"確認済み",MISSING:"未取得",DECISION:"判断可能",
  CLOSED:"休場",LAST_VALID:"直近有効値",OPEN:"取引日",PARTIAL:"一部確認",UNKNOWN:"不明"
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
let currentSnapshot=null,currentSnapshotKey="",pollTimer=null,qualityPollTimer=null,qualityTimerId=null,lastUiCheckAt=null,chartModal=null;

function toast(message,ms=3500){
  let el=document.getElementById("app-toast");
  if(!el){el=document.createElement("div");el.id="app-toast";el.className="app-toast";document.body.appendChild(el);}
  el.textContent=message;el.classList.add("show");
  clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),ms);
}

const QUALITY_STARTED_KEY="jpstock.qualityStartedAt";
const QUALITY_FINISHED_KEY="jpstock.qualityFinishedAt";
const QUALITY_STATUS_KEY="jpstock.qualityRunStatus";
function fmtClock(ts){
  if(!Number.isFinite(Number(ts)))return "—";
  try{return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(Number(ts)));}
  catch(_){return "—";}
}
function fmtElapsed(ms){
  const total=Math.max(0,Math.floor(Number(ms||0)/1000)),m=Math.floor(total/60),s=total%60;
  return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function stopQualityTimer(){
  if(qualityTimerId){clearInterval(qualityTimerId);qualityTimerId=null;}
}
function updateQualityRunDisplay(){
  const el=document.getElementById("quality-run-time");
  if(!el)return;
  const started=Number(localStorage.getItem(QUALITY_STARTED_KEY));
  if(!Number.isFinite(started)||started<=0){el.hidden=true;return;}
  const awaiting=localStorage.getItem("jpstock.awaitQuality")==="1";
  const finished=Number(localStorage.getItem(QUALITY_FINISHED_KEY));
  const status=localStorage.getItem(QUALITY_STATUS_KEY)||"";
  const end=!awaiting&&Number.isFinite(finished)&&finished>=started?finished:Date.now();
  const label=awaiting?(status==="WAITING"?"結果確認待ち":"実行確認中"):(status==="DONE"?"結果確認済み":"前回実行");
  el.hidden=false;
  el.innerHTML='<span>開始 '+esc(fmtClock(started))+'</span><b>'+esc(label)+"・"+esc(awaiting?"経過 ":"所要 ")+esc(fmtElapsed(end-started))+'</b><small>ボタン操作からのアプリ計測</small>';
}
function startQualityTimer(){
  stopQualityTimer();
  updateQualityRunDisplay();
  qualityTimerId=setInterval(updateQualityRunDisplay,1000);
}
function markQualityRunStart(){
  const now=Date.now();
  localStorage.setItem(QUALITY_STARTED_KEY,String(now));
  localStorage.removeItem(QUALITY_FINISHED_KEY);
  localStorage.setItem(QUALITY_STATUS_KEY,"RUNNING");
  startQualityTimer();
}
function markQualityRunFinished(){
  localStorage.setItem(QUALITY_FINISHED_KEY,String(Date.now()));
  localStorage.setItem(QUALITY_STATUS_KEY,"DONE");
  stopQualityTimer();
  updateQualityRunDisplay();
}
function markQualityRunWaiting(){
  localStorage.setItem(QUALITY_STATUS_KEY,"WAITING");
  updateQualityRunDisplay();
}

function ensureChartModal(){
  if(chartModal)return chartModal;
  chartModal=document.createElement("div");
  chartModal.id="chart-modal";
  chartModal.className="chart-modal";
  chartModal.hidden=true;
  chartModal.setAttribute("role","dialog");
  chartModal.setAttribute("aria-modal","true");
  chartModal.setAttribute("aria-labelledby","chart-modal-title");
  chartModal.innerHTML='<div class="chart-modal-panel"><div class="chart-modal-head"><b id="chart-modal-title">グラフ拡大</b><button type="button" class="chart-modal-close" data-chart-close>閉じる</button></div><div class="chart-modal-body"><div class="chart-modal-content"></div></div></div>';
  chartModal.addEventListener("click",e=>{if(e.target===chartModal||e.target.closest("[data-chart-close]"))closeChartModal();});
  document.body.appendChild(chartModal);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&chartModal&&!chartModal.hidden)closeChartModal();});
  return chartModal;
}
function closeChartModal(){
  if(!chartModal)return;
  chartModal.hidden=true;
  document.documentElement.classList.remove("chart-modal-open");
}
function chartTitleFor(block){
  const label=block.querySelector(".market-chart-head b,.indicator-head b")?.textContent?.trim()||"グラフ";
  const stock=block.closest(".stock-card");
  if(!stock)return label;
  const code=stock.querySelector(".code")?.textContent?.trim()||"";
  const name=stock.querySelector("h2")?.textContent?.trim()||"";
  return [code,name].filter(Boolean).join(" ")+" / "+label;
}
function openChartModal(block){
  const modal=ensureChartModal(),content=modal.querySelector(".chart-modal-content"),clone=block.cloneNode(true);
  clone.querySelectorAll(".chart-expand-btn").forEach(x=>x.remove());
  modal.querySelector("#chart-modal-title").textContent=chartTitleFor(block);
  content.replaceChildren(clone);
  modal.hidden=false;
  document.documentElement.classList.add("chart-modal-open");
  requestAnimationFrame(()=>modal.querySelector(".chart-modal-close")?.focus());
}
function bindChartExpanders(root=document){
  root.querySelectorAll(".market-chart-card,.indicator-block").forEach(block=>{
    if(block.dataset.expandBound==="1")return;
    const head=block.querySelector(".market-chart-head,.indicator-head");
    if(!head)return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="chart-expand-btn";
    btn.textContent="拡大";
    btn.setAttribute("aria-label",chartTitleFor(block)+"を画面いっぱいに拡大");
    btn.addEventListener("click",()=>openChartModal(block));
    head.appendChild(btn);
    block.dataset.expandBound="1";
  });
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
function qualityIssueCount(d){
  return (d?.securities||[]).filter(s=>sourceCheckState(s)!=="PASS").length;
}
function qualityIssueNames(d){
  return (d?.securities||[]).filter(s=>sourceCheckState(s)!=="PASS").map(s=>s.name).filter(Boolean);
}
function qualityResultMessage(before){
  const after=qualityIssueCount(currentSnapshot),names=qualityIssueNames(currentSnapshot);
  if(after<before)return "再調査完了："+before+"件→"+after+"件に改善しました。"+(after?" 残り："+names.join("、"):" 全銘柄一致です。");
  if(after===0)return "再調査完了：全6銘柄が一致しました。";
  return "再調査完了：要確認は"+after+"件のままです。残り："+names.join("、")+"。原因確認を継続します。";
}
function stopQualityPolling(){
  if(qualityPollTimer){clearInterval(qualityPollTimer);qualityPollTimer=null;}
}
function startQualityPolling(){
  stopQualityPolling();
  let n=0;
  qualityPollTimer=setInterval(async()=>{
    n++;
    const before=Number(localStorage.getItem("jpstock.qualityBefore")||qualityIssueCount(currentSnapshot));
    const changed=await load({silent:true,onlyIfChanged:true});
    if(changed){
      stopQualityPolling();
      localStorage.removeItem("jpstock.awaitQuality");
      localStorage.removeItem("jpstock.qualityBefore");
      markQualityRunFinished();
      toast(qualityResultMessage(before),7000);
    }else if(n>=48){
      stopQualityPolling();
      markQualityRunWaiting();
      toast("4分以内に再調査結果を確認できませんでした。実行時間の表示は継続します。GitHubの実行結果を確認してください。",6500);
    }
  },5000);
}
function openQualityInvestigation(){
  const before=qualityIssueCount(currentSnapshot);
  localStorage.setItem("jpstock.awaitQuality","1");
  localStorage.setItem("jpstock.qualityBefore",String(before));
  markQualityRunStart();
  window.open(QUALITY_WORKFLOW_URL,"_blank","noopener");
  toast("GitHubで「Run workflow」を実行してください。戻ると結果を自動確認します。",6500);
  startQualityPolling();
}
function bindQualityAction(){
  const btn=document.getElementById("quality-investigate-btn");
  if(btn)btn.onclick=openQualityInvestigation;
  if(localStorage.getItem("jpstock.awaitQuality")==="1")startQualityTimer();else updateQualityRunDisplay();
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
  if(localStorage.getItem("jpstock.awaitQuality")==="1"){
    const before=Number(localStorage.getItem("jpstock.qualityBefore")||qualityIssueCount(currentSnapshot));
    const changed=await load({silent:true,onlyIfChanged:true});
    if(changed){
      localStorage.removeItem("jpstock.awaitQuality");
      localStorage.removeItem("jpstock.qualityBefore");
      stopQualityPolling();
      markQualityRunFinished();
      toast(qualityResultMessage(before),7000);
    }else startQualityPolling();
  }
});

function movingAverage(rows,n){
  return rows.map((r,i)=>{
    if(i<n-1)return null;
    const xs=rows.slice(i-n+1,i+1).map(x=>Number(x.close)).filter(Number.isFinite);
    return xs.length===n?xs.reduce((a,b)=>a+b,0)/n:null;
  });
}
function emaValues(values,period){
  const out=new Array(values.length).fill(null),k=2/(period+1);
  let ema=null;
  for(let i=0;i<values.length;i++){
    const v=Number(values[i]);
    if(!Number.isFinite(v))continue;
    ema=ema==null?v:(v*k+ema*(1-k));
    out[i]=ema;
  }
  return out;
}
function macdSeries(rows){
  const closes=rows.map(r=>Number(r.close));
  const fast=emaValues(closes,12),slow=emaValues(closes,26);
  const macd=closes.map((_,i)=>Number.isFinite(fast[i])&&Number.isFinite(slow[i])?fast[i]-slow[i]:null);
  const signal=emaValues(macd,9);
  const hist=macd.map((v,i)=>Number.isFinite(v)&&Number.isFinite(signal[i])?v-signal[i]:null);
  return {macd,signal,hist};
}
function rsiSeries(rows,period=14){
  const closes=rows.map(r=>Number(r.close)),out=new Array(closes.length).fill(null);
  if(closes.length<=period)return out;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){
    const d=closes[i]-closes[i-1];
    if(d>=0)gain+=d;else loss-=d;
  }
  let avgGain=gain/period,avgLoss=loss/period;
  const calc=()=>avgLoss===0?100:100-(100/(1+avgGain/avgLoss));
  out[period]=calc();
  for(let i=period+1;i<closes.length;i++){
    const d=closes[i]-closes[i-1],g=Math.max(d,0),l=Math.max(-d,0);
    avgGain=(avgGain*(period-1)+g)/period;
    avgLoss=(avgLoss*(period-1)+l)/period;
    out[i]=calc();
  }
  return out;
}
function stockChartSvg(doc,sec){
  const allRows=(doc?.rows||[]).filter(r=>r?.date&&Number.isFinite(Number(r.close))).slice(-90);
  if(allRows.length<30)return '<div class="history-wait">MACD・RSI計算に必要な履歴を準備中です。</div>';
  const allMa5=movingAverage(allRows,5),allMa25=movingAverage(allRows,25),allMa75=movingAverage(allRows,75);
  const macdAll=macdSeries(allRows),rsiAll=rsiSeries(allRows,14);
  const day=86400000,ms=d=>Date.parse(String(d)+"T00:00:00Z");
  const endAll=ms(allRows[allRows.length-1].date),cut=endAll-30*day;
  let startIndex=allRows.findIndex(r=>ms(r.date)>=cut);
  if(startIndex<0)startIndex=Math.max(0,allRows.length-22);
  const rows=allRows.slice(startIndex);
  const ma5=allMa5.slice(startIndex),ma25=allMa25.slice(startIndex),ma75=allMa75.slice(startIndex);
  const macd=macdAll.macd.slice(startIndex),signal=macdAll.signal.slice(startIndex),hist=macdAll.hist.slice(startIndex);
  const rsi=rsiAll.slice(startIndex);
  const w=680,pl=52,pr=18,start=ms(rows[0].date),end=ms(rows[rows.length-1].date),span=Math.max(day,end-start);
  const x=d=>pl+(ms(d)-start)*(w-pl-pr)/span;
  const weekLines=(h,pt,pb,labels=false)=>{
    const sd=new Date(start);let sunday=start+((7-sd.getUTCDay())%7)*day,out="";
    for(;sunday<=end;sunday+=7*day){
      const iso=new Date(sunday).toISOString().slice(0,10),xx=x(iso).toFixed(1),d=new Date(sunday),lab=(d.getUTCMonth()+1)+"/"+d.getUTCDate();
      out+='<line class="stock-week" x1="'+xx+'" y1="'+pt+'" x2="'+xx+'" y2="'+(h-pb)+'"/>';
      if(labels)out+='<text class="stock-date" x="'+xx+'" y="'+(h-7)+'" text-anchor="middle">'+lab+'</text>';
    }
    return out;
  };
  const pathFor=(vals,y)=>{
    let p="",started=false;
    vals.forEach((v,i)=>{
      if(!Number.isFinite(v))return;
      p+=(started?" L ":"M ")+x(rows[i].date).toFixed(1)+","+y(v).toFixed(1);started=true;
    });
    return p;
  };

  const ph=235,ppt=16,ppb=30;
  const priceSeries=[...rows.map(r=>Number(r.close)),...ma5.filter(Number.isFinite),...ma25.filter(Number.isFinite),...ma75.filter(Number.isFinite)];
  const levels=[sec?.levels?.support_1,sec?.levels?.resistance_1].map(Number).filter(Number.isFinite);
  priceSeries.push(...levels);
  let plo=Math.min(...priceSeries),phi=Math.max(...priceSeries);if(plo===phi){plo-=1;phi+=1;}
  const ppad=(phi-plo)*.08;plo-=ppad;phi+=ppad;
  const py=v=>ppt+(phi-Number(v))*(ph-ppt-ppb)/(phi-plo);
  let pgrid="";
  for(let i=0;i<4;i++){
    const v=phi-(phi-plo)*i/3,yy=py(v).toFixed(1);
    pgrid+='<line class="stock-grid" x1="'+pl+'" y1="'+yy+'" x2="'+(w-pr)+'" y2="'+yy+'"/><text class="stock-axis" x="'+(pl-6)+'" y="'+(Number(yy)+4)+'" text-anchor="end">'+Math.round(v).toLocaleString("ja-JP")+'</text>';
  }
  const levelLine=(v,cls,label)=>Number.isFinite(Number(v))?'<line class="'+cls+'" x1="'+pl+'" y1="'+py(v).toFixed(1)+'" x2="'+(w-pr)+'" y2="'+py(v).toFixed(1)+'"/><text class="stock-level-label" x="'+(w-pr-2)+'" y="'+(py(v)-4).toFixed(1)+'" text-anchor="end">'+label+" "+Math.round(v).toLocaleString("ja-JP")+'</text>':"";
  const priceSvg='<div class="indicator-block"><div class="indicator-head"><b>株価</b><span>直近1か月</span></div>'+
    '<svg class="stock-chart price-chart" viewBox="0 0 '+w+' '+ph+'" role="img">'+pgrid+weekLines(ph,ppt,ppb,true)+
    '<path class="stock-close" d="'+pathFor(rows.map(r=>Number(r.close)),py)+'"/>'+
    '<path class="stock-ma5" d="'+pathFor(ma5,py)+'"/>'+
    '<path class="stock-ma25" d="'+pathFor(ma25,py)+'"/>'+
    '<path class="stock-ma75" d="'+pathFor(ma75,py)+'"/>'+
    levelLine(sec?.levels?.support_1,"stock-support","支持")+
    levelLine(sec?.levels?.resistance_1,"stock-resistance","抵抗")+
    '</svg><div class="stock-legend"><span class="lg-close">終値</span><span class="lg-ma5">MA5</span><span class="lg-ma25">MA25</span><span class="lg-ma75">MA75</span></div></div>';

  const mh=150,mpt=18,mpb=20,finiteMacd=[...macd,...signal,...hist,0].filter(Number.isFinite);
  const maxAbs=Math.max(...finiteMacd.map(v=>Math.abs(v)),0.001)*1.12;
  const my=v=>mpt+(maxAbs-Number(v))*(mh-mpt-mpb)/(maxAbs*2);
  const zeroY=my(0),barW=Math.max(2,(w-pl-pr)/Math.max(rows.length,1)*0.58);
  const bars=hist.map((v,i)=>{
    if(!Number.isFinite(v))return "";
    const xx=x(rows[i].date)-barW/2,yy=my(v),height=Math.max(1,Math.abs(zeroY-yy));
    return '<rect class="'+(v>=0?"macd-bar-pos":"macd-bar-neg")+'" x="'+xx.toFixed(1)+'" y="'+Math.min(yy,zeroY).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+height.toFixed(1)+'"/>';
  }).join("");
  const latestMacd=[...macd].reverse().find(Number.isFinite),latestSignal=[...signal].reverse().find(Number.isFinite);
  const macdSvg='<div class="indicator-block"><div class="indicator-head"><b>MACD</b><span>MACD '+(Number.isFinite(latestMacd)?latestMacd.toFixed(2):"—")+' / Signal '+(Number.isFinite(latestSignal)?latestSignal.toFixed(2):"—")+'</span></div>'+
    '<svg class="stock-chart macd-chart" viewBox="0 0 '+w+' '+mh+'" role="img">'+weekLines(mh,mpt,mpb,false)+
    '<line class="indicator-zero" x1="'+pl+'" y1="'+zeroY.toFixed(1)+'" x2="'+(w-pr)+'" y2="'+zeroY.toFixed(1)+'"/>'+bars+
    '<path class="macd-line" d="'+pathFor(macd,my)+'"/><path class="signal-line" d="'+pathFor(signal,my)+'"/>'+
    '</svg><div class="indicator-legend"><span class="lg-macd">MACD</span><span class="lg-signal">Signal</span><span class="lg-hist-pos">＋Hist</span><span class="lg-hist-neg">－Hist</span></div></div>';

  const rh=135,rpt=14,rpb=18,ry=v=>rpt+(100-Number(v))*(rh-rpt-rpb)/100;
  const guide=(v,cls)=>'<line class="'+cls+'" x1="'+pl+'" y1="'+ry(v).toFixed(1)+'" x2="'+(w-pr)+'" y2="'+ry(v).toFixed(1)+'"/><text class="rsi-label" x="'+(pl-5)+'" y="'+(ry(v)+4).toFixed(1)+'" text-anchor="end">'+v+'</text>';
  const latestRsi=[...rsi].reverse().find(Number.isFinite);
  const rsiSvg='<div class="indicator-block"><div class="indicator-head"><b>RSI14</b><span>最新 '+(Number.isFinite(latestRsi)?latestRsi.toFixed(1):"—")+'</span></div>'+
    '<svg class="stock-chart rsi-chart" viewBox="0 0 '+w+' '+rh+'" role="img">'+weekLines(rh,rpt,rpb,false)+guide(70,"rsi-guide high")+guide(50,"rsi-guide mid")+guide(30,"rsi-guide low")+
    '<path class="rsi-line" d="'+pathFor(rsi,ry)+'"/></svg><div class="indicator-note">70以上：過熱気味 / 30以下：売られ過ぎ目安</div></div>';

  return priceSvg+macdSvg+rsiSvg;
}
async function loadStockChart(details,sec){
  if(details.dataset.loaded==="1")return;
  const target=details.querySelector(".stock-chart-target");
  try{
    const r=await fetch("data/charts/"+encodeURIComponent(sec.code)+".json?t="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("chart "+r.status);
    target.innerHTML=stockChartSvg(await r.json(),sec);
    bindChartExpanders(target);
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
function qualityIssueText(s){
  const reason=String(s?.source_gate_reason||"").toUpperCase();
  const diffs=s?.source_evidence?.diffs||{};
  if(reason.includes("MISMATCH")){
    const labels={open:"始値",high:"高値",low:"安値",close:"終値",volume:"出来高"};
    const parts=Object.entries(diffs).filter(([,v])=>Number.isFinite(Number(v))&&Math.abs(Number(v))>0).map(([k,v])=>{
      const n=Number(v),txt=Math.abs(n)>=1?Math.abs(n).toLocaleString("ja-JP",{maximumFractionDigits:2}):Math.abs(n).toFixed(2);
      return (labels[k]||k)+"差 "+txt+(k==="volume"?"":"円");
    });
    if(parts.length)return parts.join(" / ");
  }
  return sourceReasonLabels[s?.source_gate_reason]||s?.source_gate_reason||"確認が必要です";
}
function conditionTargetValue(s,x){
  const label=String(x?.label||"");
  const m=label.match(/([0-9][0-9,]*(?:\.[0-9]+)?)円/);
  if(m)return Number(m[1].replace(/,/g,""));
  if(/転換線/.test(label))return Number(s?.technical?.ichimoku_tenkan);
  if(/基準線/.test(label))return Number(s?.technical?.ichimoku_kijun);
  if(/抵抗/.test(label))return Number(s?.levels?.resistance_1);
  if(/支持/.test(label))return Number(s?.levels?.support_1);
  return null;
}
function conditionGapText(s,x){
  const price=Number(s?.price),target=conditionTargetValue(s,x);
  if(!Number.isFinite(price)||!Number.isFinite(target)||price===0)return "";
  const delta=target-price,pct=delta/price*100;
  const decimals=Math.abs(delta)<1?2:Math.abs(delta)<10?1:0;
  const d=(delta>=0?"+":"")+delta.toLocaleString("ja-JP",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  const p=(pct>=0?"+":"")+pct.toFixed(2);
  return "現在値との差 "+d+"円（"+p+"%）";
}
function forecastAlignment(o){
  const dir={STRONG_UP:1,UP:1,NEUTRAL:0,DOWN:-1,STRONG_DOWN:-1}[o?.direction]||0;
  const a=o?.analog||{},median=Number(a.median_return_pct),share=Number(a.historical_up_share_pct);
  let stat=0;
  if(Number.isFinite(median)&&Math.abs(median)>=0.20)stat=median>0?1:-1;
  else if(Number.isFinite(share)&&share>=55)stat=1;
  else if(Number.isFinite(share)&&share<=45)stat=-1;
  if(dir&&stat&&dir!==stat)return {label:"参考統計と方向差",cls:"forecast-mismatch"};
  if(dir&&stat&&dir===stat)return {label:"方向整合",cls:"forecast-match"};
  return {label:"参考統計は中立",cls:"forecast-neutral"};
}
function topChangeRows(items){
  const rows=[];
  for(const s of (items||[])){
    const cs=s.next_conditions||[];
    if(!cs.length)continue;
    const ranked=[...cs].sort((a,b)=>Number(!!conditionGapText(s,b))-Number(!!conditionGapText(s,a)));
    const c=ranked[0],gap=conditionGapText(s,c);
    rows.push({name:s.name,label:c.label||"条件確認",gap});
  }
  return rows.slice(0,4);
}
function qualityIssueText(s){
  const reason=String(s?.source_gate_reason||"").toUpperCase();
  const diffs=s?.source_evidence?.diffs||{};
  if(reason.includes("MISMATCH")){
    const labels={open:"始値",high:"高値",low:"安値",close:"終値",volume:"出来高"};
    const parts=Object.entries(diffs)
      .filter(([,v])=>Number.isFinite(Number(v))&&Math.abs(Number(v))>0)
      .map(([k,v])=>{
        const n=Math.abs(Number(v));
        const txt=n>=1?n.toLocaleString("ja-JP",{maximumFractionDigits:2}):n.toFixed(2);
        return (labels[k]||k)+"差 "+txt+(k==="volume"?"":"円");
      });
    if(parts.length)return parts.join(" / ");
  }
  return sourceReasonLabels[s?.source_gate_reason]||s?.source_gate_reason||"確認が必要です";
}
function conditionTargetValue(s,x){
  const label=String(x?.label||"");
  const m=label.match(/([0-9][0-9,]*(?:\.[0-9]+)?)円/);
  if(m)return Number(m[1].replace(/,/g,""));
  if(/転換線/.test(label))return Number(s?.technical?.ichimoku_tenkan);
  if(/基準線/.test(label))return Number(s?.technical?.ichimoku_kijun);
  if(/抵抗/.test(label))return Number(s?.levels?.resistance_1);
  if(/支持/.test(label))return Number(s?.levels?.support_1);
  return null;
}
function conditionGapText(s,x){
  const price=Number(s?.price),target=conditionTargetValue(s,x);
  if(!Number.isFinite(price)||!Number.isFinite(target)||price===0)return "";
  const delta=target-price,pct=delta/price*100;
  const decimals=Math.abs(delta)<1?2:Math.abs(delta)<10?1:0;
  const d=(delta>=0?"+":"")+delta.toLocaleString("ja-JP",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  const p=(pct>=0?"+":"")+pct.toFixed(2);
  return "現在値との差 "+d+"円（"+p+"%）";
}
function forecastAlignment(o){
  const dir={STRONG_UP:1,UP:1,NEUTRAL:0,DOWN:-1,STRONG_DOWN:-1}[o?.direction]||0;
  const a=o?.analog||{},median=Number(a.median_return_pct),share=Number(a.historical_up_share_pct);
  let stat=0;
  if(Number.isFinite(median)&&Math.abs(median)>=0.20)stat=median>0?1:-1;
  else if(Number.isFinite(share)&&share>=55)stat=1;
  else if(Number.isFinite(share)&&share<=45)stat=-1;
  if(dir&&stat&&dir!==stat)return {label:"参考統計と方向差",cls:"forecast-mismatch"};
  if(dir&&stat&&dir===stat)return {label:"方向整合",cls:"forecast-match"};
  return {label:"参考統計は中立",cls:"forecast-neutral"};
}
function topChangeRows(items){
  const rows=[];
  for(const s of (items||[])){
    const cs=s.next_conditions||[];
    if(!cs.length)continue;
    const ranked=[...cs].sort((a,b)=>Number(!!conditionGapText(s,b))-Number(!!conditionGapText(s,a)));
    const c=ranked[0],gap=conditionGapText(s,c);
    rows.push({name:s.name,label:c.label||"条件確認",gap});
  }
  return rows.slice(0,4);
}
function forecastDetailPanel(s){
  const rows=["1","3","5","14"].map(h=>{
    const o=s.outlook?.[h]||{},a=o.analog||{},align=forecastAlignment(o);
    const median=a.median_return_pct==null?"—":(Number(a.median_return_pct)>0?"+":"")+Number(a.median_return_pct).toFixed(2)+"%";
    const share=a.historical_up_share_pct==null?"—":Number(a.historical_up_share_pct).toFixed(1)+"%";
    return '<div class="forecast-cell">'+
      '<div class="forecast-cell-head"><b>'+h+'日</b><span class="'+align.cls+'">'+esc(align.label)+'</span></div>'+
      '<div class="forecast-cell-dir '+directionClass(o.direction)+'">'+(arrows[o.direction]||"—")+' '+esc(directionLabels[o.direction]||"—")+'</div>'+
      '<div class="forecast-confidence">方向信頼度 '+esc(confidenceLabels[o.confidence]||"—")+'</div>'+
      '<div class="forecast-analog">類似中央値 '+esc(median)+' / 上昇割合 '+esc(share)+' / '+esc(a.sample_count??"—")+'件</div>'+
    '</div>';
  }).join("");
  return '<details class="forecast-details"><summary>予測の詳細を見る</summary><div class="forecast-grid">'+rows+'</div>'+
    '<div class="forecast-note">上段は現在のテクニカル方向、類似中央値・上昇割合は過去の参考統計です。両者が逆向きの場合は「参考統計と方向差」と表示します。上昇割合は将来確率ではありません。</div></details>';
}

function commonTone(value){
  const v=String(value||"").toUpperCase();
  if(["PASS","FRESH","ELIGIBLE","DECISION","CURRENT","CONFIRMED"].includes(v))return "common-ok";
  if(["FAIL","STALE","MISSING","NOT_ELIGIBLE","BLOCKED"].includes(v))return "common-ng";
  return "common-warn";
}
function renderCommonOverview(c){
  const root=document.getElementById("common-overview");
  if(root)root.innerHTML="";
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
  const ready=!!v.production_candidate;
  const issues=(d.securities||[]).filter(s=>sourceCheckState(s)!=="PASS");
  const nextKind=d.next_recheck_kind==="BACKUP"?"予備再判定":"次回再判定";
  document.getElementById("meta").innerHTML="<span>最新判断 "+fmtDate(latest)+"</span><small>"+esc(runStatusLabels[marketStatus]||marketStatus)+"</small>";
  const metrics='<div class="validation-grid">'+
      metric("実行回数",(v.run_count??0)+"/"+(t.min_runs??20),String(t.min_runs??20),(v.run_count||0)>=(t.min_runs||20))+
      metric("取得率",pct(v.source_fetch_rate),pct(t.source_fetch_rate_min??0.95),v.source_fetch_rate!=null&&v.source_fetch_rate>=(t.source_fetch_rate_min||0.95))+
      metric("株価一致",pct(v.ohlcv_match_rate),pct(t.ohlcv_match_rate_min??0.98),v.ohlcv_match_rate!=null&&v.ohlcv_match_rate>=(t.ohlcv_match_rate_min||0.98))+
      metric("判断比較",(v.decision_sample_count??0)+"/"+(t.min_decision_samples??60),String(t.min_decision_samples??60),(v.decision_sample_count||0)>=(t.min_decision_samples||60))+
    "</div>";
  const recheck=d.next_recheck_at?esc(fmtDateTime(d.next_recheck_at)):"未定";
  document.getElementById("banner").innerHTML=
    '<div class="banner compact-banner v155-banner">'+
      '<div class="banner-head"><div><b>'+(d.decision_mode==="SHADOW"?"検証中":"正式運用")+'</b><div class="banner-sub-short">'+
        (d.decision_mode==="SHADOW"?"参考分析のみ表示・正式判断には未使用":"正式判断を表示中")+
      '</div></div><span class="status-pill '+(ready?"ready":"pending")+'">本番移行 '+(ready?"候補":"未達")+'</span></div>'+
      '<div class="banner-status-strip">'+
        '<span>判断基準 <b>'+esc(fmtDate(latest))+'</b></span>'+
        '<span class="'+(issues.length?"warn":"ok")+'">品質 <b>'+(issues.length?"要確認 "+issues.length:"正常")+'</b></span>'+
        '<span>'+nextKind+' <b>'+recheck+'</b></span>'+
      '</div>'+
      '<div class="update-actions compact-actions"><button id="refresh-data-btn" class="secondary-action">最新状態を確認</button><button id="github-update-btn" class="primary-action">市場データ更新</button></div>'+
      '<details class="technical validation-details compact-validation"><summary>更新・検証の詳細</summary>'+
        '<div class="banner-detail-text">'+esc(friendlyMessage(d,marketStatus,latest))+'</div>'+
        '<div class="updated">データ生成 '+esc(fmtDateTime(d.updated_at||d.market_checked_at))+' / 表示確認 '+esc(fmtDateTime(lastUiCheckAt||new Date().toISOString()))+'</div>'+
        (d.backup_recheck_at?'<div class="backup-recheck">予備再判定 '+esc(fmtDateTime(d.backup_recheck_at))+'</div>':"")+
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
  if(!items.length){root.innerHTML='<article class="overview-panel"><div class="section-heading"><div><span class="eyebrow">本日の確認</span><h2>本日の判断サマリー</h2></div></div><div class="overview-empty">銘柄判断データ待ちです。</div></article>';return;}
  const issues=items.filter(s=>sourceCheckState(s)!=="PASS"),issueCount=issues.length;
  const shadowSummary=actionSummary(items,"shadow_action");
  const formalCount=d.decision_mode==="SHADOW"?0:items.filter(s=>s.formal_decision).length;
  const rows=items.map(s=>{
    const qState=sourceCheckState(s);
    const horizon=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<span class="mini-outlook '+directionClass(o.direction)+'"><small>'+h+'日</small><b>'+(arrows[o.direction]||"—")+'</b></span>';
    }).join("");
    return '<div class="overview-stock rich">'+
      '<div class="overview-name"><b>'+esc(s.name)+'</b><small>'+esc(s.code)+'</small></div>'+
      '<div class="overview-price">'+(s.price==null?"—":Number(s.price).toLocaleString("ja-JP")+"円")+'</div>'+
      '<div class="overview-action-main"><span>参考</span><b>'+esc(actionJa(s.shadow_action))+'</b><small>'+esc(cardQualityText(s))+'</small></div>'+
      '<span class="check-pill '+qState.toLowerCase()+'">'+esc(checkStateJa(qState))+'</span>'+
      '<div class="mini-outlooks">'+horizon+'</div>'+
    '</div>';
  }).join("");
  const issueBar=issues.length
    ? '<div class="top-quality-alert"><b>品質要確認 '+issues.length+'件</b><span>'+issues.map(s=>esc(s.name+"（"+qualityIssueText(s)+"）")).join(" / ")+'</span></div>'
    : '<div class="top-quality-alert ok"><b>データ品質</b><span>6銘柄すべて一致</span></div>';
  const changes=topChangeRows(items);
  const changeHtml=changes.length?'<details class="change-summary"><summary>次に判断が変わる条件（'+changes.length+'銘柄）</summary><div class="change-list">'+
    changes.map(x=>'<div class="change-row"><b>'+esc(x.name)+'</b><span>'+esc(x.label)+'</span>'+(x.gap?'<small>'+esc(x.gap)+'</small>':"")+'</div>').join("")+
    '</div></details>':"";
  root.innerHTML='<article class="overview-panel v155-overview">'+
    '<div class="section-heading"><div><span class="eyebrow">本日の確認</span><h2>本日の判断サマリー</h2></div><span class="reference-pill">約30秒</span></div>'+
    '<div class="overview-grid decision-state-grid">'+
      '<div class="overview-metric"><span>正式採用</span><b>'+formalCount+'/'+items.length+'</b></div>'+
      '<div class="overview-metric"><span>検証中</span><b>'+(d.decision_mode==="SHADOW"?items.length:0)+'/'+items.length+'</b></div>'+
      '<div class="overview-metric '+(issueCount?"warn":"ok")+'"><span>品質要確認</span><b>'+issueCount+'/'+items.length+'</b></div>'+
      '<div class="overview-metric"><span>参考分析</span><b>'+esc(shadowSummary)+'</b></div>'+
    '</div>'+issueBar+
    '<details class="overview-list" open><summary>6銘柄を一覧で確認</summary>'+rows+'</details>'+
    changeHtml+
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
  bindChartExpanders(root);
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
    ? '<div class="quality-alert"><div class="alert-title">確認事項 '+issues.length+'件</div>'+issues.map(({s,state})=>
        '<div class="alert-row"><span class="check-pill '+state.toLowerCase()+'">'+esc(checkStateJa(state))+'</span><b>'+esc(s.code+" "+s.name)+'</b><span>'+esc(qualityIssueText(s))+'</span></div>'
      ).join("")+
      '<button id="quality-investigate-btn" class="quality-action-btn">要確認を再調査・再判定</button><div class="quality-action-note">GitHubでRun workflow実行後、アプリに戻ると結果を自動確認します。</div><div id="quality-run-time" class="quality-run-time" hidden></div>'+
      '<details class="quality-remedy"><summary>調査・対策内容を見る</summary>'+
        issues.map(({s})=>'<div class="remedy-row"><b>'+esc(s.name)+'</b><span>'+esc(qualityAdvice(s))+'</span></div>').join("")+
      '</details></div>'
    : '<div class="quality-all-clear">独立データとの照合で要確認項目はありません。</div><div id="quality-run-time" class="quality-run-time" hidden></div>';
  root.innerHTML='<article class="quality-panel compact-quality-panel"><details class="quality-root-details">'+
    '<summary><span>データ品質詳細</span><b>一致 '+counts.PASS+' / 要確認 '+(counts.FAIL+counts.PENDING)+'</b></summary>'+
    '<div class="quality-root-body"><div class="quality-counts">'+summary+'</div>'+issueHtml+
      '<details class="quality-details"><summary>6銘柄の照合結果を見る</summary>'+rows+'</details>'+
      '<details class="supplement-details"><summary>データ品質の見方</summary><div class="disclosure-body">「一致」は独立データとの照合が合っている状態です。再調査ボタンは最新判断日を指定して再取得・再照合します。</div></details>'+
    '</div></details></article>';
  bindQualityAction();
}

function fmtFundamentalValue(metric,fact){
  if(!fact||fact.value==null)return "—";
  const v=Number(fact.value);
  if(!Number.isFinite(v))return "—";
  if(metric==="eps_basic")return v.toLocaleString("ja-JP",{maximumFractionDigits:2})+"円/株";
  const av=Math.abs(v);
  if(av>=1e12)return (v/1e12).toLocaleString("ja-JP",{minimumFractionDigits:2,maximumFractionDigits:2})+"兆円";
  if(av>=1e8)return (v/1e8).toLocaleString("ja-JP",{minimumFractionDigits:1,maximumFractionDigits:1})+"億円";
  return v.toLocaleString("ja-JP")+(fact.unit||"");
}
function fmtFundamentalChange(v){
  if(v==null||!Number.isFinite(Number(v)))return "—";
  const n=Number(v);
  return (n>0?"+":"")+n.toFixed(1)+"%";
}
function deepDiveTriggerHtml(s){
  const dd=s.fundamental?.deep_dive||{};
  if(!dd.recommended)return "";
  const severity=String(dd.severity||"WATCH").toLowerCase();
  const severityLabel={high:"要深掘り",watch:"確認推奨",info:"新規開示"}[severity]||"確認推奨";
  const reasons=(dd.reasons||[]).map(r=>'<li>'+esc(r.label||r.code||"確認事項")+'</li>').join("");
  const score=Number.isFinite(Number(dd.priority_score))?Math.round(Number(dd.priority_score)):null;
  const minScore=Number.isFinite(Number(dd.minimum_priority_score))?Math.round(Number(dd.minimum_priority_score)):null;
  const groups=Object.entries(dd.group_scores||{}).filter(([,v])=>Number(v)>0&&Number.isFinite(Number(v)));
  const scoreHtml=score==null?"":'<div class="deep-dive-score"><span>深掘り優先度</span><b>'+esc(score)+'/100</b>'+(minScore==null?"":'<small>基準 '+esc(minScore)+'点</small>')+'<small>独立論点 '+esc(groups.length)+'</small></div>';
  return '<div class="deep-dive-trigger '+severity+'">'+
    '<div class="deep-dive-head"><div><span>ChatGPT深掘りトリガー</span><b>'+esc(severityLabel)+'</b></div><small>売買判定には未反映</small></div>'+
    scoreHtml+
    (reasons?'<ul>'+reasons+'</ul>':"")+
    '<div class="deep-dive-actions">'+
      '<button type="button" class="deep-dive-copy" data-deep-dive-copy="'+esc(s.code)+'">深掘り用データをコピー</button>'+
      '<button type="button" class="deep-dive-share" data-deep-dive-share="'+esc(s.code)+'">共有</button>'+
    '</div>'+
    '<div class="deep-dive-note">優先度は独立した論点をまとめて算出します。純利益とEPSなど相関の強い指標は重複加点しません。</div>'+
  '</div>';
}

function buildDeepDiveText(code){
  const d=currentSnapshot||{};
  const s=(d.securities||[]).find(x=>String(x.code)===String(code));
  if(!s)return "";
  const payload={
    generated_from:"日本株 CHECK",
    generated_at:new Date().toISOString(),
    app_meta:{
      app_version:d.app_version,
      engine_version:d.engine_version,
      analytics_version:d.analytics_version,
      decision_mode:d.decision_mode,
      run_id:d.run_id,
      run_status:d.run_status,
      latest_decision_as_of:d.latest_decision_as_of,
      market_checked_at:d.market_checked_at,
      fundamental_checked_at:d.fundamental_checked_at,
    },
    market_environment:d.market_environment||[],
    selected_security:s,
  };
  const prompt=[
    "# 日本株 CHECK — ChatGPT深掘りフルスナップショット",
    "",
    "## ChatGPTへの分析依頼",
    "このデータは日本株 CHECK が保持する選択銘柄の深掘り用スナップショットです。画面上の判断やトリガーをそのまま採用せず、RAW JSONまで検証してください。",
    "",
    "1. まず日時、市場休場、データ鮮度、欠損、フォールバック、Source照合状態、EDINETの提出日・対象期間・当期/比較期の整合を点検する。",
    "2. 日足・週足、MA5/25/75、一目、MACD、RSI、出来高、支持線・抵抗線を独立評価し、反転確認水準・下落再開水準・重要な支持抵抗を整理する。",
    "3. 1/3/5/14日の方向予測は結論として採用せず、テクニカルとの整合性と矛盾を確認する。",
    "4. EDINETの売上高/収益、営業利益、親会社帰属利益、EPS、営業CF、総資産、純資産・資本を当期/比較期で確認し、利益と営業CFの乖離、符号反転、大幅変化、財務構造変化を検証する。",
    "5. 大幅変化について、会計基準変更、M&A、組織再編、一過性損益、為替、減損など追加確認が必要な可能性を列挙する。推測で確定しない。",
    "6. 外部環境や最新ニュースが判断に影響する場合は、最新の公開情報を確認し、取得日時と出典を明示する。",
    "7. 売買タイミングを検討する前に、不足情報と確認すべきチャート・データを明示する。必要なら、現在保有か新規か、取得単価、予定資金、想定保有期間、許容損失などユーザー確認事項を先に提示する。",
    "8. 最後に、深掘りを続けるべき論点、次回再確認トリガー、追加で必要な情報を整理する。アプリの既存BUY/ADD/HOLD/REDUCE/SELLを自動的に追認しない。",
    "",
    "## APP DATA",
    JSON.stringify(payload,null,2),
  ];
  return prompt.join("\n");
}

async function copyDeepDiveText(code){
  const text=buildDeepDiveText(code);
  if(!text)return;
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const ta=document.createElement("textarea");
      ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
    }
    toast("ChatGPT深掘り用データをコピーしました。",4500);
  }catch(_){
    toast("コピーできませんでした。共有ボタンをお試しください。",5000);
  }
}

async function shareDeepDiveText(code){
  const text=buildDeepDiveText(code);
  if(!text)return;
  const s=(currentSnapshot?.securities||[]).find(x=>String(x.code)===String(code));
  if(navigator.share){
    try{
      await navigator.share({title:"日本株 CHECK 深掘り "+(s?.name||code),text});
      return;
    }catch(e){
      if(e?.name==="AbortError")return;
    }
  }
  await copyDeepDiveText(code);
}

function bindDeepDiveActions(){
  document.querySelectorAll("[data-deep-dive-copy]").forEach(btn=>{
    btn.onclick=()=>copyDeepDiveText(btn.dataset.deepDiveCopy);
  });
  document.querySelectorAll("[data-deep-dive-share]").forEach(btn=>{
    btn.onclick=()=>shareDeepDiveText(btn.dataset.deepDiveShare);
  });
}

function fundamentalPanel(s){
  const f=s.fundamental||{},metrics=f.metrics||{};
  const keys=["revenue","operating_income","net_income_parent","eps_basic","operating_cf","assets","equity"];
  const has=keys.some(k=>metrics[k]?.current||metrics[k]?.prior);
  const status=f.status||"NOT_AVAILABLE";
  if(!has){
    const message=status==="NOT_CONFIGURED"?"EDINET連携を準備中です。":status==="ERROR"?"EDINETデータ取得を再確認します。":"財務データを準備中です。";
    return '<details class="fundamental-panel supplement-details"><summary>業績・財務（EDINET）</summary><div class="disclosure-body"><div class="fundamental-empty">'+esc(message)+'</div><div class="fundamental-note">表示専用。売買判定・短期方向判定には未使用です。</div></div></details>';
  }
  const cards=keys.map(k=>{
    const m=metrics[k];
    if(!m)return "";
    const cur=m.current,pri=m.prior,chg=m.change_pct;
    const cls=chg==null?"flat":Number(chg)>0?"up":Number(chg)<0?"down":"flat";
    const priorLabel=pri?.relative_year||"比較期";
    return '<div class="fundamental-tile">'+
      '<span>'+esc(m.label||k)+'</span>'+
      '<b>'+esc(fmtFundamentalValue(k,cur))+'</b>'+
      '<small>'+esc(cur?.relative_year||"当期")+' / '+esc(priorLabel)+' '+esc(fmtFundamentalValue(k,pri))+'</small>'+
      '<em class="fundamental-change '+cls+'">'+esc(fmtFundamentalChange(chg))+'</em>'+
    '</div>';
  }).join("");
  const period=(f.period_start||f.period_end)?[fmtDate(f.period_start),fmtDate(f.period_end)].join("〜"):"—";
  const refreshLabels={INITIAL_LOAD:"初回取得",NEW_FILING:"新規開示",UNCHANGED:"前回開示と同一",UPDATED:"更新済み",NO_NEW_FILING:"新規提出なし",ERROR_PRESERVED:"前回値を保持",NOT_CONFIGURED_PRESERVED:"前回値を保持"};
  return '<details class="fundamental-panel supplement-details">'+
    '<summary><span>業績・財務（EDINET）</span><small>参考・判定未接続</small></summary>'+
    '<div class="disclosure-body">'+
      '<div class="fundamental-meta"><span>対象 '+esc(period)+'</span><span>提出 '+esc(fmtDateTime(f.submitted_at))+'</span><span>確認 '+esc(fmtDate(f.checked_on))+'</span><span>'+esc(refreshLabels[f.refresh_status]||f.refresh_status||"—")+'</span></div>'+
      '<div class="fundamental-grid">'+cards+'</div>'+
      deepDiveTriggerHtml(s)+
      '<div class="fundamental-note">EDINETの開示値を表示しています。現段階では正式判断・参考分析・1/3/5/14日の方向計算には使用していません。</div>'+
    '</div></details>';
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

function bindStockAccordions(){
  document.querySelectorAll(".stock-accordion").forEach(el=>{
    el.addEventListener("toggle",()=>{
      if(!el.open)return;
      document.querySelectorAll(".stock-accordion").forEach(other=>{
        if(other!==el&&other.open)other.open=false;
      });
    });
  });
}
function bindStockAccordions(){
  document.querySelectorAll(".stock-accordion").forEach(el=>{
    el.addEventListener("toggle",()=>{
      if(!el.open)return;
      document.querySelectorAll(".stock-accordion").forEach(other=>{
        if(other!==el&&other.open)other.open=false;
      });
    });
  });
}
function policyContextHtml(s){
  const p=s.policy_context||{};
  if(!p.label)return "";
  const focus=(p.focus||[]).map(x=>'<span>'+esc(x)+'</span>').join("");
  return '<div class="policy-context">'+
    '<div class="policy-head"><span>銘柄方針</span><b>'+esc(p.label)+'</b></div>'+
    '<div class="policy-objective">'+esc(p.objective||"")+'</div>'+
    (focus?'<div class="policy-focus">'+focus+'</div>':"")+
  '</div>';
}

function nextWatchHtml(s){
  const items=s.next_business_day_watch||[];
  if(!items.length)return "";
  return '<div class="next-watch"><div class="next-watch-title">翌営業日の確認ポイント</div>'+
    '<ol>'+items.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol></div>';
}

function renderCards(d){
  const cards=document.getElementById("cards");cards.innerHTML="";
  if(!d.securities?.length){cards.innerHTML='<div class="card empty">直近の銘柄判断はまだありません。次の営業日更新後に表示されます。</div>';return;}
  cards.insertAdjacentHTML("beforeend",'<div class="cards-heading"><div><span class="eyebrow">必要な銘柄だけ確認</span><h2>銘柄詳細</h2></div><small>同時に開くのは1銘柄</small></div>');
  for(const s of d.securities){
    const os=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<div class="h '+directionClass(o.direction)+'"><span>'+h+'日</span><div class="arrow '+directionClass(o.direction)+'">'+(arrows[o.direction]||"—")+'</div><div class="h-direction">'+esc(directionLabels[o.direction]||"—")+'</div><small>方向信頼度 '+(confidenceLabels[o.confidence]||"—")+'</small></div>';
    }).join("");
    const mini=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<span class="stock-summary-outlook '+directionClass(o.direction)+'"><small>'+h+'日</small><b>'+(arrows[o.direction]||"—")+'</b></span>';
    }).join("");
    const nc=(s.next_conditions||[]).map(x=>{
      const symbols={PENDING:"△",NOT_AVAILABLE:"—",PASS:"○",MET:"○",FAILED:"×",NOT_MET:"×"},gap=conditionGapText(s,x);
      return '<div class="condition-item"><div><span class="cond-symbol">'+(symbols[x.status]||"•")+'</span>'+esc(x.label)+'</div>'+(gap?'<small>'+esc(gap)+'</small>':"")+'</div>';
    }).join("")||'<div class="muted">追加条件なし</div>';
    const q=s.data_quality||"—",qText=cardQualityText(s);
    const qClass=["HOLD","ERROR","STALE"].includes(q)?"quality-hold":["FINAL","CONFIRMED"].includes(q)?"quality-ok":"quality-provisional";
    const formal=formalDecisionText(d,s),shadow=s.shadow_action||"WAIT",signal=s.reference_signal||"—",qState=sourceCheckState(s);
    cards.insertAdjacentHTML("beforeend",
      '<details class="card stock-card stock-accordion" data-stock="'+esc(s.code)+'">'+
        '<summary class="stock-accordion-summary">'+
          '<div class="stock-summary-main"><div><b>'+esc(s.name)+'</b><small>'+esc(s.code)+'</small></div><strong>'+(s.price==null?"—":Number(s.price).toLocaleString("ja-JP")+"円")+'</strong></div>'+
          '<div class="stock-summary-action"><span>参考</span><b>'+esc(actionJa(shadow))+'</b><span class="check-pill '+qState.toLowerCase()+'">'+esc(checkStateJa(qState))+'</span></div>'+
          '<div class="stock-summary-outlooks">'+mini+'</div>'+
        '</summary>'+
        '<div class="stock-accordion-body">'+
          '<div class="section-label">参考分析（検証中）</div>'+
          '<div class="decision shadow">'+esc(actionJa(shadow))+'</div>'+
          '<div class="formal">正式判断：<b>'+esc(formal)+'</b><span>'+esc(d.decision_mode==="SHADOW"?"現在は検証中":actionJa(formal))+'</span></div>'+
          '<div class="reference">参考シグナル：<b>'+esc(signalLabels[signal]||"中立")+'</b></div>'+
          policyContextHtml(s)+
          '<div class="grid">'+os+'</div>'+
          forecastDetailPanel(s)+
          nextWatchHtml(s)+
          '<div class="conditions"><b>次に判断が変わる条件</b>'+nc+'</div>'+
          '<details class="stock-chart-details supplement-details" data-code="'+esc(s.code)+'"><summary>株価・MACD・RSIを見る</summary><div class="disclosure-body"><div class="stock-chart-target"><div class="history-wait compact">開くと最新グラフを読み込みます。</div></div></div></details>'+
          fundamentalPanel(s)+
          technicalPanel(s)+
          '<details class="data-details"><summary>判断データを見る</summary><div>基準日：'+esc(fmtDate(s.as_of))+'</div><div class="detail-note">'+esc(s.reason_summary||"")+'</div></details>'+
        '</div>'+
      '</details>'
    );
  }
  bindStockCharts();
  bindStockAccordions();
  bindDeepDiveActions();
}

function reportMigrationHelp(d){
  const m=d.report_migration||{};
  if(!m.required_total)return "";
  const labels={IMPLEMENTED:"実装済み",PARTIAL:"部分実装",MISSING:"未実装",BLOCKED:"本番待ち"};
  const cls={IMPLEMENTED:"done",PARTIAL:"partial",MISSING:"missing",BLOCKED:"blocked"};
  const rows=(m.capabilities||[]).map(x=>
    '<div class="migration-row"><span class="migration-state '+(cls[x.status]||"missing")+'">'+esc(labels[x.status]||x.status)+'</span><b>'+esc(x.label||x.id)+'</b></div>'
  ).join("");
  const cutover=m.schedule_disable_candidate
    ? '<div class="migration-cutover ready">レポート停止候補。ただし最終承認が必要です。</div>'
    : '<div class="migration-cutover">17:00スケジュールを正式系として継続します。</div>';
  return '<article class="help-card report-migration-card">'+
    '<div class="help-title-line"><h2>レポート統合状況</h2><span class="status-pill '+(m.schedule_disable_candidate?"ready":"pending")+'">'+(m.schedule_disable_candidate?"切替候補":"移行中")+'</span></div>'+
    '<p>スケジュールレポートの機能をアプリへ統合中です。正式系とアプリで別々の売買判断を作らないことを優先します。</p>'+
    '<div class="migration-counts"><div><b>'+esc(m.implemented??0)+'</b><span>実装済み</span></div><div><b>'+esc(m.partial??0)+'</b><span>部分実装</span></div><div><b>'+esc(m.missing_or_blocked??0)+'</b><span>未実装/待ち</span></div><div><b>'+esc(m.required_total??0)+'</b><span>必須合計</span></div></div>'+
    cutover+
    '<details class="migration-details"><summary>統合項目を見る</summary><div class="migration-list">'+rows+'</div></details>'+
    '<p class="note">全必須機能・検証・同一Run/同一正本・正式判断一致が揃っても、自動では17:00スケジュールを停止しません。最終確認後に切り替えます。</p>'+
  '</article>';
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
      '<p class="note">「方向信頼度 低・中・高」は分析結果の確からしさの目安です。上昇・下落の確率そのものではありません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>銘柄方針</h2>'+
      '<p>各銘柄の役割を「新規買い候補・保有継続・整理条件監視・監視のみ」などで明示します。株数、取得単価、口座種別などの個人情報はPublicアプリへ出しません。方針は判断条件の意味を揃えるために使い、単独で売買判断にはしません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>業績・財務（EDINET）</h2>'+
      '<p>金融庁EDINETの開示データから、売上高・収益、営業利益、親会社帰属利益、EPS、営業CF、総資産、純資産・資本の当期・比較期を表示します。現在はShadow表示専用で、売買判断や1・3・5・14日の方向計算には使用しません。新規開示や大幅変化を検出した場合は「ChatGPT深掘りトリガー」を表示し、分析プロンプトと選択銘柄の保持データをコピー・共有できます。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>テクニカル詳細</h2>'+
      '<p>「銘柄詳細」は1銘柄ずつ開きます。開いた銘柄で、日足・週足、MA5/25/75、MACD、RSI14、出来高20日比、一目の転換線・基準線、支持線・抵抗線を確認できます。正式判断の根拠確認用で、各指標単独では売買判断にしません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>翌営業日の確認ポイント</h2>'+
      '<p>未成立の必須条件、データ品質、銘柄方針から最大3件を自動表示します。新しい予測値を作るのではなく、次回確認時に見る項目を整理したものです。</p>'+
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

    reportMigrationHelp(d)+

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
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js?v=1.6.0");
