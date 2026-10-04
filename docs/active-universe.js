/* Approved active scope, mirrored from Core securities config v3. No historical data mutation. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JPActiveUniverse=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const VERSION='JP-ACTIVE-20261004-v3';
  const CODES=Object.freeze(['6841','6954','3038','9432','1812']);
  const NAMES=Object.freeze(['横河電機','ファナック','神戸物産','NTT','鹿島建設']);
  function isRetired(s){
    return !!s&&s.code==='5805'&&s.security_id==='SEC_JP_5805'&&(!s.ticker||s.ticker==='5805.T');
  }
  function project(snapshot,common){
    const d=snapshot&&typeof snapshot==='object'?snapshot:{};
    // Exclude only the explicitly retired identity. Unknown/malformed/duplicate active rows survive validation.
    const scoped={...d,securities:Array.isArray(d.securities)?d.securities.filter(s=>!isRetired(s)):[]};
    const c=common&&typeof common==='object'?{...common}:null;
    if(c&&Array.isArray(c.decision_items))c.decision_items=c.decision_items.filter(x=>!(x&&x.subject_id==='SEC_JP_5805'&&(!x.ticker||x.ticker==='5805.T')));
    return {snapshot:scoped,common:c};
  }
  function updateLabels(w){
    const doc=w.document;
    const e=doc.querySelector('#portfolio-forecast .eyebrow');if(e)e.textContent=CODES.length+'銘柄比較';
    const q=doc.querySelector('#data-quality .quality-details>summary');if(q)q.textContent=CODES.length+'銘柄の照合結果を見る';
    doc.querySelectorAll('#help .help-card p').forEach(p=>{
      if(p.textContent.includes('「6銘柄を一覧で確認」'))p.textContent='判断タブで対象'+CODES.length+'銘柄の参考判断・営業日予測・照合状態を確認します。正式利用とは区別してください。';
    });
    const dest=doc.getElementById('manage-updates');
    if(dest&&!dest.querySelector('[data-active-universe-note]')){
      const p=doc.createElement('p');p.className='dx-caption';p.setAttribute('data-active-universe-note','');
      p.textContent='現在の監視対象は'+CODES.length+'銘柄（設定v3）。過去の検証集計は当時の対象銘柄を含み、現在の5銘柄だけの成績ではありません。';dest.prepend(p);
    }
  }
  function install(w){
    if(w.JPActiveUniverseInstalled||typeof w.renderAll!=='function')return;
    w.JPActiveUniverseInstalled=true;
    const render=w.renderAll;
    w.renderAll=function(d,c){const p=project(d,c);const out=render.call(this,p.snapshot,p.common);updateLabels(w);return out;};
    const cards=w.renderCards;
    if(typeof cards==='function')w.renderCards=function(d){return cards.call(this,project(d,null).snapshot);};
    const result=w.qualityResultMessage;
    if(typeof result==='function')w.qualityResultMessage=function(before){return result.call(this,before).replace('全6銘柄が一致','全'+CODES.length+'銘柄が一致');};
  }
  return {VERSION,CODES,NAMES,isRetired,project,install};
});
