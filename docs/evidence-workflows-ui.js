/* Two explicit user-driven workflows; read-only until a separate copy/save gesture. */
(function(w){
  'use strict';
  if(!w||!w.document)return;
  const doc=w.document,E=w.JPEvidenceWorkflows,U=w.JPActiveUniverse,D=w.JPDecisionExperience;
  if(!E||!U||!D||typeof w.renderAll!=='function'||w.JPEvidenceWorkflowsInstalled)return;
  w.JPEvidenceWorkflowsInstalled=true;
  let lastD=null,lastC=null,revision=0,request=0,returnElement=null,resultText='';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=doc.createElement('dialog');dialog.className='aw-dialog';dialog.id='analysis-workspace';dialog.setAttribute('aria-labelledby','aw-heading');
  dialog.innerHTML='<button type="button" class="aw-close" data-aw-close>閉じる ×</button><h2 id="aw-heading" tabindex="-1"></h2><p id="aw-status" role="status" aria-live="polite"></p><p id="aw-evidence-note"></p><div id="aw-result" hidden><div class="aw-actions"><button type="button" class="dx-primary" data-aw-copy>依頼文とデータをコピー</button><button type="button" class="dx-secondary" data-aw-save>全文をテキスト保存</button></div><a class="aw-chat" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPTを開く ›</a><p>コピーした文章を貼り付けて送信してください。自動送信はしません。</p><details id="aw-preview"><summary>送る内容を確認・手動コピー</summary><label for="aw-text">依頼文と公開データ（省略なし）</label><textarea id="aw-text" readonly rows="9"></textarea></details></div><p class="aw-note">私的保有数量・取得単価・口座・端末メモ・認証情報は収集しません。</p>';
  doc.body.appendChild(dialog);
  const el=id=>doc.getElementById(id);
  function model(){return D.makeModel(lastD,lastC,{now:new Date(),sourceState:typeof w.sourceCheckState==='function'?w.sourceCheckState:()=> 'PENDING',offline:w.navigator.onLine===false,loadFailed:!!doc.querySelector('#banner .error'),deadline:typeof w.updateDeadlineState==='function'?w.updateDeadlineState(lastD):null});}
  function decorate(){
    const hub=doc.querySelector('.dx-consult');
    if(hub&&!hub.querySelector('.aw-hub'))hub.innerHTML='<div class="aw-hub"><h3>ChatGPTで調査・解析</h3><button type="button" class="dx-primary aw-wide" data-aw-diagnose>データ不備を調べる</button><p>取得元・差分・品質の根拠から、原因と直し方を調査します。</p><label for="aw-security-select">さらに解析する銘柄</label><select id="aw-security-select">'+U.CODES.map((c,i)=>'<option value="'+c+'">'+esc(U.NAMES[i])+'</option>').join('')+'</select><button type="button" class="dx-secondary aw-wide" data-aw-analysis="selected">選んだ銘柄を詳しく解析</button><p>公開履歴・テクニカル・財務で独立評価。期間と件数を確認して渡します。</p><small>① 用途を選ぶ → ② 内容をコピー → ChatGPTへ貼り付け</small></div>';
    doc.querySelectorAll('.dx-stock [data-dx-copy]').forEach(b=>{b.setAttribute('data-aw-analysis',b.getAttribute('data-dx-copy'));b.removeAttribute('data-dx-copy');b.textContent='この銘柄を詳しく解析';});
    doc.querySelectorAll('.stock-card[data-stock]').forEach(card=>{
      if(card.querySelector('[data-aw-analysis]'))return;
      const b=doc.createElement('button');b.type='button';b.className='dx-secondary aw-wide';b.setAttribute('data-aw-analysis',card.dataset.stock);b.textContent='この銘柄を詳しく解析';
      const body=card.querySelector('.stock-accordion-body');if(body)body.prepend(b);
    });
    const q=doc.querySelector('.dx-quality-digest');
    if(q&&!q.querySelector('[data-aw-diagnose]')){const b=doc.createElement('button');b.type='button';b.className='dx-secondary aw-wide';b.setAttribute('data-aw-diagnose','');b.textContent='データ不備の調査文を作る';q.appendChild(b);}
  }
  const legacy=w.renderAll;
  w.renderAll=function(d,c){lastD=d;lastC=c;revision++;const out=legacy.call(this,d,c);decorate();if(dialog.open&&resultText){resultText='';el('aw-result').hidden=true;el('aw-status').textContent='表示データが更新されました。閉じて、もう一度作成してください。';request++;}return out;};
  // Internal legacy refreshes (offline/errors) also rebuild the summary without renderAll.
  for(const id of ['today-overview','quality-digest','cards']){const target=el(id);if(target)new MutationObserver(decorate).observe(target,{childList:true,subtree:true});}
  function finishClose(){request++;resultText='';if(returnElement&&returnElement.isConnected)returnElement.focus({preventScroll:true});}
  dialog.addEventListener('close',finishClose);
  async function boundedFetch(path,opts){
    if(!/^data\/(?:publication_manifest|app_snapshot|common_snapshot|(?:charts|deep_dive)\/\d{4})\.json\?t=\d+$/.test(path))throw Error('UNAPPROVED_PATH');
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
    try{
      const r=await w.fetch(path,{...opts,method:'GET',credentials:'omit',signal:c.signal});
      const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>3000000)throw Error('RESPONSE_TOO_LARGE');
      return {ok:r.ok,status:r.status,arrayBuffer:async()=>bytes.buffer};
    }finally{clearTimeout(timer);}
  }
  async function open(kind,code,button){
    if(!lastD)return;
    returnElement=button;resultText='';el('aw-result').hidden=true;el('aw-preview').open=false;el('aw-text').value='';
    el('aw-heading').textContent=kind==='diagnostic'?'データ不備の調査':'銘柄の深掘り解析';
    el('aw-status').textContent=kind==='diagnostic'?'表示中の調査根拠をまとめています。':'公開版・SHA-256・銘柄・表示日時を検証しています。';
    el('aw-evidence-note').textContent='';if(!dialog.open)dialog.showModal();el('aw-heading').focus();
    const id=++request,rev=revision,m=model(),identity=JSON.stringify(E.snapshotIdentity(lastD));
    try{
      let text,note;
      if(kind==='diagnostic'){
        text=E.diagnosisText(m);note='保存中の取得元・差分・品質理由・条件を出力します。manifest再取得・ハッシュ検査・Actionsログ調査は未実施と記録します。';
      }else{
        if(!U.CODES.includes(code))throw Error('ACTIVE_SECURITY_MISSING');
        const built=await E.prepareAnalysis(m,code,w.JPDeepDiveBundle,{fetchImpl:boundedFetch,attempts:2});
        text=built.text;note='履歴 '+built.history.history_rows+'行 ／ '+built.history.history_start+'〜'+built.history.history_end+'。公開履歴付きデータであり、全計算履歴ではありません。';
      }
      if(id!==request||!dialog.open)return;
      if(rev!==revision||identity!==JSON.stringify(E.snapshotIdentity(lastD)))throw Error('DISPLAY_CHANGED');
      resultText=text;el('aw-text').value=text;el('aw-result').hidden=false;el('aw-evidence-note').textContent=note;
      el('aw-status').textContent='作成済み。内容を確認してコピーしてください（'+text.length.toLocaleString('ja-JP')+'文字）。自動送信はしていません。';
    }catch(_){
      if(id!==request||!dialog.open)return;
      resultText='';el('aw-result').hidden=true;
      el('aw-status').textContent='検証を通過できないため解析データを作成していません。通信・公開更新・画面と解析データの版違いなどを確認し、再読込後にやり直してください。';
      el('aw-evidence-note').textContent='未検証の表示要約では代用しません。「データ不備を調べる」は品質タブでも利用できます。';
    }
  }
  doc.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('[data-aw-diagnose], [data-aw-analysis], [data-aw-copy], [data-aw-save], [data-aw-close]');if(!b)return;
    if(b.hasAttribute('data-aw-close')){dialog.close();return;}
    if(b.hasAttribute('data-aw-diagnose')){open('diagnostic',null,b);return;}
    if(b.hasAttribute('data-aw-analysis')){const code=b.dataset.awAnalysis==='selected'?(el('aw-security-select')||{}).value:b.dataset.awAnalysis;open('analysis',code,b);return;}
    if(!resultText)return;
    if(b.hasAttribute('data-aw-copy')){
      const text=resultText;
      Promise.resolve().then(()=>{if(!w.navigator.clipboard)throw Error('NO_CLIPBOARD');return w.navigator.clipboard.writeText(text);}).then(()=>{
        el('aw-status').textContent='コピーしました。ChatGPTへ貼り付けて送信してください。';
      }).catch(()=>{el('aw-preview').open=true;el('aw-text').focus();el('aw-text').select();el('aw-status').textContent='コピーが許可されませんでした。下の全文を手動コピーするか、テキスト保存してください。';});
    }else if(b.hasAttribute('data-aw-save')){
      const url=URL.createObjectURL(new Blob([resultText],{type:'text/plain;charset=utf-8'}));
      const a=doc.createElement('a');a.href=url;a.download='japan-evidence-'+E.VERSION+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
  });
  if(typeof currentSnapshot!=='undefined'&&currentSnapshot){lastD=currentSnapshot;decorate();}
})(typeof window==='undefined'?null:window);
