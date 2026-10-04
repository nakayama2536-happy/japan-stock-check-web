const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../docs/audit-context.js'),E=require('../docs/evidence-workflows.js'),D=require('../docs/decision-experience.js'),T=require('../docs/evidence-transfer.js');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
function model(){
 const d=read('docs/data/app_snapshot.json');
 // Explicit legacy fixture: do not assume future publications will lack evidence.
 for(const s of d.securities||[]){delete s.audit_context;delete s.policy_context;}
 return D.makeModel(d,read('docs/data/common_snapshot.json'),{now:new Date('2026-10-04T06:32:05Z'),sourceState:s=>s.source_evidence?.crosscheck_match?'PASS':'PENDING'});
}
function addAudit(s,run){
 s.policy_context={security_id:s.security_id,policy_code:'AUDIT_TEST_PUBLIC',label:'公開試験方針',objective:'条件を確認',focus:['MACD','週足']};
 s.audit_context={schema_version:'1.0',run_id:run,as_of:s.as_of,security_id:s.security_id,conditions_source:'decision.next_conditions',conditions_state:'RECORDED',condition_count:5,display_limit:3,policy_source:'decision.policy_context',policy_state:'RECORDED',conditions:[
  {label:'成立済み',status:'PASS',required:true,purpose:'ENTRY'},
  {label:'任意条件',status:'PENDING',required:false,purpose:'ADD'},
  {label:'縮小条件',status:'PENDING',required:true,purpose:'REDUCE'},
  {label:'売却条件',status:'NOT_AVAILABLE',required:true,purpose:'SELL'},
  {label:'4件目以降も残す',status:'PENDING',required:true,purpose:'ENTRY'}
 ]};return s;
}
function pair(){const m=model(),r=m.rows.find(x=>x.code==='6841');addAudit(r.source,m.d.run_id);
 const manifest=read('docs/data/publication_manifest.json'),subject=manifest.deep_dive.subjects.find(x=>String(x.code)==='6841'),payload=read('docs/'+subject.path);
 addAudit(payload.raw_data.security,m.d.run_id);return {m,r,v:{manifest,subject,payload}};
}
const unpack=t=>JSON.parse(t.slice(t.indexOf('\n{')+1));
test('legacy absence stays NOT_RECORDED without config or Common backfill',()=>{
 const m=model(),before=JSON.stringify(m),p=E.diagnosticPayload(m);
 assert(p.securities.every(x=>x.saved_fields.audit_context.availability==='NOT_RECORDED'));
 assert(p.securities.every(x=>x.saved_fields.audit_context.policy_state==='NOT_RECORDED'));
 assert.equal(JSON.stringify(m),before);
});
for(const [value,expected] of [[undefined,'NOT_RECORDED'],[null,'NULL'],[{},'EMPTY'],[{label:null},'RECORDED']])test('policy field state '+expected,()=>{
 const s={};if(value!==undefined)s.policy_context=value;
 assert.equal(A.project(s).policy_state,expected);
});
test('all evaluated rows including PASS and SELL reach full investigation and analysis',()=>{
 const {m,r,v}=pair(),before=JSON.stringify([m,v]),d=E.diagnosticPayload(m),a=E.analysisPayload(m,'6841',v);
 for(const s of [d.securities.find(x=>x.code==='6841').saved_fields,a.security]){
  assert.deepEqual(s.audit_context.conditions,r.source.audit_context.conditions);
  assert.equal(s.audit_context.condition_count,5);assert.equal(s.audit_context.validation_state,'MATCHED');
  assert.equal(s.audit_context.conditions[1].required,false);assert.equal(s.policy_context.policy_code,'AUDIT_TEST_PUBLIC');
 }
 assert.equal(JSON.stringify([m,v]),before);
});
for(const [name,damage] of [
 ['run',a=>a.run_id='OTHER'],['date',a=>a.as_of='2026-10-01'],['security',a=>a.security_id='SEC_JP_9432'],
 ['count',a=>a.condition_count=3],['boolean count',a=>a.condition_count=true],['schema',a=>a.schema_version='2'],
 ['state',a=>a.conditions_state='EMPTY'],['policy state',a=>a.policy_state='NULL'],
 ['source',a=>a.conditions_source='newest config'],['required type',a=>a.conditions[0].required='false']
])test('misbound '+name+' is exported as INVALID for diagnosis but rejected for analysis',()=>{
 const {m,r,v}=pair();damage(r.source.audit_context);damage(v.payload.raw_data.security.audit_context);
 const p=E.diagnosticPayload(m).securities.find(x=>x.code==='6841').saved_fields.audit_context;
 assert.equal(p.validation_state,'INVALID');assert(p.validation_errors.length);
 assert.throws(()=>E.analysisPayload(m,'6841',v),/AUDIT_CONTEXT_INVALID/);
});
test('audit difference between display and bundle is rejected even if price is the same',()=>{
 const {m,v}=pair();v.payload.raw_data.security.audit_context.conditions[4].label='different';
 assert.throws(()=>E.analysisPayload(m,'6841',v),/DISPLAY_SECURITY_MISMATCH/);
});
test('explicit empty conditions does not become absent or claim no risk',()=>{
 const {m,r}=pair();r.source.audit_context.conditions=[];r.source.audit_context.condition_count=0;r.source.audit_context.conditions_state='EMPTY';
 const p=E.diagnosticPayload(m).securities.find(x=>x.code==='6841').saved_fields.audit_context;
 assert.equal(p.conditions_state,'EMPTY');assert.deepEqual(p.conditions,[]);assert.equal(p.condition_count,0);
});
test('unknown private nested fields are excluded from exported receipt',()=>{
 const {m,r,v}=pair();for(const s of [r.source,v.payload.raw_data.security]){s.audit_context.secret='PRIVATE_SENTINEL';s.audit_context.conditions[0].shares='PRIVATE_SENTINEL';s.policy_context.account='PRIVATE_SENTINEL';}
 assert(!E.diagnosisText(m).includes('PRIVATE_SENTINEL'));assert(!E.analysisText(m,'6841',v).includes('PRIVATE_SENTINEL'));
});
test('new five-stock evidence retains full audit and useful copy within 8000',async()=>{
 const m=model();for(const r of m.rows)addAudit(r.source,m.d.run_id);
 const full=E.diagnosisText(m),result=await T.prepare(full),p=unpack(result.briefText);
 console.log('AUDIT_TRANSFER',JSON.stringify({full:full.length,brief:result.briefText.length,mode:result.mode}));
 assert(result.briefText.length<=8000);assert.equal(result.mode,'BRIEF_WITH_FULL_EVIDENCE');
 assert.equal(p.audit_coverage[0].status.state,'MATCHED');assert.equal(p.audit_coverage[0].rows.length,5);
 assert(p.audit_coverage[0].rows.every(x=>x[1]===5&&x[2]==='AUDIT_TEST_PUBLIC'));
 assert.equal(result.fullText,full);assert(unpack(full).securities.every(x=>x.saved_fields.audit_context.conditions.length===5));
 assert(result.parts.every(x=>x.length<=8000));
});
test('legacy bounded brief exposes missing audit rather than suggesting all evidence is present',async()=>{
 const r=await T.prepare(E.diagnosisText(model())),p=unpack(r.briefText);
 assert.equal(r.mode,'BRIEF_WITH_FULL_EVIDENCE');assert.equal(p.audit_coverage[0].status.state,'NOT_RECORDED');
 assert(r.briefText.length<=8000);assert(p.full_only.some(x=>x.includes('audit_context')));
});
test('single security analysis still fits and preserves audit plus public policy in file',async()=>{
 const {m,v}=pair(),full=E.analysisText(m,'6841',v),r=await T.prepare(full),p=unpack(r.briefText);
 assert.equal(r.mode,'BRIEF_WITH_FULL_EVIDENCE');assert(r.briefText.length<=8000);assert.equal(p.securities[0].policy_context.policy_code,'AUDIT_TEST_PUBLIC');
 assert.equal(unpack(r.fullText).security.audit_context.conditions.length,5);
});
test('reader module has no data fetch or private storage capability',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../docs/audit-context.js'),'utf8');
 assert(!/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|clipboard/.test(code));
});
