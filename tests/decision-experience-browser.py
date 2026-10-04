"""Actual app + purpose-specific evidence; browser proof, not iPhone acceptance."""
import functools
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
report=[]
def parse_prompt(text):
    return json.loads(text[text.index('{'):])
def close(page):
    page.locator('[data-aw-close]').click()
def prepared(page):
    page.wait_for_function("!document.getElementById('aw-result').hidden || document.getElementById('aw-status').textContent.includes('検証を通過できない')",timeout=25000)
    assert page.locator('#aw-result').is_visible(),page.locator('#aw-status').inner_text()
try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for width,height in [(320,740),(375,812),(393,852),(430,932),(852,393)]:
      for color in ['light','dark']:
        context=browser.new_context(viewport={'width':width,'height':height},color_scheme=color,service_workers='block',accept_downloads=True)
        page=context.new_page();errors=[];external=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('request',lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
        page.add_init_script("""(() => {
          const R=Date,fixed=R.parse('2026-10-04T06:10:00Z');
          window.Date=class extends R{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}};
          window.__copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copies.push(t);}}});
          localStorage.setItem('other-app.test-sentinel','PRESERVE');
          localStorage.setItem('jp-retired-test-sentinel','5805-PRESERVE');
        })();""")
        page.goto(BASE+'/',wait_until='networkidle');page.wait_for_selector('.aw-hub')
        assert page.locator('.brand').inner_text().endswith('v1.12.0')
        assert page.locator('.dx-stock').count()==5
        assert page.locator('.dx-horizon').count()==20
        assert '保有継続' in page.locator('.dx-headline').inner_text()
        assert 'SHADOW' in page.locator('.dx-hero .dx-safety').inner_text()
        assert page.locator('#manage-updates #refresh-data-btn').count()==1
        assert page.locator('#decision-view #refresh-data-btn').count()==0
        assert float(page.locator('.dx-action').first.evaluate('(e)=>getComputedStyle(e).fontSize').removesuffix('px'))>=20
        before=page.evaluate('JSON.stringify(currentSnapshot)')
        # Real clipboard payload: richer investigation, not a display paraphrase.
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page)
        assert '未実施' in page.locator('#aw-evidence-note').inner_text()
        page.locator('[data-aw-copy]').click();page.wait_for_function('__copies.length===1')
        diagnostic=parse_prompt(page.evaluate('__copies[0]'))
        assert diagnostic['schema']=='jp-data-investigation/1'
        assert diagnostic['expected_security_count']==5
        assert len(diagnostic['securities'])==5
        assert all(s['code']!='5805' for s in diagnostic['securities'])
        assert diagnostic['manifest_verification']['state']=='NOT_CHECKED'
        assert diagnostic['common_quality']['displayed_qc']=='WARN'
        assert 'source_evidence' in diagnostic['securities'][0]['saved_fields']
        assert all('purpose' in x and 'required' in x for x in diagnostic['securities'][0]['saved_fields']['next_conditions'])
        assert page.locator('.aw-chat').get_attribute('href')=='https://chatgpt.com/'
        with page.expect_download() as download:
          page.locator('[data-aw-save]').click()
        saved=Path(download.value.path()).read_text()
        assert saved==page.locator('#aw-text').input_value()
        close(page)
        # All five actual published bundles must bind to the current display.
        for code in ['6841','6954','3038','9432','1812']:
          page.locator('#aw-security-select').select_option(code)
          page.locator('[data-aw-analysis="selected"]').click();prepared(page)
          payload=parse_prompt(page.locator('#aw-text').input_value())
          assert payload['schema']=='jp-security-analysis/1' and payload['code']==code
          assert payload['scope']['history_rows']==len(payload['chart']['rows'])
          assert payload['scope']['history_rows']>0
          assert '全計算履歴ではありません' in page.locator('#aw-evidence-note').inner_text()
          assert payload['verification']['display_identity']=='MATCHED'
          assert payload['local_data'] is None
          assert payload['security']['technical']
          assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
          assert page.locator('.aw-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
          if code=='6841':
            page.locator('[data-aw-copy]').click()
            page.wait_for_function('__copies.length===2')
            assert parse_prompt(page.evaluate('__copies[1]'))['code']=='6841'
          close(page)
        # Clipboard rejection still exposes the complete text, not a shortened fallback.
        page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw Error('blocked')}}")
        page.locator('.aw-hub [data-aw-diagnose]').click();prepared(page)
        page.locator('[data-aw-copy]').click();page.wait_for_selector('#aw-text:visible')
        assert '手動コピー' in page.locator('#aw-status').inner_text()
        assert parse_prompt(page.locator('#aw-text').input_value())['schema']=='jp-data-investigation/1'
        close(page)
        for view in ['decision-view','stocks-view','forecast-view','quality-view','manage-view']:
          page.locator('.primary-nav [data-view="'+view+'"]').click()
          assert page.locator('#'+view).is_visible()
          assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,color,view)
          assert page.locator('.primary-nav [aria-current="page"]').count()==1
          if view=='quality-view':
            assert page.locator('button.dx-tile').count()==6
            for key in ['sources','issues','qc','freshness','formal','schedule']:
              page.locator('[data-quality-detail="'+key+'"]').click()
              assert page.locator('#quality-detail-screen').is_visible()
              assert page.evaluate('document.activeElement.id')=='quality-detail-heading'
              assert page.locator('#quality-digest').is_hidden()
              assert page.locator('#data-quality').is_hidden()
              assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
              page.locator('[data-quality-return]').click()
              assert page.evaluate("document.activeElement.getAttribute('data-quality-detail')")==key
            page.locator('[data-quality-detail="qc"]').focus();page.keyboard.press('Enter')
            page.evaluate('renderAll(currentSnapshot,null)')
            assert '表示できません' in page.locator('#quality-detail-screen').inner_text()
            page.evaluate('(c)=>renderAll(currentSnapshot,c)',common)
            page.keyboard.press('Escape');assert page.locator('#quality-digest').is_visible()
            page.locator('#quality-digest [data-aw-diagnose]').click();prepared(page);close(page)
          if width==393:page.screenshot(path=str(OUT/f'{view}-{color}.png'),full_page=False)
        # Deep analysis entry also works outside the EDINET disclosure.
        page.locator('.primary-nav [data-view="decision-view"]').click()
        page.locator('[data-dx-stock-open="6841"]').first.click()
        assert page.locator('.stock-card[data-stock="6841"]').get_attribute('open') is not None
        page.locator('.stock-card[data-stock="6841"] [data-aw-analysis]').click();prepared(page);close(page)
        chart=page.locator('.stock-card[data-stock="6841"] .stock-chart-details')
        chart.locator('summary').click();chart.locator('.chart-expand-btn').first.wait_for(state='visible');chart.locator('.chart-expand-btn').first.click()
        assert page.locator('.chart-modal').is_visible();page.locator('[data-chart-close]').click()
        page.locator('.primary-nav [data-view="decision-view"]').click()
        # Corrupt fetched payload -> no analysis and no automatic summary substitute.
        page.route('**/data/deep_dive/6841.json?*',lambda route:route.fulfill(status=200,body='{}',content_type='application/json'))
        page.locator('.dx-stock [data-aw-analysis="6841"]').click()
        page.wait_for_function("document.getElementById('aw-status').textContent.includes('検証を通過できない')")
        assert page.locator('#aw-result').is_hidden();assert not page.locator('#aw-text').input_value();close(page)
        page.unroute('**/data/deep_dive/6841.json?*')
        # Legacy failures remain visible; evidence exports preserve their warning.
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
        report.append({'width':width,'height':height,'scheme':color,'status':'PASS','bundles_checked':5,'quality_details_checked':6,'js_errors':len(errors),'external_requests':len(external)})
        context.close()
    browser.close()
finally:
  server.shutdown();(OUT/'result.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));assert len(report)==10
