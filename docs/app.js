const arrows={STRONG_UP:'↑↑',UP:'↑',NEUTRAL:'→',DOWN:'↓',STRONG_DOWN:'↓↓'};
async function load(){try{
 const r=await fetch('data/app_snapshot.json',{cache:'no-store'}); const d=await r.json();
 const marketStatus=d.market_run_status||d.run_status||'—'; const latest=d.latest_decision_as_of||null;
 document.getElementById('meta').textContent=latest?`判断 ${latest} / ${marketStatus}`:marketStatus;
 const mode=d.decision_mode==='SHADOW'?'検証モード':'正式モード';
 let msg=d.market_message||'';
 if(marketStatus==='NO_NEW_TARGET') msg=latest?`本日は休場日です。直近判断 ${latest} を表示しています。`:'本日は休場日です。直近判断はまだありません。';
 if(marketStatus==='RUN_UNCONFIRMED') msg=latest?`市場日判定未確認。直近判断 ${latest} を表示しています。`:'市場日判定未確認。直近判断はまだありません。';
 document.getElementById('banner').innerHTML=`<div class="banner"><b>${mode}</b><br>${msg}<br><small>市場Run: ${d.market_run_id||d.run_id||'—'} / 判断Run: ${d.latest_decision_run_id||d.run_id||'—'}</small></div>`;
 const cards=document.getElementById('cards'); cards.innerHTML='';
 if(!d.securities?.length){cards.innerHTML='<div class="card">直近の銘柄判断はまだありません。次の営業日Run後に表示されます。</div>'; return;}
 for(const s of d.securities){
  const os=['1','3','5','14'].map(h=>`<div class="h">${h}日<div class="arrow">${arrows[s.outlook?.[h]?.direction]||'—'}</div><small>${s.outlook?.[h]?.confidence||''}</small></div>`).join('');
  const nc=(s.next_conditions||[]).map(x=>`<div>${x.status==='PENDING'?'△':x.status==='NOT_AVAILABLE'?'—':'×'} ${x.label}</div>`).join('')||'<div>追加条件なし</div>';
  cards.insertAdjacentHTML('beforeend',`<article class="card"><div class="top"><div><div class="code">${s.code}</div><h2>${s.name}</h2></div><div class="quality">${s.data_quality}</div></div><div class="price">${s.price==null?'—':s.price.toLocaleString('ja-JP')+'円'}</div><div>参考分析</div><div class="decision shadow">${s.shadow_action||'WAIT'}</div><div class="formal">正式判断：${s.formal_decision}</div><div>参考：${s.reference_signal}</div><div class="grid">${os}</div><div class="conditions"><b>次の条件</b>${nc}</div><div class="quality">${s.reason_summary||''}<br>${s.source_gate_reason||''}<br>${s.source_evidence?.primary||'—'} ↔ ${s.source_evidence?.independent||'—'}<br>判断データ ${s.as_of||'—'}</div></article>`);
 }}catch(e){document.getElementById('banner').innerHTML='<div class="banner">データ読み込みに失敗しました。</div>';}}
load(); if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
