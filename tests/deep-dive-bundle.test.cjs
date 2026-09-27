const test=require('node:test');
const assert=require('node:assert/strict');
const mod=require('../docs/deep-dive-bundle.js');

const enc=new TextEncoder();
const jsonBytes=obj=>enc.encode(JSON.stringify(obj,null,2)+'\n');
const response=bytes=>new Response(bytes,{status:200,headers:{'content-type':'application/json'}});

async function fixture(overrides={}){
  const publication_id=overrides.publication_id||'jp-test-publication';
  const sources=overrides.sources||[
    {source_id:'app_snapshot',path:'data/app_snapshot.json',status:'OK',sha256:'aaa',bytes:10,required_for_bundle:true},
    {source_id:'common_snapshot',path:'data/common_snapshot.json',status:'OK',sha256:'bbb',bytes:20,required_for_bundle:true},
    {source_id:'chart_9432',path:'data/charts/9432.json',status:'OK',sha256:'ccc',bytes:30,required_for_bundle:true},
  ];
  const payload={
    payload_schema_version:'0.1',publication_id,market:'JAPAN',
    scope:{subject_type:'SECURITY',subject_ids:['SEC_JP_9432'],codes:['9432'],history_rows:90},
    versions:{app_version:'1.6.0',bundle_contract:'deep-dive/0.1'},
    sources,
    trigger_context:{priority_band:'RECOMMENDED',priority_score:30,mandatory_checks:['品質確認'],analysis_use:'REVIEW_ONLY'},
    data_quality:{common_eligibility:'NOT_ELIGIBLE'},
    summary:{subject:{code:'9432',name:'NTT'}},
    raw_data:{security:{code:'9432',name:'NTT'},chart:{rows:[{date:'2026-09-25',close:160}]}}
  };
  Object.assign(payload,overrides.payload||{});
  const payloadBytes=jsonBytes(payload);
  const payloadHash=await mod.sha256Hex(payloadBytes);
  const manifest={
    schema_version:'1.0',market:'JAPAN',publication_id,source_state:'READY',
    files:[
      ...sources,
      {source_id:'deep_dive_9432',path:'data/deep_dive/9432.json',status:'OK',sha256:payloadHash,bytes:payloadBytes.length,required_for_bundle:false}
    ],
    deep_dive:{payload_schema_version:'0.1',subjects:[{security_id:'SEC_JP_9432',code:'9432',ticker:'9432.T',name:'NTT',path:'data/deep_dive/9432.json',sha256:payloadHash,bytes:payloadBytes.length}]}
  };
  Object.assign(manifest,overrides.manifest||{});
  return {payload,payloadBytes,payloadHash,manifest,manifestBytes:jsonBytes(manifest)};
}
function fetcher(fx,options={}){
  let manifestCalls=0;
  return async url=>{
    const path=String(url).split('?')[0];
    if(path===mod.MANIFEST_PATH){
      manifestCalls++;
      if(options.secondManifest)return response(jsonBytes(options.secondManifest(manifestCalls,fx.manifest)));
      return response(fx.manifestBytes);
    }
    if(path==='data/deep_dive/9432.json')return response(options.payloadBytes||fx.payloadBytes);
    return new Response('not found',{status:404});
  };
}

test('verified build produces READY bundle and excludes local data',async()=>{
  const fx=await fixture();
  const out=await mod.build('9432',{fetchImpl:fetcher(fx),nowMs:0,bundleNonce:'n1'});
  assert.equal(out.bundle.build_state,'READY');
  assert.equal(out.bundle.publication_id,'jp-test-publication');
  assert.equal(out.bundle.local_data,null);
  assert.match(out.bundle.local_data_note,/含めていません/);
  assert.equal(out.bundle.created_at,'1970-01-01T09:00:00.000+09:00');
  assert.match(out.text,/ChatGPT深掘り FULL bundle/);
  assert.match(out.text,/品質確認/);
});

test('payload SHA mismatch blocks bundle',async()=>{
  const fx=await fixture();
  const bad=jsonBytes({...fx.payload,summary:{subject:{code:'9432',name:'tampered'}}});
  await assert.rejects(
    mod.build('9432',{fetchImpl:fetcher(fx,{payloadBytes:bad})}),
    /SHA-256/
  );
});

test('required source missing blocks FULL bundle',async()=>{
  const sources=[
    {source_id:'app_snapshot',path:'data/app_snapshot.json',status:'OK',sha256:'aaa',bytes:10,required_for_bundle:true},
    {source_id:'common_snapshot',path:'data/common_snapshot.json',status:'MISSING',sha256:null,bytes:0,required_for_bundle:true},
    {source_id:'chart_9432',path:'data/charts/9432.json',status:'OK',sha256:'ccc',bytes:30,required_for_bundle:true},
  ];
  const fx=await fixture({sources});
  await assert.rejects(mod.build('9432',{fetchImpl:fetcher(fx)}),/必須source/);
});

test('payload source metadata must match manifest',async()=>{
  const fx=await fixture();
  const tampered={...fx.payload,sources:fx.payload.sources.map((x,i)=>i===0?{...x,sha256:'wrong'}:x)};
  const bytes=jsonBytes(tampered);
  const hash=await mod.sha256Hex(bytes);
  const manifest={...fx.manifest,files:fx.manifest.files.map(x=>x.source_id==='deep_dive_9432'?{...x,sha256:hash,bytes:bytes.length}:x),
    deep_dive:{...fx.manifest.deep_dive,subjects:fx.manifest.deep_dive.subjects.map(x=>({...x,sha256:hash,bytes:bytes.length}))}};
  const local={...fx,payloadBytes:bytes,manifest,manifestBytes:jsonBytes(manifest)};
  await assert.rejects(mod.build('9432',{fetchImpl:fetcher(local)}),/source情報/);
});

test('manifest change during build is detected',async()=>{
  const fx=await fixture();
  await assert.rejects(
    mod.build('9432',{attempts:1,fetchImpl:fetcher(fx,{secondManifest:(n,m)=>n===1?m:{...m,publication_id:'jp-new'}})}),
    /更新途中/
  );
});

test('unsafe and malformed subject codes are rejected',async()=>{
  await assert.rejects(mod.loadVerifiedPayload('../9432',{fetchImpl:async()=>response(new Uint8Array())}),/銘柄コード/);
  assert.equal(mod.safeDataPath('data/deep_dive/9432.json'),true);
  assert.equal(mod.safeDataPath('https://evil.example/x.json'),false);
  assert.equal(mod.safeDataPath('data/../secret.json'),false);
});

test('priority score remains descriptive metadata',async()=>{
  const fx=await fixture();
  const out=await mod.build('9432',{fetchImpl:fetcher(fx),bundleNonce:'x'});
  assert.equal(out.bundle.trigger_context.priority_score,30);
  assert.equal(out.bundle.trigger_context.analysis_use,'REVIEW_ONLY');
  assert.equal(out.bundle.raw_data.security.code,'9432');
});
