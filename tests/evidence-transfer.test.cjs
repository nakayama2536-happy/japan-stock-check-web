const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const T=require('../docs/evidence-transfer.js');
const D=require('../docs/decision-experience.js'),E=require('../docs/evidence-workflows.js');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const d=read('docs/data/app_snapshot.json'),c=read('docs/data/common_snapshot.json');
const model=()=>D.makeModel(d,c,{now:new Date('2026-10-04T06:32:05Z'),sourceState:s=>s.source_evidence?.crosscheck_match?'PASS':'PENDING'});
const payload=t=>JSON.parse(t.slice(t.indexOf('\n{')+1));
const body=t=>t.split('--- データ開始 ---\n')[1].split('\n--- データ終了 ---')[0];
const report=[];
test('brief null omission preserves meaningful zero false empty arrays and positional null',()=>{
 assert.deepEqual(T.compact({missing:null,zero:0,no:false,empty:[],arr:[null,0,false],o:{nil:null}}),{zero:0,no:false,empty:[],arr:[null,0,false],o:{}});
});
test('current five-stock investigation has a usable brief below 8000 including instructions',async()=>{
 const text=E.diagnosisText(model()),a=await T.prepare(text),p=payload(a.briefText);
 const debug=path.join(root,'test-output/decision-experience');fs.mkdirSync(debug,{recursive:true});fs.writeFileSync(path.join(debug,'investigation-evidence.txt'),text);fs.writeFileSync(path.join(debug,'investigation-brief.txt'),a.briefText);
 const normal=T.makeBrief(payload(text),{filename:a.filename,sha256:a.sha256});console.log('BRIEF_COMPONENTS',JSON.stringify(Object.fromEntries(Object.entries(normal).map(([k,v])=>[k,JSON.stringify(v).length]))));
 assert.equal(a.mode,'BRIEF_WITH_FULL_EVIDENCE');assert(a.briefText.length<=8000);
 assert.equal(p.expected_security_count,5);assert.equal(p.securities.length,5);
 assert.equal(p.common_quality.displayed_qc,'WARN');assert.equal(p.manifest_verification.state,'NOT_CHECKED');
 assert.equal(p.display_identity.run_id,d.run_id);assert.equal(p.securities[0].source_evidence.diffs.close,0);
 assert(!a.briefText.includes('5805'));assert(!a.briefText.includes('SWCC'));
 assert(p.common_items.find(x=>x.subject_id==='SEC_JP_9432').risk_conditions.length>0);
 assert(p.conditions.some(x=>x[p.condition_columns.indexOf('required')]===false));assert(p.conditions.some(x=>x[p.condition_columns.indexOf('purpose')]==='REDUCE'));
 assert.equal(a.fullText,text);assert.equal(a.sha256,crypto.createHash('sha256').update(text).digest('hex'));
 assert.equal(a.parts.map(body).join(''),text);assert(a.parts.every(x=>x.length<=8000));
 assert.equal(p.full_evidence.auto_attached,false);
 report.push({purpose:'diagnostic',full_characters:text.length,copy_characters:a.briefText.length,parts:a.parts.length,mode:a.mode});
 const out=path.join(root,'test-output/decision-experience');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'investigation-brief.txt'),a.briefText);fs.writeFileSync(path.join(out,'investigation-evidence.txt'),text);
});
for(const code of ['6841','6954','3038','9432','1812'])test('actual verified single-stock '+code+' retains full history in file, bounded brief',async()=>{
 const manifest=read('docs/data/publication_manifest.json'),subject=manifest.deep_dive.subjects.find(x=>String(x.code)===code);
 const verified={manifest,subject,payload:read('docs/'+subject.path)};
 const text=E.analysisText(model(),code,verified),a=await T.prepare(text),p=payload(a.briefText),full=payload(a.fullText);
 assert(a.briefText.length<=8000);assert.equal(a.mode,'BRIEF_WITH_FULL_EVIDENCE');assert.equal(p.code,code);
 assert.equal(full.chart.rows.length,verified.payload.scope.history_rows);assert(full.chart.rows.length>0);
 assert.equal(p.verification.display_identity,'MATCHED');assert.equal(a.fullText,text);
 assert(!('chart' in p));assert(p.full_only.includes('OHLCV全行'));assert.equal(a.parts.map(body).join(''),text);
 assert(a.parts.every(x=>x.length<=8000));assert.equal(p.securities[0].technical.ma25,full.security.technical.ma25);
 report.push({purpose:'analysis',code,full_characters:text.length,copy_characters:a.briefText.length,parts:a.parts.length,mode:a.mode});
});
for(const n of [7999,8000,8001,15999,16000,16001,100000])test('full evidence boundary '+n+' is reconstructable without truncation',()=>{
 const text='日'.repeat(n),parts=T.splitFull(text,'a'.repeat(64));assert(parts.every(p=>p.length<=T.LIMIT));assert.equal(parts.map(body).join(''),text);
});
test('split never cuts astral character surrogate pair and preserves CRLF exactly',()=>{
 const text='日'.repeat(7199)+'😀\r\n'+'🌸'.repeat(10000);
 const parts=T.splitFull(text,'b'.repeat(64));assert.equal(parts.map(body).join(''),text);
 for(const part of parts){assert(part.length<=8000);const s=body(part);assert(!(s.charCodeAt(s.length-1)>=0xD800&&s.charCodeAt(s.length-1)<=0xDBFF));}
});
test('oversized warnings require attachment, never become apparent all-clear',async()=>{
 const m=model();m.notes=['巨大な警告'.repeat(5000)];m.qc='FAIL';
 const text=E.diagnosisText(m),a=await T.prepare(text),p=payload(a.briefText);
 assert.equal(a.mode,'ATTACHMENT_REQUIRED');assert(a.briefText.length<=8000);assert.equal(a.fullText,text);
 assert.equal(p.common_quality.displayed_qc,'FAIL');assert(a.briefText.includes('結論を出さず'));assert.equal(a.parts.map(body).join(''),text);
});
test('pathological identity never bypasses cap and remains preserved in full file',async()=>{
 const p=E.diagnosticPayload(model());p.display_identity.run_id='巨大'.repeat(20000);
 const text='調査\n'+JSON.stringify(p),a=await T.prepare(text);
 assert(a.briefText.length<=8000);assert.equal(a.mode,'ATTACHMENT_REQUIRED');assert.equal(a.fullText,text);
});
test('missing / unknown schema is rejected rather than exported as partial JSON',async()=>{
 await assert.rejects(T.prepare('not json'));await assert.rejects(T.prepare('x\n{"schema":"other"}'));
});
test('both generated purpose payloads are unchanged after transfer',async()=>{
 const m=model(),before=JSON.stringify(m),text=E.diagnosisText(m);await T.prepare(text);assert.equal(JSON.stringify(m),before);
});
test('the transfer module cannot fetch or read/write private storage',()=>{
 const code=fs.readFileSync(path.join(root,'docs/evidence-transfer.js'),'utf8');
 assert(!/\bfetch\s*\(|localStorage|indexedDB|sessionStorage|clipboard/.test(code.replace(/\/\*[\s\S]*?\*\//g,'')));
});
test.after(()=>{const out=path.join(root,'test-output/decision-experience');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'transfer-sizes.json'),JSON.stringify(report,null,2));console.log('TRANSFER_SIZES '+JSON.stringify(report));});
