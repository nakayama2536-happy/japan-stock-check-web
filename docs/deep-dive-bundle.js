(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.JPDeepDiveBundle=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const MANIFEST_PATH="data/publication_manifest.json";
  const encoder=new TextEncoder();
  const decoder=new TextDecoder();

  function normalizeCode(code){
    const value=String(code||"").trim();
    if(!/^\d{4}$/.test(value))throw new Error("銘柄コードが不正です");
    return value;
  }
  function safeDataPath(path){
    const value=String(path||"");
    return /^data\/(?:app_snapshot\.json|common_snapshot\.json|charts\/\d{4}\.json|deep_dive\/\d{4}\.json)$/.test(value);
  }
  async function sha256Hex(bytes){
    const input=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const digest=await crypto.subtle.digest("SHA-256",input);
    return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  async function fetchBytes(path,fetchImpl){
    if(path!==MANIFEST_PATH&&!safeDataPath(path))throw new Error("許可されていないデータパスです");
    const glue=path.includes("?")?"&":"?";
    const response=await fetchImpl(path+glue+"t="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw new Error(path+" の取得に失敗しました（HTTP "+response.status+"）");
    return new Uint8Array(await response.arrayBuffer());
  }
  async function fetchJson(path,fetchImpl,expectedHash=null){
    const bytes=await fetchBytes(path,fetchImpl);
    if(expectedHash){
      const actual=await sha256Hex(bytes);
      if(actual!==expectedHash)throw new Error(path+" のSHA-256が公開manifestと一致しません");
    }
    let data;
    try{data=JSON.parse(decoder.decode(bytes));}
    catch(_){throw new Error(path+" のJSONが不正です");}
    return {data,bytes};
  }
  function manifestFile(manifest,path){
    return (manifest.files||[]).find(x=>x&&x.path===path)||null;
  }
  function validatePayload(payload,manifest,subject){
    if(payload.payload_schema_version!=="0.1")throw new Error("深掘りpayloadのschemaが未対応です");
    if(payload.publication_id!==manifest.publication_id)throw new Error("深掘りpayloadのpublication_idが一致しません");
    if(String(payload.market||"")!=="JAPAN")throw new Error("市場識別が一致しません");
    if(!((payload.scope||{}).codes||[]).includes(String(subject.code)))throw new Error("選択銘柄とpayload scopeが一致しません");
    for(const source of payload.sources||[]){
      if(!safeDataPath(source.path))throw new Error("payloadに許可外のsource pathがあります");
      const item=manifestFile(manifest,source.path);
      if(!item)throw new Error("manifestにsourceがありません: "+source.path);
      if(source.required_for_bundle&&source.status!=="OK")throw new Error("必須sourceが利用できません: "+source.path);
      if(source.status==="OK"&&(source.sha256!==item.sha256||Number(source.bytes)!==Number(item.bytes))){
        throw new Error("payloadのsource情報がmanifestと一致しません: "+source.path);
      }
    }
    return true;
  }
  function jstIsoNow(nowMs=Date.now()){
    const d=new Date(nowMs+9*3600000);
    return d.toISOString().replace("Z","+09:00");
  }
  async function loadOnce(code,fetchImpl){
    const start=(await fetchJson(MANIFEST_PATH,fetchImpl)).data;
    if(start.market!=="JAPAN")throw new Error("公開manifestの市場識別が不正です");
    if(start.source_state!=="READY")throw new Error("公開データが完全な組合せではありません（"+String(start.source_state||"UNKNOWN")+"）");
    const subject=((start.deep_dive||{}).subjects||[]).find(x=>String(x.code)===code);
    if(!subject)throw new Error("選択銘柄の深掘りpayloadがmanifestにありません");
    if(!/^data\/deep_dive\/\d{4}\.json$/.test(String(subject.path||"")))throw new Error("深掘りpayload pathが不正です");
    const payload=(await fetchJson(subject.path,fetchImpl,subject.sha256)).data;
    validatePayload(payload,start,subject);
    const end=(await fetchJson(MANIFEST_PATH,fetchImpl)).data;
    if(end.publication_id!==start.publication_id){
      const err=new Error("公開データが更新途中です");
      err.code="PUBLICATION_CHANGED";
      throw err;
    }
    return {manifest:start,payload,subject};
  }
  async function loadVerifiedPayload(code,options={}){
    code=normalizeCode(code);
    const fetchImpl=options.fetchImpl||fetch;
    const attempts=Math.max(1,Math.min(3,Number(options.attempts||2)));
    let last;
    for(let i=0;i<attempts;i++){
      try{return await loadOnce(code,fetchImpl);}
      catch(e){
        last=e;
        if(e&&e.code==="PUBLICATION_CHANGED"&&i+1<attempts)continue;
        throw e;
      }
    }
    throw last||new Error("深掘りpayloadを取得できませんでした");
  }
  function buildBundle(verified,options={}){
    const {manifest,payload,subject}=verified;
    const createdAt=jstIsoNow(options.nowMs);
    const suffix=String(options.bundleNonce||Date.now());
    return {
      bundle_schema_version:"0.1",
      bundle_id:manifest.publication_id+":"+String(subject.code)+":"+suffix,
      scope:payload.scope,
      created_at:createdAt,
      publication_id:manifest.publication_id,
      versions:payload.versions,
      sources:payload.sources,
      trigger_context:payload.trigger_context,
      data_quality:payload.data_quality,
      summary:payload.summary,
      raw_data:payload.raw_data,
      local_data:null,
      local_data_note:"端末内の評価履歴・購入情報・口座情報は含めていません。",
      build_state:"READY",
    };
  }
  function analysisInstructions(){
    return [
      "画面の結論やトリガーをそのまま採用せず、RAWデータとsource inventoryを先に検証してください。",
      "日時・市場休場・鮮度・欠損・Source照合・Common blocking_conditionsを確認してください。",
      "日足・週足・MA5/25/75・一目・MACD・RSI・出来高・支持抵抗を独立評価してください。",
      "1/3/5/14日の方向表示は将来確率ではありません。テクニカルとの整合・矛盾を確認してください。",
      "EDINETは提出日・対象期間・当期/比較期・単位を確認し、利益と営業CF、EPS、財務構造の変化要因を検証してください。",
      "大幅変化はM&A・組織再編・会計基準変更・一過性損益・為替・減損等の追加確認候補を列挙し、推測で確定しないでください。",
      "外部環境や最新ニュースが影響する場合は、最新公開情報を確認して取得日時と出典を示してください。",
      "売買タイミングを検討する前に不足情報と追加で必要なチャート・保有条件等を明示し、既存BUY/ADD/HOLD/REDUCE/SELLを自動追認しないでください。"
    ];
  }
  function toMarkdown(bundle){
    const mandatory=(bundle.trigger_context||{}).mandatory_checks||[];
    return [
      "# 日本株 CHECK — ChatGPT深掘り FULL bundle",
      "",
      "Bundle ID: "+bundle.bundle_id,
      "Publication ID: "+bundle.publication_id,
      "Created JST: "+bundle.created_at,
      "Build state: "+bundle.build_state,
      "",
      "## ChatGPTへの分析依頼",
      ...analysisInstructions().map((x,i)=>(i+1)+". "+x),
      "",
      "## 今回の必須確認事項",
      ...(mandatory.length?mandatory.map(x=>"- "+x):["- 特別な追加確認事項なし。通常の品質・テクニカル・ファンダメンタル確認を実施する。"]),
      "",
      "## BUNDLE DATA",
      JSON.stringify(bundle,null,2),
    ].join("\n");
  }
  async function build(code,options={}){
    const verified=await loadVerifiedPayload(code,options);
    const bundle=buildBundle(verified,options);
    return {bundle,text:toMarkdown(bundle)};
  }

  return {MANIFEST_PATH,normalizeCode,safeDataPath,sha256Hex,validatePayload,jstIsoNow,loadVerifiedPayload,buildBundle,toMarkdown,build};
});
