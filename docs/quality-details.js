/* Read-only quality drilldown. Uses the existing validated display model. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JPQualityDetails=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const TITLES=Object.freeze({sources:'独立データ照合',issues:'要確認・未確認',qc:'共通の品質検査',freshness:'データの鮮度',formal:'正式売買への利用',schedule:'次回再判定の予定'});
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const value=v=>typeof v==='string'&&v!==''?v:typeof v==='number'&&Number.isFinite(v)?String(v):'未確認';
  const list=v=>Array.isArray(v)?v:[];
  const state=v=>({PASS:'一致',FAIL:'要確認',PENDING:'未確認',PROVISIONAL:'暫定',WARN:'注意',SHADOW:'SHADOW（参考分析）',BLOCKED:'保留',MISSING:'未実装',PARTIAL:'部分実装',IMPLEMENTED:'実装済み'}[v]||value(v));
  const source=v=>({YFINANCE_REFERENCE:'Yahoo Finance（参考）',KABUTAN:'株探',MONEX_SCOUTER:'マネックス',INVESTING:'Investing.com'}[v]||value(v));
  const reason=v=>({SHADOW_SOURCE_MATCH:'独立データ照合一致',HIGH_MISMATCH:'高値データ差異あり',LOW_MISMATCH:'安値データ差異あり',OPEN_MISMATCH:'始値データ差異あり',CLOSE_MISMATCH:'終値データ差異あり',VOLUME_MISMATCH:'出来高データ差異あり',DATE_MISMATCH:'基準日不一致',PRIMARY_FETCH_FAILED:'主データの取得失敗',INDEPENDENT_SOURCE_UNAVAILABLE:'独立データを取得できません'}[v]||value(v));
  const pairs=rows=>'<dl class="qd-facts">'+rows.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(value(v))+'</dd></div>').join('')+'</dl>';
  const para=t=>'<p class="qd-text">'+esc(t)+'</p>';
  function stamp(v){
    if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v))return '未確認';
    const d=new Date(v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)+' JST':'未確認';
  }
  function stockEvidence(r){
    const s=r.source||{},e=s.source_evidence||{},diff=e.diffs||{};
    const fields=[['open','始値差'],['high','高値差'],['low','安値差'],['close','終値差'],['volume','出来高差']];
    return '<section class="qd-evidence"><h3>'+esc(r.name)+' <small>'+esc(r.code)+'</small></h3>'+pairs([
      ['照合結果',state(r.check)],['基準日',s.as_of],['主データ',source(e.primary)],['独立データ',source(e.independent)],
      ['記録された理由',reason(s.source_gate_reason)],['データ区分',state(s.data_quality)]
    ])+'<details><summary>項目別の差分（保存値）</summary>'+pairs(fields.map(([key,label])=>[label,diff[key]]))+para('差分は保存された値をそのまま表示しています。欠損は0に補完せず、この画面で再照合・再判定しません。')+'</details></section>';
  }
  function relatedEvidence(m,c){
    if(!m.cMatch||!c)return para('同一版の共通品質情報を確認できないため、関連する根拠は表示できません。');
    return list(c.decision_items).filter(x=>x&&typeof x==='object'&&list(m.rows).some(r=>x.subject_id==='SEC_JP_'+r.code)).map(x=>{
      const rows=[];
      list(x.reason_summary).forEach(t=>{if(typeof t==='string')rows.push(['判断理由（保存文）',t]);});
      for(const [key,label] of [['blocking_conditions','利用を保留する条件'],['risk_conditions','注意・リスク条件']]){
        list(x[key]).forEach(t=>{if(t&&typeof t.label==='string')rows.push([label+' ['+value(t.status)+']',t.label]);});
      }
      if(!rows.length)return '';
      return '<section class="qd-evidence"><h3>'+esc(value(x.subject_label))+'</h3>'+pairs(rows)+'</section>';
    }).join('')||para('関連する理由・条件は保存されていません。原因を推測で補完しません。');
  }
  function detailHtml(kind,m,common){
    if(!Object.prototype.hasOwnProperty.call(TITLES,kind)||!m)return '';
    const d=m.d||{},c=m.cMatch&&common?common:null,n=list(m.rows).length;
    let body='';
    if(kind==='sources')body=para('対象'+n+'銘柄の照合結果と取得元です。照合一致は正式売買への利用許可ではありません。')+list(m.rows).map(stockEvidence).join('');
    if(kind==='issues'){
      const xs=list(m.rows).filter(r=>r.check!=='PASS');
      body=pairs([['照合要確認',m.fail],['未確認',m.pending],['対象外・識別不明',m.unexpected]])+
        para(xs.length?'下記の銘柄の基準日・取得元・理由を確認してください。':'個別銘柄の照合では要確認・未確認は0銘柄です。共通品質検査や正式利用の判定とは別です。')+
        xs.map(stockEvidence).join('')+para('照合0件でも、売買条件の価格基準・予測精度・正式系との一致まで保証するものではありません。');
    }
    if(kind==='qc')body=pairs([['保存された共通品質判定',m.qc==='PASS'?'正常（PASS）':state(m.qc)],['同一版との対応',m.cMatch?'確認済み':'未確認']])+
      para('個別の価格照合が'+n+'/'+n+'一致でも、共通品質判定は注意になり得ます。この画面では保存された判定を変更しません。')+
      para('エラーコード記録：'+(c&&list(c.incident&&c.incident.error_codes).length?list(c.incident.error_codes).map(value).join(' / '):'記録なし、または未確認'))+
      '<h3>関連する保存済みの理由・条件</h3>'+para('以下は共通データに保存された文言です。品質判定との直接の因果関係はこのデータだけでは確定できません。最新の実装進捗を示すものでもありません。')+relatedEvidence(m,c);
    if(kind==='freshness')body=pairs([['表示上の鮮度',m.freshness],['判断基準日',m.asOf],['データ生成時刻',stamp(d.updated_at)],['共通データの基準日',c&&c.timestamps&&c.timestamps.market_as_of],['共通データの生成時刻',stamp(c&&c.timestamps&&c.timestamps.calculated_at)],['保存時の鮮度区分',c&&c.data_quality&&c.data_quality.data_state]])+
      para('生成時刻は市場価格の時刻ではありません。「保存値」は上記基準日のデータです。休場日や営業日をこの画面で推測しません。');
    if(kind==='formal'){
      const migration=d.report_migration||{},v=d.shadow_validation||{};
      body=para(m.referenceOnly?'SHADOW検証中です。アプリの参考判断は正式な売買判断に未使用です。':'照合一致だけでは正式利用可能と判定しません。正式判断は銘柄詳細と正式系で確認してください。')+
        pairs([['モード',state(d.decision_mode)],['正式系（保存された識別子）',migration.formal_source],['判断比較の保存件数',v.decision_sample_count]])+
        '<h3>表示データに保存された連携状態</h3>'+pairs(list(migration.capabilities).filter(x=>x&&['same_run_identity','formal_decision'].includes(x.id)).map(x=>[value(x.label),state(x.status)]))+
        para('この状態は上記基準日の保存値です。GitHub最新コードの実装状況や現在の正式レポートの稼働状態とは区別してください。')+relatedEvidence(m,c);
    }
    if(kind==='schedule')body=pairs([['次回再判定（予定）',stamp(d.next_recheck_at)],['予備再判定（予定）',stamp(d.backup_recheck_at)],['保存済み判断の基準日',m.asOf],['保存済みデータの生成',stamp(d.updated_at)],['保存された実行状態',m.runState],['保存されたRun ID',d.latest_decision_run_id||d.run_id]])+
      para('予定時刻は実行済みの証拠ではありません。実際の実行結果・更新確認は管理タブで確認してください。');
    const warnings=list(m.notes).map(para).join('');
    return '<article class="qd-panel"><button type="button" class="qd-back" data-quality-return>‹ 品質ダイジェストへ戻る</button><h2 id="quality-detail-heading" tabindex="-1">'+TITLES[kind]+'の詳細</h2>'+para('判断基準日：'+value(m.asOf))+
      (warnings?'<div class="dx-warning" role="status">'+warnings+'</div>':'')+body+
      '<button type="button" class="dx-secondary dx-wide" data-dx-view="manage-view">管理タブで更新状態を確認 ›</button>'+para('表示のみです。タップだけで更新実行・外部送信・売買注文は行いません。')+'</article>';
  }
  function createController(w){
    const doc=w.document,view=doc.getElementById('quality-view'),digest=doc.getElementById('quality-digest'),legacy=doc.getElementById('data-quality');
    if(!view||!digest)return {update(){}};
    let screen=doc.getElementById('quality-detail-screen');
    if(!screen){screen=doc.createElement('section');screen.id='quality-detail-screen';screen.hidden=true;view.appendChild(screen);}
    let active=null,lastModel=null,lastCommon=null,returnScroll=0;
    function paint(focus){
      if(!active||!lastModel)return;
      const markup=detailHtml(active,lastModel,lastCommon);
      const focused=screen.contains(doc.activeElement);
      if(screen.innerHTML!==markup)screen.innerHTML=markup;
      screen.hidden=false;digest.hidden=true;if(legacy)legacy.hidden=true;
      if((focus||focused)&&!view.hidden){doc.getElementById('quality-detail-heading').focus({preventScroll:true});if(focus)w.scrollTo({top:0,behavior:'instant'});}
    }
    function close(focus){
      const old=active;active=null;screen.hidden=true;digest.hidden=false;if(legacy)legacy.hidden=false;
      if(focus){const b=digest.querySelector('[data-quality-detail="'+old+'"]');if(b)b.focus({preventScroll:true});w.scrollTo({top:returnScroll,behavior:'instant'});}
    }
    doc.addEventListener('click',e=>{
      const t=e.target&&e.target.closest?e.target.closest('[data-quality-detail], [data-quality-return], .primary-nav [data-view]'):null;
      if(!t)return;
      if(t.matches('.primary-nav [data-view]')){if(active)close(false);return;}
      if(t.hasAttribute('data-quality-return')){close(true);return;}
      const key=t.getAttribute('data-quality-detail');
      if(!Object.prototype.hasOwnProperty.call(TITLES,key)||!lastModel)return;
      returnScroll=w.scrollY;active=key;paint(true);
    });
    doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!view.hidden){e.preventDefault();close(true);}});
    return {update(m,c){lastModel=m;lastCommon=c;if(active)paint(false);}};
  }
  return {TITLES,detailHtml,createController};
});
