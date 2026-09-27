const test=require('node:test');
const assert=require('node:assert/strict');
const mod=require('../docs/review-history.js');

class Storage{
  constructor(init={}){this.map=new Map(Object.entries(init));this.writes=0;this.fail=false;}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){if(this.fail)throw new Error('quota');this.writes++;this.map.set(k,String(v));}
}
const security=(overrides={})=>({
  security_id:'SEC_JP_9432',code:'9432',name:'NTT',as_of:'2026-09-25',
  data_quality:'PROVISIONAL',source_gate_reason:'SHADOW_SOURCE_MATCH',
  fundamental:{document_id:'DOC1',deep_dive:{
    recommended:true,severity:'WATCH',priority_score:30,
    reasons:[{code:'LARGE_CHANGE',metric:'operating_cf',label:'営業CF -37%',change_pct:-37,threshold_pct:30,severity:'WATCH'}]
  }},
  ...overrides
});

test('REV-T01 same evidence with changed rule/signature becomes recheck and legacy rule is not invented',()=>{
  const legacyRecord={code:'9432',name:'NTT',document_id:'DOC1',value:'useful',note:'old',reviewed_at:'2026-09-20T00:00:00Z'};
  const storage=new Storage({[mod.LEGACY_KEY]:JSON.stringify({'9432|DOC1':legacyRecord})});
  const ctx=mod.contextFromSecurity(security());
  const view=mod.viewForContext(ctx,storage);
  assert.equal(view.state,'REVIEWED_LEGACY');
  assert.equal(view.record.rule_version,null);
  const saved=mod.saveReview(ctx,'USEFUL','new',storage,{nowIso:'2026-09-27T00:00:00Z'});
  assert.equal(saved.rule_version,'japan-fundamental-priority-v1');
  const changed={...ctx,rule_version:'japan-fundamental-priority-v2'};
  const recheck=mod.viewForContext(changed,storage);
  assert.equal(recheck.state,'RECHECK_REQUIRED');
  assert.equal(storage.getItem(mod.LEGACY_KEY),JSON.stringify({'9432|DOC1':legacyRecord}));
});

test('REV-T02 copy/report operations never mark reviewed and unresolved quality remains',()=>{
  const storage=new Storage();
  const s=security({data_quality:'HOLD',source_gate_reason:'DATE_MISMATCH'});
  const ctx=mod.contextFromSecurity(s);
  assert.equal(mod.viewForContext(ctx,storage).state,'UNREVIEWED');
  mod.reportRows(storage);
  mod.backupText(storage,{nowIso:'2026-09-27T00:00:00Z'});
  assert.equal(mod.viewForContext(ctx,storage).state,'UNREVIEWED');
  const rec=mod.saveReview(ctx,'REFERENCE','',storage,{nowIso:'2026-09-27T00:00:00Z'});
  assert.equal(rec.review_state,'REVIEWED');
  assert.deepEqual(rec.unresolved_conditions,['DATA_QUALITY:HOLD','SOURCE_GATE:DATE_MISMATCH']);
});

test('REV-T03 nonrecommended context can be explicitly reviewed and unreviewed is not NOISE',()=>{
  const storage=new Storage();
  const s=security({fundamental:{document_id:'DOC2',deep_dive:{recommended:false,severity:'NONE',priority_score:0,reasons:[]}}});
  const ctx=mod.contextFromSecurity(s);
  assert.equal(mod.viewForContext(ctx,storage).record,null);
  const rec=mod.saveReview(ctx,'REFERENCE','optional review',storage,{nowIso:'2026-09-27T00:00:00Z'});
  assert.equal(rec.utility,'REFERENCE');
  assert.equal(rec.review_state,'REVIEWED');
});

test('REV-T04 corrupt store and 101st record fail closed without deletion',()=>{
  const corrupt=new Storage({[mod.STORE_KEY]:'{bad'});
  const before=corrupt.getItem(mod.STORE_KEY);
  assert.throws(()=>mod.saveReview(mod.contextFromSecurity(security()),'USEFUL','',corrupt),/壊れている/);
  assert.equal(corrupt.getItem(mod.STORE_KEY),before);
  assert.equal(corrupt.writes,0);

  const records={};
  for(let i=0;i<100;i++)records['id'+i]={review_schema_version:'0.1',review_id:'id'+i,market:'JAPAN',subject_id:'S'+i,evidence_identity:'E'+i,rule_version:'R',trigger_signature:'T'};
  const full=new Storage({[mod.STORE_KEY]:JSON.stringify({review_schema_version:'0.1',updated_at:'x',records})});
  assert.throws(()=>mod.saveReview(mod.contextFromSecurity(security()),'USEFUL','',full),/100件/);
  assert.equal(Object.keys(JSON.parse(full.getItem(mod.STORE_KEY)).records).length,100);
});

test('REV-T05 backup restore preserves existing records and skips conflicts',()=>{
  const source=new Storage();
  const ctx=mod.contextFromSecurity(security());
  const rec=mod.saveReview(ctx,'USEFUL','source note',source,{nowIso:'2026-09-27T00:00:00Z'});
  const backup=mod.backupText(source,{nowIso:'2026-09-27T01:00:00Z'});
  const targetExisting={...rec,note:'local newer'};
  const target=new Storage({[mod.STORE_KEY]:JSON.stringify({review_schema_version:'0.1',updated_at:'y',records:{[rec.review_id]:targetExisting}})});
  const preview=mod.inspectImport(backup,target);
  assert.equal(preview.add,0);assert.equal(preview.conflict,1);
  const result=mod.applyImport(preview,target,{nowIso:'2026-09-27T02:00:00Z'});
  assert.equal(result.skipped_conflict,1);
  const kept=JSON.parse(target.getItem(mod.STORE_KEY)).records[rec.review_id];
  assert.equal(kept.note,'local newer');
});

test('REV-T06 other app values and legacy purchase-like keys are untouched',()=>{
  const storage=new Storage({'india1400.purchaseProgress.v1':'PRIVATE','other.key':'KEEP'});
  const ctx=mod.contextFromSecurity(security());
  mod.saveReview(ctx,'NOISE','<script>alert(1)</script>',storage,{nowIso:'2026-09-27T00:00:00Z'});
  assert.equal(storage.getItem('india1400.purchaseProgress.v1'),'PRIVATE');
  assert.equal(storage.getItem('other.key'),'KEEP');
  const rec=mod.viewForContext(ctx,storage).record;
  assert.equal(rec.note,'<script>alert(1)</script>');
});

test('REV-T07 repeated same-day save is one record with revision log, not independent samples',()=>{
  const storage=new Storage();
  const ctx=mod.contextFromSecurity(security());
  const first=mod.saveReview(ctx,'USEFUL','a',storage,{nowIso:'2026-09-27T00:00:00Z'});
  const second=mod.saveReview(ctx,'REFERENCE','b',storage,{nowIso:'2026-09-27T01:00:00Z'});
  const loaded=mod.loadV2(storage);
  assert.equal(Object.keys(loaded.records).length,1);
  assert.equal(second.reviewed_at,first.reviewed_at);
  assert.equal(second.updated_at,'2026-09-27T01:00:00Z');
  assert.equal(second.revision_log.length,1);
  assert.equal(second.revision_log[0].utility,'USEFUL');
});
