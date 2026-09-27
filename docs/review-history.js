(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.JPReviewHistory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const SCHEMA_VERSION="0.1";
  const STORE_KEY="jpstock.deepDiveReviews.v2";
  const LEGACY_KEY="jpstock.deepDiveReviews.v1";
  const MAX_RECORDS=100;
  const MAX_BACKUP_BYTES=1024*1024;
  const UTILITY_MAP={useful:"USEFUL",reference:"REFERENCE",noise:"NOISE",USEFUL:"USEFUL",REFERENCE:"REFERENCE",NOISE:"NOISE"};
  const UTILITY_LEGACY={USEFUL:"useful",REFERENCE:"reference",NOISE:"noise"};

  function nowIso(nowMs=Date.now()){return new Date(nowMs).toISOString();}
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==="object"){
      const out={};
      for(const key of Object.keys(value).sort())out[key]=stable(value[key]);
      return out;
    }
    return value;
  }
  function stableString(value){return JSON.stringify(stable(value));}
  function parseObject(raw,label){
    if(raw==null||raw==="")return {ok:true,value:null};
    try{
      const value=JSON.parse(raw);
      if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(label+" must be an object");
      return {ok:true,value};
    }catch(e){return {ok:false,error:String(e?.message||e)};}
  }
  function loadV2(storage){
    const parsed=parseObject(storage.getItem(STORE_KEY),"review v2");
    if(!parsed.ok)return {ok:false,error:parsed.error,records:{}};
    if(parsed.value===null)return {ok:true,records:{},store:null};
    if(parsed.value.review_schema_version!==SCHEMA_VERSION||!parsed.value.records||typeof parsed.value.records!=="object"||Array.isArray(parsed.value.records)){
      return {ok:false,error:"review v2 schema is invalid",records:{}};
    }
    return {ok:true,records:parsed.value.records,store:parsed.value};
  }
  function loadLegacy(storage){
    const parsed=parseObject(storage.getItem(LEGACY_KEY),"review legacy");
    if(!parsed.ok)return {ok:false,error:parsed.error,records:{}};
    return {ok:true,records:parsed.value||{}};
  }
  function reasonSnapshot(security){
    const dd=(security?.fundamental?.deep_dive)||{};
    return (dd.reasons||[]).map(r=>({
      code:r?.code??null,metric:r?.metric??null,label:r?.label??null,
      change_pct:r?.change_pct??null,threshold_pct:r?.threshold_pct??null,severity:r?.severity??null
    }));
  }
  function triggerSignature(security){
    const dd=(security?.fundamental?.deep_dive)||{};
    const reasons=reasonSnapshot(security).map(r=>({
      code:r.code,metric:r.metric,change_pct:r.change_pct,threshold_pct:r.threshold_pct,severity:r.severity
    }));
    return stableString({
      recommended:!!dd.recommended,
      severity:dd.severity||"NONE",
      reasons,
    });
  }
  function evidenceIdentity(security){
    const f=security?.fundamental||{};
    if(f.document_id)return "EDINET:"+String(f.document_id);
    const fallback=[f.submitted_at,f.period_end,f.document_type].filter(Boolean).join("|");
    if(fallback)return "EDINET_FALLBACK:"+fallback;
    return "MARKET:"+String(security?.as_of||"unknown")+":"+String(security?.source_gate_reason||"unknown");
  }
  function unresolvedConditions(security){
    const out=[];
    const quality=String(security?.data_quality||"").toUpperCase();
    const gate=String(security?.source_gate_reason||"").toUpperCase();
    if(["ERROR","STALE","HOLD"].includes(quality))out.push("DATA_QUALITY:"+quality);
    if(gate&&gate!=="SHADOW_SOURCE_MATCH")out.push("SOURCE_GATE:"+gate);
    return out;
  }
  function contextFromSecurity(security,options={}){
    if(!security)throw new Error("security is required");
    const subjectId=String(security.security_id||security.code||"").trim();
    if(!subjectId)throw new Error("subject id is required");
    const ruleVersion=options.ruleVersion===undefined?"japan-fundamental-priority-v1":options.ruleVersion;
    return {
      market:"JAPAN",
      subject_type:"SECURITY",
      subject_id:subjectId,
      subject_code:String(security.code||""),
      subject_label:String(security.name||""),
      evidence_identity:evidenceIdentity(security),
      rule_version:ruleVersion,
      trigger_signature:triggerSignature(security),
      bundle_id:options.bundleId||null,
      priority_at_review:{
        score:security?.fundamental?.deep_dive?.priority_score??null,
        scale:"Japan fundamental deep-dive priority; not probability",
        severity:security?.fundamental?.deep_dive?.severity??null,
      },
      reason_snapshot:reasonSnapshot(security),
      unresolved_conditions:unresolvedConditions(security),
    };
  }
  function identity(context){
    return stableString({
      market:context.market,subject_type:context.subject_type,subject_id:context.subject_id,
      evidence_identity:context.evidence_identity,rule_version:context.rule_version,
      trigger_signature:context.trigger_signature,
    });
  }
  function legacyEvidence(record){
    if(record?.document_id)return "EDINET:"+String(record.document_id);
    const fallback=[record?.submitted_at,record?.period_end,record?.document_type].filter(Boolean).join("|");
    return fallback?"EDINET_FALLBACK:"+fallback:"MARKET:unknown:unknown";
  }
  function normalizeLegacy(key,record){
    const utility=UTILITY_MAP[record?.value]||null;
    return {
      review_schema_version:SCHEMA_VERSION,
      review_id:"legacy:"+String(key),
      market:"JAPAN",subject_type:"SECURITY",
      subject_id:String(record?.security_id||record?.code||""),
      subject_code:String(record?.code||""),
      subject_label:String(record?.name||""),
      evidence_identity:legacyEvidence(record),
      rule_version:null,trigger_signature:null,bundle_id:null,
      review_state:utility?"REVIEWED":"UNREVIEWED",
      utility,note:String(record?.note||"").slice(0,240),
      priority_at_review:{score:record?.priority_score??null,scale:null,severity:record?.severity??null},
      reason_snapshot:(record?.reasons||[]).map(x=>({label:String(x)})),
      unresolved_conditions:[],
      reviewed_at:record?.reviewed_at||null,
      updated_at:record?.reviewed_at||null,
      provenance:{type:"legacy-import-readonly",legacy_key:String(key),legacy_store:LEGACY_KEY},
      revision_log:[],
    };
  }
  function allLegacy(storage){
    const legacy=loadLegacy(storage);
    if(!legacy.ok)return {ok:false,error:legacy.error,records:[]};
    return {ok:true,records:Object.entries(legacy.records).map(([k,v])=>normalizeLegacy(k,v))};
  }
  function exactRecord(context,storage){
    const v2=loadV2(storage);
    if(!v2.ok)return {ok:false,error:v2.error,record:null};
    const id=identity(context);
    return {ok:true,record:v2.records[id]||null,id,records:v2.records};
  }
  function viewForContext(context,storage){
    const exact=exactRecord(context,storage);
    if(!exact.ok)return {ok:false,error:exact.error,state:"ERROR",record:null};
    if(exact.record)return {ok:true,state:exact.record.review_state||"REVIEWED",record:exact.record,source:"v2"};
    const sameEvidence=Object.values(exact.records).filter(r=>
      r&&r.market===context.market&&r.subject_id===context.subject_id&&r.evidence_identity===context.evidence_identity
    );
    if(sameEvidence.length)return {ok:true,state:"RECHECK_REQUIRED",record:sameEvidence.sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")))[0],source:"v2"};
    const legacy=allLegacy(storage);
    if(!legacy.ok)return {ok:false,error:legacy.error,state:"ERROR",record:null};
    const match=legacy.records.find(r=>
      (r.subject_id===context.subject_id||r.subject_code===context.subject_code)&&r.evidence_identity===context.evidence_identity
    );
    if(match)return {ok:true,state:"REVIEWED_LEGACY",record:match,source:"legacy"};
    return {ok:true,state:"UNREVIEWED",record:null,source:null};
  }
  function snapshotForRevision(record){
    if(!record)return null;
    return {
      review_state:record.review_state,utility:record.utility,note:record.note,
      bundle_id:record.bundle_id,priority_at_review:record.priority_at_review,
      reason_snapshot:record.reason_snapshot,unresolved_conditions:record.unresolved_conditions,
      reviewed_at:record.reviewed_at,updated_at:record.updated_at,
    };
  }
  function saveReview(context,utility,note,storage,options={}){
    const mapped=UTILITY_MAP[utility];
    if(!mapped)throw new Error("utility is invalid");
    note=String(note||"");
    if(note.length>240)throw new Error("note exceeds 240 characters");
    const loaded=loadV2(storage);
    if(!loaded.ok){const e=new Error("既存の新形式評価履歴が壊れているため保存を中止しました");e.code="CORRUPT_STORE";throw e;}
    const id=identity(context),records={...loaded.records},previous=records[id]||null;
    if(!previous&&Object.keys(records).length>=MAX_RECORDS){
      const e=new Error("評価履歴が100件に達しています。バックアップ後に整理してください。古い記録は自動削除しません。");
      e.code="CAPACITY_LIMIT";throw e;
    }
    const ts=options.nowIso||nowIso(options.nowMs);
    const history=Array.isArray(previous?.revision_log)?[...previous.revision_log]:[];
    if(previous)history.push(snapshotForRevision(previous));
    const record={
      review_schema_version:SCHEMA_VERSION,review_id:id,
      market:context.market,subject_type:context.subject_type,subject_id:context.subject_id,
      subject_code:context.subject_code,subject_label:context.subject_label,
      evidence_identity:context.evidence_identity,rule_version:context.rule_version,
      trigger_signature:context.trigger_signature,bundle_id:context.bundle_id||null,
      review_state:"REVIEWED",utility:mapped,note,
      priority_at_review:context.priority_at_review,reason_snapshot:context.reason_snapshot,
      unresolved_conditions:context.unresolved_conditions||[],
      reviewed_at:previous?.reviewed_at||ts,updated_at:ts,
      provenance:previous?.provenance||{type:"user-entered",legacy_store_preserved:true},
      revision_log:history,
    };
    records[id]=record;
    const store={review_schema_version:SCHEMA_VERSION,updated_at:ts,records};
    storage.setItem(STORE_KEY,JSON.stringify(store));
    return record;
  }
  function backupObject(storage,options={}){
    const v2=loadV2(storage),legacy=allLegacy(storage);
    if(!v2.ok){const e=new Error("新形式評価履歴が壊れているためバックアップを中止しました");e.code="CORRUPT_STORE";throw e;}
    if(!legacy.ok){const e=new Error("旧形式評価履歴が壊れているためバックアップを中止しました");e.code="CORRUPT_LEGACY";throw e;}
    return {
      backup_schema_version:"review-history-backup/0.1",
      created_at:options.nowIso||nowIso(options.nowMs),
      market:"JAPAN",
      records:[...Object.values(v2.records),...legacy.records],
      counts:{v2:Object.keys(v2.records).length,legacy:legacy.records.length},
      contains_personal_notes:true,
      public_upload_allowed:false,
    };
  }
  function backupText(storage,options={}){return JSON.stringify(backupObject(storage,options),null,2)+"\n";}
  function inspectImport(text,storage){
    if(typeof text!=="string"||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw new Error("バックアップファイルが大きすぎます");
    let data;
    try{data=JSON.parse(text);}catch(_){throw new Error("バックアップJSONが不正です");}
    if(data?.backup_schema_version!=="review-history-backup/0.1"||data?.market!=="JAPAN"||!Array.isArray(data.records))throw new Error("対応していないバックアップ形式です");
    const loaded=loadV2(storage);
    if(!loaded.ok)throw new Error("端末の新形式評価履歴が壊れているため復元を中止しました");
    const incoming={},invalid=[];
    for(const raw of data.records){
      if(!raw||raw.review_schema_version!==SCHEMA_VERSION||typeof raw.review_id!=="string"||!raw.review_id){invalid.push(raw);continue;}
      incoming[raw.review_id]=raw;
    }
    if(invalid.length)throw new Error("バックアップに不正な評価記録があります");
    let add=0,same=0,conflict=0;
    for(const [id,record] of Object.entries(incoming)){
      if(!loaded.records[id])add++;
      else if(stableString(loaded.records[id])===stableString(record))same++;
      else conflict++;
    }
    if(Object.keys(loaded.records).length+add>MAX_RECORDS)throw new Error("復元すると100件を超えます。既存記録を自動削除しません。");
    return {data,incoming,existing:loaded.records,add,same,conflict,total_incoming:Object.keys(incoming).length};
  }
  function applyImport(preview,storage,options={}){
    const latest=loadV2(storage);
    if(!latest.ok)throw new Error("復元直前に端末履歴を読み込めませんでした");
    if(stableString(latest.records)!==stableString(preview.existing))throw new Error("復元確認後に端末履歴が変わったため中止しました");
    const records={...latest.records};
    for(const [id,record] of Object.entries(preview.incoming))if(!records[id])records[id]=record;
    const ts=options.nowIso||nowIso(options.nowMs);
    storage.setItem(STORE_KEY,JSON.stringify({review_schema_version:SCHEMA_VERSION,updated_at:ts,records}));
    return {added:preview.add,skipped_same:preview.same,skipped_conflict:preview.conflict};
  }
  function reportRows(storage){
    const v2=loadV2(storage),legacy=allLegacy(storage);
    if(!v2.ok||!legacy.ok)return {ok:false,error:v2.error||legacy.error,records:[]};
    return {ok:true,records:[...Object.values(v2.records),...legacy.records].sort((a,b)=>String(b.updated_at||b.reviewed_at||"").localeCompare(String(a.updated_at||a.reviewed_at||"")))};
  }
  function legacyUtility(value){return UTILITY_LEGACY[value]||"";}

  return {
    SCHEMA_VERSION,STORE_KEY,LEGACY_KEY,MAX_RECORDS,
    contextFromSecurity,identity,loadV2,loadLegacy,viewForContext,saveReview,
    backupObject,backupText,inspectImport,applyImport,reportRows,legacyUtility,
  };
});
