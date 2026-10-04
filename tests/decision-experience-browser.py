"""Real app.js integration, deterministic public fixtures; not an iPhone device pass."""
import copy
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-output' / 'decision-experience'
OUT.mkdir(parents=True, exist_ok=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / 'docs'))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
common = json.loads((ROOT / 'docs/data/common_snapshot.json').read_text())
report = []
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width, height in [(320,740),(375,812),(393,852),(430,932),(852,393)]:
            for color in ['light','dark']:
                context = browser.new_context(viewport={'width':width,'height':height}, color_scheme=color, service_workers='block')
                page = context.new_page()
                errors, external = [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
                page.add_init_script("""(() => {
                  const RealDate=Date, fixed=RealDate.parse('2026-10-04T04:15:00Z');
                  window.Date=class extends RealDate {constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}};
                  window.__copies=[]; Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copies.push(text);}}});
                  localStorage.setItem('other-app.test-sentinel','PRESERVE');
                })();""")
                page.goto(BASE+'/', wait_until='networkidle')
                page.wait_for_selector('.dx-hero')
                assert page.locator('.brand').inner_text().endswith('v1.10.0')
                assert page.locator('.dx-stock').count()==6
                assert page.locator('.dx-horizon').count()==24
                assert '保有継続' in page.locator('.dx-headline').inner_text()
                assert 'SHADOW' in page.locator('.dx-hero .dx-safety').inner_text()
                assert page.locator('#manage-updates #refresh-data-btn').count()==1
                assert page.locator('#decision-view #refresh-data-btn').count()==0
                assert page.locator('.dx-headline').bounding_box()['y']<height-80
                assert float(page.locator('.dx-action').first.evaluate('(e)=>getComputedStyle(e).fontSize').removesuffix('px'))>=20
                before = page.evaluate('JSON.stringify(currentSnapshot)')
                page.locator('[data-dx-copy="all"]').click()
                page.wait_for_function('window.__copies.length===1')
                payload = page.evaluate('window.__copies[0]')
                assert 'DISPLAY_SUMMARY_ONLY_NOT_FULL_HISTORY' in payload
                assert 'PRESERVE' not in payload
                parsed = json.loads(payload[payload.index('{'):])
                assert len(parsed['securities'])==6
                assert all(s['formal_action'] is None for s in parsed['securities'])
                assert before==page.evaluate('JSON.stringify(currentSnapshot)')
                assert page.locator('.dx-consult a').get_attribute('href')=='https://chatgpt.com/'
                assert not external, external
                assert page.evaluate("localStorage.getItem('other-app.test-sentinel')")=='PRESERVE'
                for view in ['decision-view','stocks-view','forecast-view','quality-view','manage-view']:
                    page.locator('.primary-nav [data-view="'+view+'"]').click()
                    assert page.locator('#'+view).is_visible()
                    size=page.evaluate('({w:innerWidth,doc:document.documentElement.scrollWidth})')
                    assert size['doc']<=size['w']+1, (width,color,view,size)
                    assert page.locator('.primary-nav [aria-current="page"]').count()==1
                    if view=='quality-view':
                        assert page.locator('.dx-tile').count()==6
                        assert page.locator('#quality-digest').is_visible()
                    if width==393:
                        page.screenshot(path=str(OUT/f'{view}-{color}.png'), full_page=False)
                page.locator('.primary-nav [data-view="decision-view"]').click()
                page.locator('[data-dx-stock-open="6841"]').first.click()
                assert page.locator('#stocks-view').is_visible()
                assert page.locator('.stock-card[data-stock="6841"]').get_attribute('open') is not None
                chart=page.locator('.stock-card[data-stock="6841"] .stock-chart-details')
                chart.locator('summary').click()
                chart.locator('.chart-expand-btn').first.wait_for(state='visible')
                chart.locator('.chart-expand-btn').first.click()
                assert page.locator('.chart-modal').is_visible()
                page.locator('[data-chart-close]').click()
                page.locator('.primary-nav [data-view="decision-view"]').click()
                page.locator('[data-dx-copy="6841"]').click()
                page.wait_for_function('window.__copies.length===2')
                single=page.evaluate('window.__copies[1]');data=json.loads(single[single.index('{'):])
                assert [s['code'] for s in data['securities']]==['6841']
                page.evaluate("navigator.clipboard.writeText=async()=>{throw Error('blocked')}")
                page.locator('[data-dx-copy="all"]').click()
                page.locator('#consultation-copy-text').wait_for(state='visible')
                assert 'SHADOW' in page.locator('#consultation-copy-text').input_value()
                page.evaluate('renderAll(currentSnapshot, null)')
                assert 'データ確認を優先' in page.locator('.dx-hero').inner_text()
                page.evaluate('(c)=>renderAll(currentSnapshot,c)',common)
                page.evaluate("document.getElementById('banner').innerHTML='<div class=\"banner error\">テスト用通信失敗</div>'")
                page.wait_for_function("document.querySelector('.dx-hero').textContent.includes('再読込に失敗')")
                assert page.locator('#decision-view .banner.error').is_visible()
                assert before==page.evaluate('JSON.stringify(currentSnapshot)')
                assert not errors, errors
                assert not external, external
                report.append({'width':width,'height':height,'scheme':color,'status':'PASS','js_errors':len(errors),'outbound_requests':len(external)})
                context.close()
        browser.close()
finally:
    server.shutdown()
    (OUT/'result.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
assert len(report)==10
