const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=require('../docs/decision-experience.js');
function fixture(){
 const d={decision_mode:'SHADOW',latest_decision_as_of:'2026-10-02',updated_at:'2026-10-02T17:10:00+09:00',run_id:'RUN_20261002_1700',run_status:'SHADOW_COMMITTED',next_recheck_at:'2026-10-05T15:45:00+09:00',securities:ui.CODES.map((code,i)=>({code,security_id:'SEC_JP_'+code,name:'試験銘柄'+i,as_of:'2026-10-02',price:100+i,shadow_action:i===0||i===5?'WAIT':'HOLD',formal_decision:'WAIT',data_quality:'PROVISIONAL',source_gate_reason:'SHADOW_SOURCE_MATCH',next_conditions:[],outlook:{'1':{direction:'UP',confidence:'LOW',analog:{sample_count:40,median_return_pct:-1,historical_up_share_pct:40}}}}))};
 const c={market:'JAPAN',timestamps:{market_as_of:d.latest_decision_as_of,calculated_at:d.updated_at},data_quality:{data_state:'FRESH',qc_state:'WARN'},decision_items:d.securities.map(s=>({subject_id:s.security_id,as_of:s.as_of}))};
 return {d,c};
}
function model(d,c,extra={}){return ui.makeModel(d,c,{sourceState:()=> 'PASS',now:new Date('2026-10-04T04:00:00Z'),...extra});}
test('exact counts, source consistency and formal eligibility stay separate',()=>{
 const {d,c}=fixture(),m=model(d,c);
 assert.equal(m.summary,'保有継続 4 / 待機 2'); assert.equal(m.pass,6);assert.equal(m.qc,'WARN');assert.equal(m.formalText,'未連携（SHADOW）');assert.equal(m.attention,false);
 assert.match(ui.qualityHtml(m),/6\/6一致でも、正式な売買判断には使えません/);
});
test('saved FRESH is not labeled current on another calendar date',()=>{const {d,c}=fixture();assert.equal(model(d,c).freshness,'保存値 2026/10/02');});
test('missing common is never inferred from six matched sources',()=>{const {d}=fixture(),m=model(d,null);assert.equal(m.cMatch,false);assert.equal(m.freshness,'確認不能');assert.equal(m.attention,true);});
test('different common date and different generation timestamp are rejected',()=>{const {d,c}=fixture();c.timestamps.calculated_at='2026-10-01T17:10:00+09:00';assert.equal(model(d,c).cMatch,false);c.timestamps.calculated_at=d.updated_at;c.timestamps.market_as_of='2026-10-01';assert.equal(model(d,c).cMatch,false);});
test('missing/duplicate/null common rows are unbound',()=>{const {d,c}=fixture();c.decision_items[0]=null;assert.equal(model(d,c).cMatch,false);c.decision_items[0]=c.decision_items[1];assert.equal(model(d,c).cMatch,false);});
test('missing security does not become a five-of-five all clear',()=>{const {d,c}=fixture();d.securities.pop();const m=model(d,c);assert.equal(m.pass,5);assert.equal(m.pending,1);assert.equal(m.rows[5].action,'UNKNOWN');assert.equal(m.attention,true);});
test('duplicate security is not selected silently',()=>{const {d,c}=fixture();d.securities.push({...d.securities[0]});const m=model(d,c);assert.equal(m.rows[0].source,null);assert.equal(m.pass,5);});
test('unexpected security warns instead of changing the expected universe',()=>{const {d,c}=fixture();d.securities.push({code:'9999',security_id:'SEC_JP_9999'});assert.equal(model(d,c).unexpected,1);assert.equal(model(d,c).attention,true);});
test('null price and unknown action stay unknown, not zero or WAIT',()=>{const {d,c}=fixture();d.securities[0].price=null;delete d.securities[0].shadow_action;const m=model(d,c);assert.equal(m.rows[0].price,null);assert.equal(m.rows[0].action,'UNKNOWN');assert.equal(m.pending,1);assert.match(ui.rowsHtml(m),/未確認/);});
test('mismatched per-stock date is not a match',()=>{const {d,c}=fixture();d.securities[1].as_of='2026-10-01';assert.equal(model(d,c).pass,5);});
test('data failure wins over apparent hold majority',()=>{const {d,c}=fixture();const m=model(d,c,{sourceState:s=>s.code==='6841'?'FAIL':'PASS'});assert.equal(m.fail,1);assert.match(ui.summaryHtml(m),/データ確認を優先/);assert.match(ui.summaryHtml(m),/保有継続/);});
test('a single sell candidate is surfaced even with a hold majority',()=>{const {d,c}=fixture();d.securities[0].shadow_action='SELL';assert.equal(model(d,c).candidateCount,1);assert.match(ui.summaryHtml(model(d,c)),/売買候補の参考表示 1銘柄/);});
test('future dates, overdue data, offline and failed refresh are conservative',()=>{const {d,c}=fixture();assert.equal(model(d,c,{now:new Date('2026-10-01T04:00:00Z')}).attention,true);assert.match(model(d,c,{deadline:{}}).freshness,/超過/);assert.match(model(d,c,{offline:true}).freshness,/オフライン/);assert.match(model(d,c,{loadFailed:true}).freshness,/読込失敗/);});
test('common FAIL and STALE remain visible despite source agreement',()=>{const {d,c}=fixture();c.data_quality.qc_state='FAIL';c.data_quality.data_state='STALE';const m=model(d,c);assert.equal(m.attention,true);assert.match(ui.qualityHtml(m),/不合格/);assert.match(m.freshness,/古い/);});
test('summary renderer escapes text and preserves directional signs',()=>{const {d,c}=fixture();d.securities[0].name='<img src=x onerror=alert(1)>';const html=ui.rowsHtml(model(d,c));assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/aria-label="1営業日 上向き"/);assert.match(html,/dx-direction-up/);});
test('consultation is explicitly summary-only and masks SHADOW formal actions',()=>{const {d,c}=fixture(),str=ui.promptFor(model(d,c));assert.match(str,/FULL履歴ではなく/);const p=JSON.parse(str.slice(str.indexOf('{')));assert.equal(p.securities.length,6);assert.equal(p.securities[0].formal_action,null);assert.equal(p.securities[0].forecast[0].historical_median_return_pct,-1);});
test('consultation exports allowlisted data only; does not mutate inputs',()=>{const {d,c}=fixture();d.sensitive_top='PRIVATE_SENTINEL';d.securities[0].personal_record='PRIVATE_SENTINEL';d.securities[0].outlook['1'].extra='PRIVATE_SENTINEL';const before=JSON.stringify({d,c}),p=ui.promptFor(model(d,c));assert.doesNotMatch(p,/PRIVATE_SENTINEL/);assert.equal(JSON.stringify({d,c}),before);});
test('single security consultation does not include other stocks',()=>{const {d,c}=fixture(),str=ui.promptFor(model(d,c),'6841');const p=JSON.parse(str.slice(str.indexOf('{')));assert.equal(p.securities.length,1);assert.equal(p.securities[0].code,'6841');});
test('empty and malformed data produce unknown states without throwing',()=>{const m=model(null,null);assert.equal(m.pass,0);assert.equal(m.rows.length,6);assert.doesNotThrow(()=>ui.promptFor(m));const {d,c}=fixture();d.securities[0].next_conditions=[null,{label:'条件',status:'PENDING'}];assert.doesNotThrow(()=>ui.promptFor(model(d,c)));});
test('new module has no network, storage mutation or hidden prompt URL',()=>{const src=fs.readFileSync(require.resolve('../docs/decision-experience.js'),'utf8');assert.doesNotMatch(src,/\bfetch\s*\(|localStorage|indexedDB|setItem\s*\(|removeItem\s*\(/);assert.match(src,/href="https:\/\/chatgpt.com\/"/);assert.doesNotMatch(src,/chatgpt.com\/\?/);});
