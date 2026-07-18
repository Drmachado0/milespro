import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

EMAIL = os.environ.get('MILESPRO_AUDIT_EMAIL')
PASSWORD = os.environ.get('MILESPRO_AUDIT_PASSWORD')
BASE = 'https://milespro.net.br'
if not EMAIL or not PASSWORD:
    raise SystemExit('Set MILESPRO_AUDIT_EMAIL and MILESPRO_AUDIT_PASSWORD before running this audit script.')

ROUTES = [
  '/dashboard', '/titulares', '/gestao/cartoes', '/gestao/clube-assinante', '/gestao/precos-programas',
  '/operacoes/visao-geral', '/lancamentos/entrada', '/lancamentos/saida-manual', '/lancamentos/passagem-emitida',
  '/gestao/bonus-pendentes', '/lancamentos/sala-vip', '/agencia/venda',
  '/lancamentos/compra-turbinada', '/lancamentos/compra', '/lancamentos/compra-carrinho', '/lancamentos/bumerangue',
  '/lancamentos/transferencia', '/lancamentos/transferencia-cartao', '/simulador',
  '/agencia/calendario', '/agencia/passagens', '/agencia/hoteis', '/agencia/carros', '/agencia/cruzeiros',
  '/agencia/seguros', '/agencia/atracoes', '/agencia/transportes', '/agencia/contas-receber', '/agencia/configuracoes',
  '/analises', '/relatorios/economia', '/relatorios/passagens', '/relatorios/cartoes', '/relatorios',
  '/conquistas', '/alertas', '/sistema/programas', '/sistema/limite-cpf', '/admin/blog', '/configuracoes', '/assinatura',
]
ERROR_TEXT = ['Algo deu errado', 'Oops! Page not found', 'Page not found', 'Return to Home']

async def main():
    out_dir = Path('/root/.openclaw/workspace/milespro-audit-screens2')
    out_dir.mkdir(exist_ok=True)
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={"width":1365,"height":900})
        errors=[]; http=[]
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('response', lambda r: http.append((r.status, r.url)) if r.status >= 400 else None)
        await page.goto(BASE+'/auth', wait_until='networkidle', timeout=30000)
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.press('input[type="password"]', 'Enter')
        await asyncio.sleep(5)
        for route in ROUTES:
            e0=len(errors); h0=len(http)
            status='ok'; notes=[]
            try:
                await page.goto(BASE+route, wait_until='networkidle', timeout=30000)
                await asyncio.sleep(2)
                visible=await page.evaluate("document.body.innerText")
                visible=' '.join(visible.split())
                important=[e for e in errors[e0:] if 'google.com/g/collect' not in e and 'frame-ancestors' not in e]
                new_http=http[h0:]
                if any(t in visible for t in ERROR_TEXT):
                    status='visible_error'; notes.append('erro/404 visível')
                if important:
                    status='console_error'; notes.append(important[0][:180])
                # ignore expected Supabase 400 only if no visible break? keep notes
                if new_http:
                    notes.append('http ' + ','.join(str(x[0]) for x in new_http[:3]))
                if len(visible) < 80:
                    status='thin'; notes.append(f'pouco conteúdo visível ({len(visible)})')
                await page.screenshot(path=str((out_dir/(route.strip('/').replace('/','__') or 'home')).with_suffix('.png')), full_page=False)
                results.append({'route':route,'status':status,'len':len(visible),'notes':' | '.join(notes),'sample':visible[:300]})
            except Exception as ex:
                results.append({'route':route,'status':'exception','len':0,'notes':repr(ex),'sample':''})
        await browser.close()
    lines=['# MilesPro Route Audit — Texto Visível','', '| Rota | Status | Chars | Notas | Amostra |','|---|---:|---:|---|---|']
    for r in results:
        lines.append(f"| `{r['route']}` | **{r['status']}** | {r['len']} | {r['notes'].replace('|','/')} | {r['sample'].replace('|','/')[:180]} |")
    Path('/root/.openclaw/workspace/milespro/ROUTE_AUDIT_VISIBLE.md').write_text('\n'.join(lines))
    print('\n'.join(lines))
    print('SUMMARY', len(results), 'bad', sum(1 for r in results if r['status']!='ok'))

asyncio.run(main())
