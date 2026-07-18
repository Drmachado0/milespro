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

BAD_TEXT = ['Algo deu errado', 'Oops! Page not found', 'Page not found', '404', 'ReferenceError', 'TypeError']

async def main():
    out_dir = Path('/root/.openclaw/workspace/milespro-audit-screens')
    out_dir.mkdir(exist_ok=True)
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1365, "height": 900})
        console_errors = []
        http_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.on('response', lambda r: http_errors.append((r.status, r.url)) if r.status >= 400 else None)

        await page.goto(f'{BASE}/auth', wait_until='networkidle', timeout=30000)
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.press('input[type="password"]', 'Enter')
        await asyncio.sleep(5)

        for route in ROUTES:
            start_err = len(console_errors)
            start_http = len(http_errors)
            status = 'ok'
            notes = []
            try:
                await page.goto(f'{BASE}{route}', wait_until='networkidle', timeout=30000)
                await asyncio.sleep(2.5)
                text = ((await page.text_content('body')) or '').strip()
                title = await page.title()
                url = page.url
                shot = out_dir / (route.strip('/').replace('/', '__') or 'home')
                await page.screenshot(path=str(shot.with_suffix('.png')), full_page=True)
                important_console = [e for e in console_errors[start_err:] if 'google.com/g/collect' not in e and 'frame-ancestors' not in e]
                new_http = http_errors[start_http:]
                if any(bad in text for bad in BAD_TEXT):
                    status = 'bad_text'
                    notes.append('texto de erro/404 encontrado')
                if important_console:
                    status = 'console_error'
                    notes.append('console: ' + important_console[0][:180])
                if new_http:
                    status = 'http_error'
                    notes.append('http: ' + ', '.join(f'{s}' for s,_ in new_http[:3]))
                if len(text) < 500:
                    status = 'thin'
                    notes.append(f'body curto ({len(text)} chars)')
                results.append({
                    'route': route,
                    'status': status,
                    'url': url,
                    'title': title,
                    'text_len': len(text),
                    'notes': ' | '.join(notes),
                    'text_sample': text[:220].replace('\n', ' '),
                })
            except Exception as e:
                results.append({
                    'route': route,
                    'status': 'exception',
                    'url': page.url,
                    'title': '',
                    'text_len': 0,
                    'notes': repr(e),
                    'text_sample': '',
                })
        await browser.close()

    md = ['# MilesPro Production Route Audit', '', '| Rota | Status | Tamanho | Notas |', '|---|---:|---:|---|']
    for r in results:
        md.append(f"| `{r['route']}` | **{r['status']}** | {r['text_len']} | {r['notes'].replace('|','/')} |")
    md.append('\n## Samples\n')
    for r in results:
        if r['status'] != 'ok':
            md.append(f"### {r['route']} — {r['status']}\n{r['notes']}\n\n{r['text_sample']}\n")
    Path('/root/.openclaw/workspace/milespro/ROUTE_AUDIT_RAW.md').write_text('\n'.join(md))
    print('\n'.join(md[:80]))
    bad = [r for r in results if r['status'] != 'ok']
    print(f"\nSUMMARY total={len(results)} bad={len(bad)}")
    for r in bad:
        print(r['route'], r['status'], r['notes'])

asyncio.run(main())
