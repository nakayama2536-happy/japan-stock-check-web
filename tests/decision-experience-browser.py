"""Actual application, bounded transfer and full evidence; not iPhone approval."""
import functools
import hashlib
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'/'decision-experience'
OUT.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'docs')))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'
common=json.loads((ROOT/'docs/data/common_snapshot.json').read_text())
source_snapshot=json.loads((ROOT/'docs/data/app_snapshot.json').read_text())
source_by_code={s['code']:s for s in source_snapshot['securities']}
report=[]
def parse_prompt(text):return json.loads(text[text.index('\n{')+1:])
def chars(text):return len(text.encode('utf-16-le'))//2
def close(page):page.locator('[data-aw-close]').click()
def prepared(page):
    page.wait_for_function("!document.getElementById('aw-result').hidden || document.getElementById('aw-status').textContent.includes('検証を通過できない')",timeout=25000)
    assert page.locator('#aw-result').is_visible(),page.locator('#aw-status').inner_text()
def full(page):return page.locator('#aw-full-text').input_value()
def check_receipt(exported,source):
    audit=exported['audit_context']
    if 'audit_context' not in source:
        assert audit['availability']=='NOT_RECORDED'
    else:
        expected=source['audit_context']
        assert audit['validation_state']=='MATCHED'
        assert audit['run_id']==source_snapshot['run_id']
        for key in ['conditions','condition_count','conditions_state','policy_state','security_id','as_of']:
            assert audit[key]==expected[key],key
        for key,value in (source.get('policy_context') or {}).items():
            assert exported['policy_context'][key]==value
try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for width,height in [(320,740),(375,812),(393,852),(430,932),(852,393)]:
      for color in ['light','dark']:
        context=browser.new_context(viewport={'width':width,'height':height},color_scheme=color,service_workers='block',accept_downloads=True)
        page=context.new_page();errors=[];external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
        page.add_init_script("""(() => {
          const R=Date,fixed=R.parse('2026-10-04T06:10:00Z');
          window.Date=class extends R{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}};
          window.__copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copies.push(t);}}});
          localStorage.setItem('other-app.test-sentinel','PRESERVE');
          localStorage.setItem('jp-retired-test-sentinel','5805-PRESERVE');
        })();""")
        page.goto(BASE+'/',wait_until='networkidle');page.wait_for_selector('.aw-hub')
        assert page.locator('.brand').inner_text().endswith('v1.12.2')
        assert page.locator('.dx-stock').count()==5 and page.locator('.dx-horizon').count()==20
        assert '保有継続' in page.locator('.dx-headline').inner_text()
        assert 'SHADOW' in page.locator('.dx-hero .dx-safety').inner_text()
        assert page.locator('#manage-updates #refresh-data-btn').count()==1
        assert page.locator('#decision-view #refresh-data-btn').count()==0
        assert float(page.locator('.dx-action').first.evaluate('(e)=>getComputedStyle(e).fontSize').removesuffix('px'))>=20
        before=page.evaluate('JSON.stringify(currentSnapshot)')
        # Synthetic old/new receipts; never mutate the saved market snapshot.
        assert page.evaluate("""() => {
          const s=structuredClone(currentSnapshot.securities[0]);
          delete s.audit_context;delete s.policy_context;
          if(JPAuditContext.project(s,currentSnapshot).availability!=='NOT_RECORDED')return false;
          s.policy_context={security_id:s.security_id,policy_code:'TEST',label:'公開試験',objective:'確認',focus:[]};
          s.audit_context={schema_version:'1.0',run_id:currentSnapshot.run_id,as_of:s.as_of,security_id:s.security_id,conditions_source:'decision.next_conditions',conditions_state:'RECORDED',condition_count:4,display_limit:3,policy_source:'decision.policy_context',policy_state:'RECORDED',conditions:Array.from({length:4},(_,i)=>({label:'条件'+i,status:i?'PENDING':'PASS',purpose:i===3?'SELL':'ENTRY',required:i!==1}))};
          const a=JPEvidenceWorkflows.security(s,currentSnapshot).audit_context;
          if(a.validation_state!=='MATCHED'||a.conditions.length!==4||a.conditions[1].required!==false)return false;
          s.audit_context.run_id='OTHER';
          return JPAuditContext.project(s,currentSnapshot).validation_state==='INVALID';
        }""")
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page)
        assert '未実施' in page.locator('#aw-evidence-note').inner_text()
        page.locator('[data-aw-copy]').click();page.wait_for_function('__copies.length===1')
        copied=page.evaluate('__copies[0]');brief=parse_prompt(copied)
        assert chars(copied)<=8000 and brief['schema']=='jp-evidence-brief/1'
        assert brief['transfer_mode']=='BRIEF_WITH_FULL_EVIDENCE'
        assert brief['expected_security_count']==5 and len(brief['securities'])==5
        diagnostic=parse_prompt(full(page))
        assert diagnostic['schema']=='jp-data-investigation/1'
        assert diagnostic['expected_security_count']==5 and len(diagnostic['securities'])==5
        assert all(s['code']!='5805' for s in diagnostic['securities'])
        coverage={row[0]:group['status'] for group in brief['audit_coverage'] for row in group['rows']}
        for s in diagnostic['securities']:
            check_receipt(s['saved_fields'],source_by_code[s['code']])
            a=s['saved_fields']['audit_context']
            assert coverage[s['code']]['state']==a.get('validation_state',a['availability'])
        assert diagnostic['manifest_verification']['state']=='NOT_CHECKED'
        assert diagnostic['common_quality']['displayed_qc']=='WARN'
        assert 'source_evidence' in diagnostic['securities'][0]['saved_fields']
        assert all('purpose' in x and 'required' in x for x in diagnostic['securities'][0]['saved_fields']['next_conditions'])
        assert page.locator('.aw-chat').get_attribute('href')=='https://chatgpt.com/'
        with page.expect_download() as download:page.locator('[data-aw-save]').click()
        saved_bytes=Path(download.value.path()).read_bytes();saved=saved_bytes.decode('utf8')
        assert saved==full(page)
        assert hashlib.sha256(saved_bytes).hexdigest()==brief['full_evidence']['sha256']
        assert download.value.suggested_filename==brief['full_evidence']['filename']
        assert saved!=copied
        page.locator('#aw-parts>summary').click();pieces=[]
        count=page.locator('#aw-part-select option').count()
        for i in range(count):
          page.locator('#aw-part-select').select_option(str(i))
          n=page.evaluate('__copies.length');page.locator('[data-aw-part-copy]').click()
          page.wait_for_function('__copies.length>'+str(n));part=page.evaluate('__copies.at(-1)')
          assert chars(part)<=8000
          pieces.append(part.split('--- データ開始 ---\n',1)[1].rsplit('\n--- データ終了 ---',1)[0])
        assert ''.join(pieces)==saved
        if width==393:page.screenshot(path=str(OUT/f'transfer-{color}.png'),full_page=False)
        close(page)
        for code in ['6841','6954','3038','9432','1812']:
          page.locator('#aw-security-select').select_option(code);page.locator('[data-aw-analysis="selected"]').click();prepared(page)
          payload=parse_prompt(full(page));short=page.locator('#aw-text').input_value();bp=parse_prompt(short)
          assert chars(short)<=8000 and bp['schema']=='jp-evidence-brief/1' and bp['code']==code
          assert bp['transfer_mode']=='BRIEF_WITH_FULL_EVIDENCE'
          assert payload['schema']=='jp-security-analysis/1' and payload['code']==code
          assert payload['scope']['history_rows']==len(payload['chart']['rows']) and payload['scope']['history_rows']>0
          check_receipt(payload['security'],source_by_code[code])
          assert '全計算履歴ではありません' in page.locator('#aw-evidence-note').inner_text()
          assert payload['verification']['display_identity']=='MATCHED' and payload['local_data'] is None
          assert payload['security']['technical']
          assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
          assert page.locator('.aw-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
          if code=='6841':
            n=page.evaluate('__copies.length');page.locator('[data-aw-copy]').click();page.wait_for_function('__copies.length>'+str(n))
            assert parse_prompt(page.evaluate('__copies.at(-1)'))['code']=='6841'
          close(page)
        page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw Error('blocked')}}")
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page)
        page.locator('[data-aw-copy]').click();page.wait_for_selector('#aw-text:visible')
        assert '手動コピー' in page.locator('#aw-status').inner_text()
        assert parse_prompt(page.locator('#aw-text').input_value())['schema']=='jp-evidence-brief/1'
        assert chars(page.locator('#aw-text').input_value())<=8000
        close(page)
        for view in ['decision-view','stocks-view','forecast-view','quality-view','manage-view']:
          page.locator('.primary-nav [data-view="'+view+'"]').click();assert page.locator('#'+view).is_visible()
          assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,color,view)
          assert page.locator('.primary-nav [aria-current="page"]').count()==1
          if view=='quality-view':
            assert page.locator('button.dx-tile').count()==6
            for key in ['sources','issues','qc','freshness','formal','schedule']:
              page.locator('[data-quality-detail="'+key+'"]').click();assert page.locator('#quality-detail-screen').is_visible()
              assert page.evaluate('document.activeElement.id')=='quality-detail-heading'
              assert page.locator('#quality-digest').is_hidden() and page.locator('#data-quality').is_hidden()
              assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
              page.locator('[data-quality-return]').click();assert page.evaluate("document.activeElement.getAttribute('data-quality-detail')")==key
            page.locator('[data-quality-detail="qc"]').focus();page.keyboard.press('Enter');page.evaluate('renderAll(currentSnapshot,null)')
            assert '表示できません' in page.locator('#quality-detail-screen').inner_text()
            page.evaluate('(c)=>renderAll(currentSnapshot,c)',common);page.keyboard.press('Escape');assert page.locator('#quality-digest').is_visible()
            page.locator('#quality-digest [data-aw-diagnose]').click();prepared(page);close(page)
          if width==393:page.screenshot(path=str(OUT/f'{view}-{color}.png'),full_page=False)
        page.locator('.primary-nav [data-view="decision-view"]').click();page.locator('[data-dx-stock-open="6841"]').first.click()
        assert page.locator('.stock-card[data-stock="6841"]').get_attribute('open') is not None
        page.locator('.stock-card[data-stock="6841"] [data-aw-analysis]').click();prepared(page);close(page)
        chart=page.locator('.stock-card[data-stock="6841"] .stock-chart-details')
        chart.locator('summary').click();chart.locator('.chart-expand-btn').first.wait_for(state='visible');chart.locator('.chart-expand-btn').first.click()
        assert page.locator('.chart-modal').is_visible();page.locator('[data-chart-close]').click()
        page.locator('.primary-nav [data-view="decision-view"]').click()
        page.route('**/data/deep_dive/6841.json?*',lambda route:route.fulfill(status=200,body='{}',content_type='application/json'))
        page.locator('.dx-stock [data-aw-analysis="6841"]').click()
        page.wait_for_function("document.getElementById('aw-status').textContent.includes('検証を通過できない')")
        assert page.locator('#aw-result').is_hidden() and not full(page) and not page.locator('#aw-text').input_value();close(page)
        page.unroute('**/data/deep_dive/6841.json?*')
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page);page.evaluate('(c)=>renderAll(currentSnapshot,c)',common)
        assert page.locator('#aw-result').is_hidden() and not full(page);close(page)
        page.evaluate("document.getElementById('banner').innerHTML='<div class=\"banner error\">テスト用通信失敗</div>'")
        page.wait_for_function("document.querySelector('.dx-hero').textContent.includes('再読込に失敗')")
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page)
        assert '再読込に失敗' in page.locator('#aw-text').input_value();close(page)
        page.locator('.primary-nav [data-view="quality-view"]').click();page.locator('[data-quality-detail="freshness"]').click()
        assert '再読込に失敗' in page.locator('#quality-detail-screen').inner_text()
        assert before==page.evaluate('JSON.stringify(currentSnapshot)')
        assert page.evaluate("localStorage.getItem('other-app.test-sentinel')")=='PRESERVE'
        assert page.evaluate("localStorage.getItem('jp-retired-test-sentinel')")=='5805-PRESERVE'
        assert not errors,errors
        assert not external,external
        report.append({'width':width,'height':height,'scheme':color,'status':'PASS','bundles_checked':5,'quality_details_checked':6,'clipboard_limit':8000,'full_parts_reconstructed':count,'audit_legacy_and_synthetic_new_checked':True,'js_errors':len(errors),'external_requests':len(external)})
        context.close()
    browser.close()
finally:
  server.shutdown();(OUT/'result.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));assert len(report)==10
