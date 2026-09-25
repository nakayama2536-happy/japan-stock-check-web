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
  HIGH_MISMATCH:"データ差異あり",
  INDEPENDENT_SOURCE_UNAVAILABLE:"独立データ取得不可",
  PRIMARY_FETCH_FAILED:"Primaryデータ取得失敗",
  HISTORY_TOO_SHORT:"テクニカル履歴不足",
  DATE_MISMATCH:"基準日不一致",
  FIELD_MISMATCH:"データ項目差異あり"
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
const num=(v,d=2)=>v==null?"—":Number(v).toLocaleString("ja-JP",{minimumFractionDigits:d,maximumFractionDigits:d});
const ratio=v=>v==null?"—":Number(v).toFixed(2)+"倍";
const technicalLabels={
  BULLISH:"強気",IMPROVING:"改善",BEARISH:"弱気",WEAKENING:"鈍化",NEUTRAL:"中立",
  GC_NEW:"GC発生",GC_ACTIVE:"GC継続",DC_NEW:"DC発生",DC_ACTIVE:"DC継続",NONE:"なし",
  UPTREND:"上昇構造",DOWNTREND:"下降構造",HIGHER_LOW:"安値切上げ",LOWER_HIGH:"高値切下げ",RANGE:"レンジ",
  UP:"上向き",DOWN:"下向き",NOT_AVAILABLE:"判定不能"
};

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
  return order.filter(a=>counts[a]).map(a=>a+" "+counts[a]).join(" / ")||"—";
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
    '<div class="banner compact-banner">'+
      '<div class="banner-head"><div><b>'+esc(mode)+'</b><div class="banner-sub">'+esc(friendlyMessage(d,marketStatus,latest))+'</div></div>'+
      '<span class="status-pill '+(ready?"ready":"pending")+'">Production '+(ready?"候補":"未達")+'</span></div>'+
      '<div class="updated">更新 '+esc(fmtDateTime(d.updated_at||d.market_checked_at))+'</div>'+
      '<details class="technical validation-details"><summary>検証の進み具合</summary>'+
        metrics+
        '<div>市場Run：'+esc(d.market_run_id||d.run_id||"—")+'</div>'+
        '<div>判断Run：'+esc(d.latest_decision_run_id||d.run_id||"—")+'</div>'+
        '<div>判断一致率：'+esc(pct(v.decision_match_rate))+' / 目標 '+esc(pct(t.decision_match_rate_min??0.95))+'</div>'+
      '</details>'+
    '</div>';
}

function renderTodayOverview(d){
  const root=document.getElementById("today-overview");
  const items=d.securities||[];
  if(!items.length){
    root.innerHTML='<article class="overview-panel"><div class="section-heading"><div><span class="eyebrow">TODAY</span><h2>今日の要点</h2></div></div><div class="overview-empty">銘柄判断データ待ちです。</div></article>';
    return;
  }
  const issueCount=items.filter(s=>sourceCheckState(s)!=="PASS").length;
  const formalSummary=actionSummary(items,"formal_decision");
  const shadowSummary=actionSummary(items,"shadow_action");
  const rows=items.map(s=>{
    const qState=sourceCheckState(s);
    const one=s.outlook?.["1"]||{};
    return '<div class="overview-stock">'+
      '<div><b>'+esc(s.code+" "+s.name)+'</b><small>'+esc(cardQualityText(s))+'</small></div>'+
      '<div class="overview-actions"><span>正式 '+esc(s.formal_decision||"WAIT")+'</span><span>参考 '+esc(s.shadow_action||"WAIT")+'</span></div>'+
      '<div class="overview-arrow">'+(arrows[one.direction]||"—")+'<small>1日</small></div>'+
      '<span class="check-pill '+qState.toLowerCase()+'">'+qState+'</span>'+
    '</div>';
  }).join("");

  root.innerHTML='<article class="overview-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">TODAY</span><h2>今日の要点</h2></div><span class="reference-pill">約30秒確認</span></div>'+
    '<div class="overview-grid">'+
      '<div class="overview-metric"><span>正式判断</span><b>'+esc(formalSummary)+'</b></div>'+
      '<div class="overview-metric"><span>参考分析</span><b>'+esc(shadowSummary)+'</b></div>'+
      '<div class="overview-metric '+(issueCount?"warn":"ok")+'"><span>要確認</span><b>'+issueCount+'銘柄</b></div>'+
      '<div class="overview-metric"><span>判断基準日</span><b>'+esc(fmtDate(d.latest_decision_as_of))+'</b></div>'+
    '</div>'+
    '<details class="overview-list"><summary>6銘柄を一覧で確認</summary>'+rows+'</details>'+
    '<p class="overview-note">「参考分析」はShadow検証結果です。正式判断とは分けて確認してください。</p>'+
  '</article>';
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

function renderDataQuality(d){
  const root=document.getElementById("data-quality");
  const items=d.securities||[];
  if(!items.length){
    root.innerHTML="";
    return;
  }
  const states=items.map(s=>({s,state:sourceCheckState(s)}));
  const counts={PASS:0,PENDING:0,FAIL:0};
  states.forEach(x=>counts[x.state]=(counts[x.state]||0)+1);
  const issues=states.filter(x=>x.state!=="PASS");

  const summary=["PASS","PENDING","FAIL"].map(k=>
    '<div class="quality-count '+k.toLowerCase()+'"><span>'+k+'</span><b>'+counts[k]+'</b><small>/ '+items.length+'銘柄</small></div>'
  ).join("");

  const rows=states.map(({s,state})=>{
    const reason=sourceReasonLabels[s.source_gate_reason]||s.source_gate_reason||"確認待ち";
    const src=(s.source_evidence?.primary||"—")+" ↔ "+(s.source_evidence?.independent||"—");
    return '<div class="quality-row">'+
      '<div><b>'+esc(s.code+" "+s.name)+'</b><small>'+esc(reason)+'</small></div>'+
      '<span class="check-pill '+state.toLowerCase()+'">'+state+'</span>'+
      '<div class="quality-source">'+esc(src)+'</div>'+
    '</div>';
  }).join("");

  const issueHtml=issues.length
    ? '<div class="quality-alert"><div class="alert-title">確認事項 '+issues.length+'件</div>'+
      issues.map(({s,state})=>{
        const reason=sourceReasonLabels[s.source_gate_reason]||s.source_gate_reason||"確認待ち";
        return '<div class="alert-row"><span class="check-pill '+state.toLowerCase()+'">'+state+'</span><b>'+esc(s.code+" "+s.name)+'</b><span>'+esc(reason)+'</span></div>';
      }).join("")+'</div>'
    : '<div class="quality-all-clear">独立Source照合で要確認項目はありません。</div>';

  root.innerHTML='<article class="quality-panel">'+
    '<div class="section-heading"><div><span class="eyebrow">DATA QUALITY</span><h2>データ品質</h2></div><span class="reference-pill">Source照合</span></div>'+
    '<div class="quality-counts">'+summary+'</div>'+
    issueHtml+
    '<details class="quality-details"><summary>6銘柄の照合結果</summary>'+rows+'</details>'+
    '<p class="quality-note">PASSは独立Sourceとの照合結果を示します。Production Source Contractの確定や正式売買判断への採用を意味しません。</p>'+
  '</article>';
}

function technicalPanel(s){
  const t=s.technical||{};
  const l=s.levels||{};
  const has=Object.keys(t).length>0||Object.keys(l).length>0||s.weekly_trend;
  if(!has){
    return '<details class="technical-panel"><summary>テクニカル詳細</summary><div class="technical-empty">次回17:00 Runから詳細指標を表示します。</div></details>';
  }
  const row=(label,value,note="")=>'<div class="tech-row"><span>'+esc(label)+'</span><b>'+esc(value)+'</b>'+(note?'<small>'+esc(note)+'</small>':"")+'</div>';
  const trend=technicalLabels[s.weekly_trend]||s.weekly_trend||"—";
  const macd=(technicalLabels[t.macd_state]||t.macd_state||"—")+' / '+(technicalLabels[t.macd_cross_state]||t.macd_cross_state||"—");
  const structure=technicalLabels[t.price_structure]||t.price_structure||"—";
  return '<details class="technical-panel">'+
    '<summary>テクニカル詳細</summary>'+
    '<div class="tech-section"><div class="tech-title">トレンド</div>'+
      row("日足構造",structure)+
      row("週足トレンド",trend)+
    '</div>'+
    '<div class="tech-section"><div class="tech-title">移動平均</div>'+
      row("MA5",num(t.ma5,2),"円")+
      row("MA25",num(t.ma25,2),"円 / 5日傾き "+(t.ma25_slope5_pct==null?"—":Number(t.ma25_slope5_pct).toFixed(2)+"%"))+
      row("MA75",num(t.ma75,2),"円 / 5日傾き "+(t.ma75_slope5_pct==null?"—":Number(t.ma75_slope5_pct).toFixed(2)+"%"))+
    '</div>'+
    '<div class="tech-section"><div class="tech-title">モメンタム</div>'+
      row("MACD",macd,"MACD "+num(t.macd,3)+" / Signal "+num(t.macd_signal,3))+
      row("RSI14",num(t.rsi14,1))+
      row("出来高20日比",ratio(t.volume_ratio20))+
    '</div>'+
    '<div class="tech-section"><div class="tech-title">一目・価格帯</div>'+
      row("転換線",num(t.ichimoku_tenkan,2),"円")+
      row("基準線",num(t.ichimoku_kijun,2),"円")+
      row("支持線",num(l.support_1,2),"円")+
      row("抵抗線",num(l.resistance_1,2),"円")+
    '</div>'+
    '<div class="tech-note">表示値は判断時点のテクニカル確認用です。単独の売買シグナルではありません。</div>'+
  '</details>';
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
    const qText=cardQualityText(s);
    const qClass=["HOLD","ERROR","STALE"].includes(q)?"quality-hold":["FINAL","CONFIRMED"].includes(q)?"quality-ok":"quality-provisional";
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
        technicalPanel(s)+
        '<details class="data-details"><summary>判断データ</summary>'+
          '<div>基準日：'+esc(fmtDate(s.as_of))+'</div>'+
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
      '<h2>テクニカル詳細</h2>'+
      '<p>各銘柄のカードを開くと、日足・週足、MA5/25/75、MACD、RSI14、出来高20日比、一目の転換線・基準線、支持線・抵抗線を確認できます。正式判断の根拠確認用で、各指標単独では売買判断にしません。</p>'+
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
      '<div class="help-row"><b>暫定一致</b><p>独立Sourceとの値照合は一致していますが、Production Source Contract確定前なので正式判断には未採用です。</p></div>'+
      '<div class="help-row"><b>PASS</b><p>Primaryと独立Sourceの照合が一致した状態です。Production確定を意味しません。</p></div>'+
      '<div class="help-row"><b>PENDING</b><p>独立Source未取得などで照合が完了していない状態です。</p></div>'+
      '<div class="help-row"><b>FAIL</b><p>データ差異、取得失敗、更新遅延などがあり確認が必要な状態です。</p></div>'+
    '</article>';
}

async function load(){
  try{
    const r=await fetch("data/app_snapshot.json",{cache:"no-store"});
    if(!r.ok)throw new Error("snapshot "+r.status);
    const d=await r.json();
    renderBanner(d);
    renderTodayOverview(d);
    renderMarketEnvironment(d);
    renderCards(d);
    renderDataQuality(d);
    renderHelp(d);
  }catch(e){
    document.getElementById("banner").innerHTML='<div class="banner error">データ読み込みに失敗しました。通信状態を確認して再度お試しください。</div>';
  }
}

setupNav();
load();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js?v=1.4.3");
