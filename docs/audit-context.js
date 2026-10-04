/* Optional same-decision evidence. No config lookup, trade logic, or storage access. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JPAuditContext=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const own=(v,k)=>!!v&&Object.prototype.hasOwnProperty.call(v,k);
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const state=(v,k)=>!own(v,k)?'NOT_RECORDED':v[k]===null?'NULL':object(v[k])?(Object.keys(v[k]).length?'RECORDED':'EMPTY'):'INVALID';
  const scalar=v=>v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v))?v:null;
  const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>own(v,k)).map(k=>[k,scalar(v[k])]));
  const conditionKeys=['label','status','required','purpose'];
  const metaKeys=['schema_version','run_id','as_of','security_id','conditions_source','conditions_state','condition_count','display_limit','policy_source','policy_state'];
  function project(sec,identity){
    const actualPolicy=state(sec,'policy_context');
    if(!own(sec,'audit_context'))return {availability:'NOT_RECORDED',policy_state:actualPolicy};
    const raw=sec.audit_context,errors=[];
    if(!object(raw))return {availability:raw===null?'NULL':'INVALID',validation_state:'INVALID',policy_state:actualPolicy,validation_errors:['AUDIT_OBJECT_INVALID']};
    const out={...pick(raw,metaKeys),availability:'RECORDED',policy_field_state:actualPolicy};
    const add=(ok,code)=>{if(!ok)errors.push(code);};
    add(raw.schema_version==='1.0','AUDIT_SCHEMA_UNSUPPORTED');
    add(!!sec.security_id&&raw.security_id===sec.security_id,'AUDIT_SECURITY_MISMATCH');
    add(!!sec.as_of&&raw.as_of===sec.as_of,'AUDIT_DATE_MISMATCH');
    if(identity)add(!!identity.run_id&&raw.run_id===identity.run_id,'AUDIT_RUN_MISMATCH');
    else add(typeof raw.run_id==='string'&&!!raw.run_id,'AUDIT_RUN_MISSING');
    add(raw.display_limit===3&&raw.conditions_source==='decision.next_conditions'&&raw.policy_source==='decision.policy_context','AUDIT_SOURCE_INVALID');
    if(Array.isArray(raw.conditions)){
      out.conditions=raw.conditions.map(row=>{
        add(object(row),'AUDIT_CONDITION_INVALID');
        if(!object(row))return null;
        for(const k of conditionKeys){
          if(!own(row,k)||row[k]===null)continue;
          add(k==='required'?typeof row[k]==='boolean':typeof row[k]==='string','AUDIT_CONDITION_TYPE');
        }
        return pick(row,conditionKeys);
      });
      add(Number.isInteger(raw.condition_count)&&raw.condition_count===raw.conditions.length,'AUDIT_COUNT_MISMATCH');
      add(raw.conditions_state===(raw.conditions.length?'RECORDED':'EMPTY'),'AUDIT_CONDITION_STATE');
    }else{
      out.conditions=null;
      add(raw.conditions==null&&raw.condition_count===null&&['NULL','NOT_RECORDED'].includes(raw.conditions_state),'AUDIT_CONDITION_STATE');
    }
    add(raw.policy_state===actualPolicy&&actualPolicy!=='INVALID','AUDIT_POLICY_STATE');
    const p=sec.policy_context;
    if(object(p)){
      add(p.security_id==null||p.security_id===sec.security_id,'AUDIT_POLICY_SECURITY');
      for(const k of ['security_id','policy_code','label','objective'])if(own(p,k))add(p[k]===null||typeof p[k]==='string','AUDIT_POLICY_TYPE');
      if(own(p,'focus'))add(p.focus===null||(Array.isArray(p.focus)&&p.focus.every(x=>typeof x==='string')),'AUDIT_POLICY_TYPE');
    }
    out.validation_state=errors.length?'INVALID':identity?'MATCHED':'PARTIAL';
    out.validation_errors=Array.from(new Set(errors));
    return out;
  }
  function assertBound(sec,identity){
    const receipt=project(sec,identity);
    if(receipt.availability!=='NOT_RECORDED'&&receipt.validation_state!=='MATCHED')throw Error('AUDIT_CONTEXT_INVALID');
    return receipt;
  }
  return {project,assertBound};
});
