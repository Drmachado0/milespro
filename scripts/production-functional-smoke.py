import asyncio
import os
import re
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

BASE=os.environ.get('MILESPRO_BASE_URL', 'https://app.milespro.net.br').rstrip('/')
EMAIL=os.environ.get('MILESPRO_AUDIT_EMAIL')
PASSWORD=os.environ.get('MILESPRO_AUDIT_PASSWORD')
HAS_AUTH=bool(EMAIL and PASSWORD)

ROUTES = [
  '/dashboard', '/titulares', '/gestao/cartoes', '/gestao/clube-assinante', '/gestao/precos-programas',
  '/operacoes/visao-geral', '/lancamentos/entrada', '/lancamentos/saida-manual', '/lancamentos/passagem-emitida',
  '/gestao/bonus-pendentes', '/lancamentos/sala-vip', '/agencia/venda', '/lancamentos/compra-turbinada',
  '/lancamentos/compra', '/lancamentos/compra-carrinho', '/lancamentos/bumerangue', '/lancamentos/transferencia',
  '/lancamentos/transferencia-cartao', '/simulador', '/agencia/calendario', '/agencia/passagens', '/agencia/hoteis',
  '/agencia/carros', '/agencia/cruzeiros', '/agencia/seguros', '/agencia/atracoes', '/agencia/transportes',
  '/agencia/contas-receber', '/agencia/configuracoes', '/analises', '/relatorios/economia', '/relatorios/passagens',
  '/relatorios/cartoes', '/relatorios', '/conquistas', '/alertas', '/sistema/programas', '/sistema/limite-cpf',
  '/admin/blog', '/configuracoes', '/assinatura'
]

PUBLIC = ['/', '/auth', '/blog', '/sobre', '/termos', '/privacidade']
PROTECTED_REDIRECT_CHECKS = ['/dashboard', '/analises', '/admin/blog']
ERROR_TEXT = ['Algo deu errado', 'Oops! Page not found', 'Page not found', 'Return to Home', 'ReferenceError', 'TypeError']

async def visible(page):
    return ' '.join(((await page.evaluate('document.body.innerText')) or '').split())

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1365, "height": 900})
        page = await ctx.new_page()
        console_errors=[]; http_errors=[]
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and 'google.com/g/collect' not in msg.text and 'frame-ancestors' not in msg.text else None)
        page.on('response', lambda r: http_errors.append((r.status,r.url)) if r.status >= 400 and '/rest/v1/subscription_leads' not in r.url else None)

        print('PUBLIC')
        for r in PUBLIC:
            e0=len(console_errors); h0=len(http_errors)
            await page.goto(BASE+r, wait_until='networkidle', timeout=30000)
            txt=await visible(page)
            bad=[x for x in ERROR_TEXT if x in txt]
            min_chars=80 if r == '/auth' else 300
            print(r, 'OK' if len(txt)>min_chars and not bad and len(console_errors)==e0 else 'CHECK', 'chars', len(txt), 'new_console', len(console_errors)-e0, 'new_http', len(http_errors)-h0)

        # Landing pricing CTA: should route to /auth with plan intent, not break
        await page.goto(BASE+'/', wait_until='networkidle')
        try:
            await page.get_by_role('button', name=re.compile(r'Plus|Assinar|Começar', re.I)).first.click(timeout=5000)
            await page.wait_for_timeout(1500)
            print('landing_cta_url', page.url)
        except Exception as ex:
            print('landing_cta_CHECK', repr(ex)[:180])

        if not HAS_AUTH:
            print('AUTH_SKIPPED Set MILESPRO_AUDIT_EMAIL and MILESPRO_AUDIT_PASSWORD to run authenticated route checks.')
            print('PROTECTED_REDIRECTS')
            for r in PROTECTED_REDIRECT_CHECKS:
                e0=len(console_errors); h0=len(http_errors)
                try:
                    await page.goto(BASE+r, wait_until='networkidle', timeout=30000)
                    await page.wait_for_timeout(1200)
                    txt=await visible(page)
                    redirected_to_auth='/auth' in page.url
                    has_auth_copy=bool(re.search(r'entrar|login|email|senha', txt, re.I))
                    important_console=console_errors[e0:]
                    new_http=http_errors[h0:]
                    status='OK' if redirected_to_auth and has_auth_copy and not important_console else 'CHECK'
                    notes=[]
                    if not redirected_to_auth: notes.append('url=' + page.url)
                    if not has_auth_copy: notes.append('auth_copy_missing')
                    if important_console: notes.append('console=' + important_console[0][:120])
                    if new_http: notes.append('http=' + ','.join(str(x[0]) for x in new_http[:3]))
                    print(r, status, 'chars', len(txt), '; '.join(notes))
                except Exception as ex:
                    print(r, 'EXCEPTION', repr(ex)[:180])
            await browser.close()
            return

        await page.goto(BASE+'/auth', wait_until='networkidle', timeout=30000)
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.press('input[type="password"]', 'Enter')
        await page.wait_for_timeout(5000)
        print('login_url', page.url)

        if '/auth' in page.url:
            print('AUTH_CHECK Login did not leave /auth; skipping authenticated route checks.')
            await browser.close()
            return

        print('APP_ROUTES')
        bad_routes=[]
        for r in ROUTES:
            e0=len(console_errors); h0=len(http_errors)
            try:
                await page.goto(BASE+r, wait_until='networkidle', timeout=30000)
                await page.wait_for_timeout(1200)
                txt=await visible(page)
                bad=[x for x in ERROR_TEXT if x in txt]
                status='OK' if len(txt)>250 and not bad and len(console_errors)==e0 else 'CHECK'
                # Ignore known agency settings 400 if visible page is OK? Keep as note.
                notes=[]
                if bad: notes.append('bad_text=' + ','.join(bad))
                if len(console_errors)>e0: notes.append('console=' + console_errors[e0][:120])
                if len(http_errors)>h0: notes.append('http=' + ','.join(str(x[0]) for x in http_errors[h0:h0+3]))
                print(r, status, 'chars', len(txt), '; '.join(notes))
                if status!='OK': bad_routes.append((r, notes))
            except Exception as ex:
                print(r, 'EXCEPTION', repr(ex)[:180]); bad_routes.append((r, [repr(ex)]))

        # Critical interactions: open buttons/dialogs without saving
        print('INTERACTIONS')
        checks = [
            ('/titulares', ['Novo Titular', 'Adicionar Titular']),
            ('/gestao/cartoes', ['Novo Cartão', 'Adicionar Cartão']),
            ('/lancamentos/entrada', ['Salvar', 'Registrar']),
            ('/simulador', ['Compra/Venda', 'Transferências', 'Cartões']),
            ('/assinatura', ['Mensal', 'Semestral', 'Anual']),
        ]
        for route, labels in checks:
            await page.goto(BASE+route, wait_until='networkidle', timeout=30000)
            await page.wait_for_timeout(1000)
            results=[]
            for label in labels:
                try:
                    loc=page.get_by_role('button', name=re.compile(re.escape(label), re.I)).first
                    await loc.click(timeout=3000)
                    await page.wait_for_timeout(500)
                    results.append(label+':OK')
                except Exception:
                    results.append(label+':MISS')
            print(route, ', '.join(results))

        print('SUMMARY bad_routes', len(bad_routes), bad_routes[:10], 'console_errors_total', len(console_errors), 'http_errors_total', len(http_errors))
        await browser.close()

asyncio.run(main())
