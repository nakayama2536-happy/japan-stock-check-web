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
const qualityLabels={PROVISIONAL:"暫定",HOLD:"要確認",CONFIRMED:"確認済み"};
const sourceReasonLabels={
  SHADOW_SOURCE_MATCH:"独立データ照合一致",
  HIGH_MISMATCH:"データ差異あり",
  INDEPENDENT_SOURCE_UNAVAILABLE:"独立データ取得不可"
};
const runStatusLabels={
  SHADOW_COMMITTED:"検証結果保存済み",
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

function renderBanner(d){
  const marketStatus=d.market_run_status||d.run_status||"—";
  const latest=d.latest_decision_as_of||null;
  const v=d.shadow_validation||{};
  const t=v.thresholds||{};
  const mode=d.decision_mode==="SHADOW"?"検証モード":"正式モード";
  const ready=!!v.production_candidate;
  const runOk=(v.run_count||0)>=(t.min_runs||20);
  const sourceOk=v.source_fetch_rate!=null&&v.source_fetch_rate>=(t.source_fetch_rate_min||0.95);
  const ohlcvOk=v.ohlcv_match_rate!=null&&v.ohlcv_match_rate>=(t.ohlcv_match_rate_min||0.98);
  const sampleOk=(v.decision_sample_count||0)>=(t.min_decision_samples||60);

  document.getElementById("meta").innerHTML=
    "<span>最新判断 "+fmtDate(latest)+"</span><small>"+esc(runStatusLabels[marketStatus]||marketStatus)+"</small>";

  const metrics=
    '<div class="validation-grid">'+
      metric("Run",(v.run_count??0)+"/"+(t.min_runs??20),String(t.min_runs??20),runOk)+
      metric("Source",pct(v.source_fetch_rate),pct(t.source_fetch_rate_min??0.95),sourceOk)+
      metric("OHLCV",pct(v.ohlcv_match_rate),pct(t.ohlcv_match_rate_min??0.98),ohlcvOk)+
      metric("判断比較",(v.decision_sample_count??0)+"/"+(t.min_decision_samples??60),String(t.min_decision_samples??60),sampleOk)+
    "</div>";

  document.getElementById("banner").innerHTML=
    '<div class="banner">'+
      '<div class="banner-head"><div><b>'+esc(mode)+'</b><div class="banner-sub">'+esc(friendlyMessage(d,marketStatus,latest))+'</div></div>'+
      '<span class="status-pill '+(ready?"ready":"pending")+'">Production '+(ready?"候補":"未達")+'</span></div>'+
      metrics+
      '<div class="updated">更新 '+esc(fmtDateTime(d.updated_at||d.market_checked_at))+'</div>'+
      '<details class="technical"><summary>検証詳細</summary>'+
        '<div>市場Run：'+esc(d.market_run_id||d.run_id||"—")+'</div>'+
        '<div>判断Run：'+esc(d.latest_decision_run_id||d.run_id||"—")+'</div>'+
        '<div>判断一致率：'+esc(pct(v.decision_match_rate))+' / 目標 '+esc(pct(t.decision_match_rate_min??0.95))+'</div>'+
      '</details>'+
    '</div>';
}


function renderMarketEnvironment(d){
  const root=document.getElementById("market-environment");
  const items=d.market_environment||[];
  if(!items.length){
    root.innerHTML='<article class="market-panel"><div class="section-heading"><div><span class="eyebrow">MARKET CONTEXT</span><h2>市場環境</h2></div><span class="reference-pill">参照</span></div><div class="market-empty">次回17:00 Runから日経平均・TOPIX・USD/JPYを表示します。</div></article>';
    return;
  }
  const cards=items.map(m=>{
    const decimals=Number.isInteger(m.display_decimals)?m.display_decimals:2;
    const value=m.value==null?"—":Number(m.value).toLocaleString("ja-JP",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    const dir=(m.direction||"UNKNOWN").toLowerCase();
    const status=m.status==="OK"?"":'<span class="market-status">'+esc(m.status||"—")+'</span>';
    return '<div class="market-item">'+
      '<div class="market-name">'+esc(m.name)+status+'</div>'+
      '<div class="market-value">'+value+(m.unit?'<small>'+esc(m.unit)+'</small>':"")+'</div>'+
      '<div class="market-change '+dir+'">'+esc(pctPoint(m.change_pct))+'</div>'+
      '<div class="market-date">'+esc(fmtDate(m.as_of))+'</div>'+
    '</div>';
  }).join("");
  root.innerHTML='<article class="market-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">MARKET CONTEXT</span><h2>市場環境</h2></div><span class="reference-pill">売買判断外・参照</span></div>'+
    '<div class="market-grid">'+cards+'</div>'+
    '<p class="market-note">個別銘柄の背景確認用です。このパネル単独ではBUY / SELL等の正式判断を変更しません。</p>'+
  '</article>';
}

function renderCards(d){
  const cards=document.getElementById("cards");
  cards.innerHTML="";
  if(!d.securities?.length){
    cards.innerHTML='<div class="card empty">直近の銘柄判断はまだありません。次の営業日Run後に表示されます。</div>';
    return;
  }

  for(const s of d.securities){
    const os=["1","3","5","14"].map(h=>{
      const o=s.outlook?.[h]||{};
      return '<div class="h"><span>'+h+'日</span><div class="arrow">'+(arrows[o.direction]||"—")+'</div><small>信頼度 '+(confidenceLabels[o.confidence]||o.confidence||"—")+'</small></div>';
    }).join("");

    const nc=(s.next_conditions||[]).map(x=>{
      const symbols={PENDING:"△",NOT_AVAILABLE:"—",PASS:"○",MET:"○",FAILED:"×",NOT_MET:"×"};
      return '<div><span class="cond-symbol">'+(symbols[x.status]||"•")+'</span>'+esc(x.label)+'</div>';
    }).join("")||'<div class="muted">追加条件なし</div>';

    const q=s.data_quality||"—";
    const qText=qualityLabels[q]||q;
    const qClass=q==="HOLD"?"quality-hold":q==="CONFIRMED"?"quality-ok":"quality-provisional";
    const formal=s.formal_decision||"WAIT";
    const shadow=s.shadow_action||"WAIT";
    const signal=s.reference_signal||"—";
    const sourceReason=sourceReasonLabels[s.source_gate_reason]||s.source_gate_reason||"—";

    cards.insertAdjacentHTML("beforeend",
      '<article class="card">'+
        '<div class="top"><div><div class="code">'+esc(s.code)+'</div><h2>'+esc(s.name)+'</h2></div><span class="quality-badge '+qClass+'">'+esc(qText)+'</span></div>'+
        '<div class="price">'+(s.price==null?"—":Number(s.price).toLocaleString("ja-JP")+"円")+'</div>'+
        '<div class="section-label">参考分析（Shadow）</div>'+
        '<div class="decision shadow">'+esc(shadow)+'</div>'+
        '<div class="decision-ja">'+esc(actionLabels[shadow]||shadow)+'</div>'+
        '<div class="formal">正式判断：<b>'+esc(formal)+'</b><span>'+esc(actionLabels[formal]||formal)+'</span></div>'+
        '<div class="reference">参考シグナル：<b>'+esc(signalLabels[signal]||signal)+'</b><small>'+esc(signal)+'</small></div>'+
        '<div class="grid">'+os+'</div>'+
        '<div class="conditions"><b>次の条件</b>'+nc+'</div>'+
        '<details class="data-details"><summary>データ詳細</summary>'+
          '<div>品質：'+esc(qText)+'（'+esc(q)+'）</div>'+
          '<div>照合：'+esc(sourceReason)+'</div>'+
          '<div>Source：'+esc(s.source_evidence?.primary||"—")+' ↔ '+esc(s.source_evidence?.independent||"—")+'</div>'+
          '<div>判断データ：'+esc(fmtDate(s.as_of))+'</div>'+
          '<div class="detail-note">'+esc(s.reason_summary||"")+'</div>'+
        '</details>'+
      '</article>'
    );
  }
}

function renderHelp(d){
  const v=d.shadow_validation||{};
  const t=v.thresholds||{};
  const ready=!!v.production_candidate;

  document.getElementById("help").innerHTML=
    '<article class="help-card hero-help">'+
      '<h1>画面の見方</h1>'+
      '<p>ホームは「正式判断 → 参考分析 → 1/3/5/14日の方向 → 次の条件」の順に確認すると迷いにくくなります。</p>'+
      '<div class="help-flow"><span>① 正式判断</span><span>② 参考分析</span><span>③ 方向</span><span>④ 次の条件</span></div>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>市場環境</h2>'+
      '<p>日経平均、TOPIX、USD/JPYを個別株判断の背景確認用として表示します。市場環境は参照情報であり、この表示だけで正式判断を変更しません。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>正式判断と参考分析</h2>'+
      '<div class="help-row"><b>正式判断</b><p>実運用で採用する判定です。現在はProduction Source Contract未接続のため、検証結果を正式判断へ自動反映しません。</p></div>'+
      '<div class="help-row"><b>参考分析（Shadow）</b><p>新しい分析ロジックを本番に影響させず検証する結果です。WAIT、HOLDなどが表示されても、現段階では参考情報です。</p></div>'+
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
      '<h2>次の条件</h2>'+
      '<p><b>△</b> は監視中・未確定、<b>○</b> は条件成立、<b>×</b> は条件非成立、<b>—</b> は判定不能を表します。条件が複数ある場合は、必要条件がそろうかを確認します。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<div class="help-title-line"><h2>検証の進み具合</h2><span class="status-pill '+(ready?"ready":"pending")+'">Production '+(ready?"候補":"未達")+'</span></div>'+
      '<div class="progress-list">'+
        '<div><span>Shadow Run</span><b>'+(v.run_count??0)+' / '+(t.min_runs??20)+'</b></div>'+
        '<div><span>Source取得率</span><b>'+pct(v.source_fetch_rate)+' / '+pct(t.source_fetch_rate_min??0.95)+'</b></div>'+
        '<div><span>OHLCV一致率</span><b>'+pct(v.ohlcv_match_rate)+' / '+pct(t.ohlcv_match_rate_min??0.98)+'</b></div>'+
        '<div><span>判断比較数</span><b>'+(v.decision_sample_count??0)+' / '+(t.min_decision_samples??60)+'</b></div>'+
        '<div><span>判断一致率</span><b>'+pct(v.decision_match_rate)+' / '+pct(t.decision_match_rate_min??0.95)+'</b></div>'+
      '</div>'+
      '<p class="note">基準達成だけで自動的に正式運用へ切り替える設計ではありません。Production Source Contractの接続・確認後に移行判断します。</p>'+
    '</article>'+

    '<article class="help-card">'+
      '<h2>データ品質</h2>'+
      '<div class="help-row"><b>暫定</b><p>検証データとして表示可能ですが、正式判断には未採用です。</p></div>'+
      '<div class="help-row"><b>要確認</b><p>独立データ源との不一致などがあり、判断材料として一段慎重に扱う状態です。</p></div>'+
      '<div class="help-row"><b>確認済み</b><p>所定の品質確認を通過した状態です。</p></div>'+
    '</article>';
}

async function load(){
  try{
    const r=await fetch("data/app_snapshot.json",{cache:"no-store"});
    if(!r.ok)throw new Error("snapshot "+r.status);
    const d=await r.json();
    renderBanner(d);
    renderMarketEnvironment(d);
    renderCards(d);
    renderHelp(d);
  }catch(e){
    document.getElementById("banner").innerHTML='<div class="banner error">データ読み込みに失敗しました。通信状態を確認して再度お試しください。</div>';
  }
}

setupNav();
load();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js?v=1.4.0");
