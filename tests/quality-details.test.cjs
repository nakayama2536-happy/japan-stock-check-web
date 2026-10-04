const test=require('node:test'), assert=require('node:assert/strict');
const UI=require('../docs/decision-experience.js');
const Q=require('../docs/quality-details.js');
const fs=require('node:fs');
function fixture(){
 const d={decision_mode:'SHADOW',latest_decision_as_of:'2026-10-02',updated_at:'2026-10-02T22:51:40+09:00',next_recheck_at:'2026-10-05T15:45:00+09:00',run_id:'RUN_20261002_1700',run_status:'SHADOW_COMMITTED',securities:UI.CODES.map((code,i)=>({code,security_id:'SEC_JP_'+code,name:'銘柄'+i,price:4707,as_of:'2026-10-02',shadow_action:'HOLD',data_quality:'PROVISIONAL',source_gate_reason:'SHADOW_SOURCE_MATCH',source_evidence:{primary:'YFINANCE_REFERENCE',independent:'KABUTAN',crosscheck_match:true,diffs:{close:0}}}))};
 const c={market:'JAPAN',timestamps:{market_as_of:d.latest_decision_as_of,calculated_at:d.updated_at},data_quality:{qc_state:'WARN',data_state:'FRESH'},decision_items:d.securities.map(s=>({subject_id:s.security_id,subject_label:s.name,as_of:s.as_of,reason_summary:['保存された参考分析の理由'],blocking_conditions:[{label:'Production Source Contract未確定',status:'BLOCKED'}]}))};
 return {d,c,model:()=>UI.makeModel(d,c,{now:new Date('2026-10-04T05:00:00Z'),sourceState:s=>s.source_evidence.crosscheck_match?'PASS':'FAIL'})};
}
test('six digest tiles are actual buttons with named details, not clickable divs',()=>{
 const {model}=fixture(),s=UI.qualityHtml(model());
 assert.equal((s.match(/data-quality-detail=/g)||[]).length,6);
 for(const k of Object.keys(Q.TITLES))assert.ok(s.includes('data-quality-detail="'+k+'"'));
 assert.equal((s.match(/aria-controls="quality-detail-screen"/g)||[]).length,6);
});
for(const kind of Object.keys(Q.TITLES))test('renders bounded read-only '+kind+' details',()=>{
 const {d,c,model}=fixture(),before=JSON.stringify([d,c]),s=Q.detailHtml(kind,model(),c);
 assert.ok(s.includes(Q.TITLES[kind]+'の詳細'));assert.ok(s.includes('品質ダイジェストへ戻る'));assert.ok(s.includes('表示のみ'));
 assert.equal(JSON.stringify([d,c]),before);assert.ok(!s.includes('正式利用可能です'));
});
test('unknown key and no model cannot open a fabricated panel',()=>{
 assert.equal(Q.detailHtml('__proto__',{},{}),'');assert.equal(Q.detailHtml('sources',null,{}),'');
});
test('source detail keeps stored zero, distinguishes missing, and names actual sources',()=>{
 const {c,model}=fixture(),s=Q.detailHtml('sources',model(),c);
 assert.ok(s.includes('Yahoo Finance（参考）'));assert.ok(s.includes('株探'));assert.ok(s.includes('<dt>終値差</dt><dd>0</dd>'));assert.ok(s.includes('<dt>高値差</dt><dd>未確認</dd>'));
});
test('zero issues is not a global all-clear',()=>{
 const {c,model}=fixture(),s=Q.detailHtml('issues',model(),c);
 assert.ok(s.includes('0銘柄'));assert.ok(s.includes('予測精度'));assert.ok(s.includes('正式系との一致まで保証するものではありません'));
});
test('WARN surfaces related saved reasons but does not invent a causal conclusion',()=>{
 const {c,model}=fixture(),s=Q.detailHtml('qc',model(),c);
 assert.ok(s.includes('注意'));assert.ok(s.includes('Production Source Contract未確定'));
 assert.ok(s.includes('直接の因果関係'));assert.ok(s.includes('最新の実装進捗を示すものでもありません'));
});
test('unbound common data cannot be displayed as matched evidence',()=>{
 const {c,model}=fixture(),m=model();m.cMatch=false;
 const s=Q.detailHtml('qc',m,c);assert.ok(s.includes('表示できません'));assert.ok(!s.includes('Production Source Contract未確定'));
});
test('schedule is separate from execution and missing timestamps are not epoch',()=>{
 const {d,c,model}=fixture();d.next_recheck_at=null;
 const s=Q.detailHtml('schedule',model(),c);assert.ok(s.includes('実行済みの証拠ではありません'));assert.ok(s.includes('未確認'));assert.ok(!s.includes('1970'));
});
test('malformed dates and no offset do not acquire JST by inference',()=>{
 const {d,c,model}=fixture();d.backup_recheck_at='2026-10-05T16:00:00';
 assert.ok(Q.detailHtml('schedule',model(),c).includes('<dt>予備再判定（予定）</dt><dd>未確認</dd>'));
});
test('SHADOW formal action remains unused, regardless of source consistency',()=>{
 const {d,c,model}=fixture();d.report_migration={formal_source:'SCHEDULED_REPORT_1700',capabilities:[{id:'formal_decision',label:'正式判断',status:'BLOCKED'}]};d.shadow_validation={decision_sample_count:0};
 const s=Q.detailHtml('formal',model(),c);assert.ok(s.includes('未使用'));assert.ok(s.includes('SCHEDULED_REPORT_1700'));assert.ok(s.includes('保留'));assert.ok(s.includes('<dd>0</dd>'));
});
test('hostile saved strings are escaped and arbitrary/private fields are not rendered',()=>{
 const {d,c,model}=fixture();d.securities[0].name='<img src=x onerror=alert(1)>';c.decision_items[0].reason_summary=['<script>bad()</script>'];d.token='PRIVATE_SENTINEL';d.securities[0].quantity='PRIVATE_SENTINEL';
 const a=Q.detailHtml('sources',model(),c),b=Q.detailHtml('qc',model(),c);
 assert.ok(!a.includes('<img'));assert.ok(b.includes('&lt;script&gt;'));assert.ok(!a.includes('PRIVATE_SENTINEL'));
});
test('offline/load errors persist in every detail screen',()=>{
 const {c,model}=fixture(),m=model();m.notes=['再読込に失敗しました。','通信がありません。'];
 for(const k of Object.keys(Q.TITLES))assert.ok(Q.detailHtml(k,m,c).includes('再読込に失敗しました。'));
});
test('new feature has no network or storage write or clipboard access',()=>{
 const s=fs.readFileSync(require.resolve('../docs/quality-details.js'),'utf8');
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|caches\.|clipboard|sendBeacon/.test(s));
});
