#!/usr/bin/env python3
"""The ONLY way to deploy: build -> full test suite -> deploy -> wait for the edge -> live smoke tests.
If any test fails, nothing is deployed.

  export CLOUDFLARE_API_TOKEN=...   (Pages: Edit)
  python3 scripts/deploy.py
"""
import os, re, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '0517f7bca23475767878e5f4e6d85c35')
PROJECT = 'gameindubai'


def step(msg): print(f'\n=== {msg} ===', flush=True)


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, **kw)
    if r.returncode: sys.exit(f'\nSTOPPED: {" ".join(cmd)} failed; nothing was deployed.' if 'wrangler' not in cmd else '\nDeploy command failed.')


if not os.environ.get('CLOUDFLARE_API_TOKEN'): sys.exit('Set CLOUDFLARE_API_TOKEN first.')
step('1/4 build');                run([sys.executable, 'build_site.py'])
step('2/4 test (must all pass)'); run([sys.executable, '-m', 'pytest', '-q'])
step('3/4 deploy');               run(['npx', '--yes', 'wrangler@4', 'pages', 'deploy', 'site', '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'],
                                      env={**os.environ, 'CLOUDFLARE_ACCOUNT_ID': ACCOUNT, 'WRANGLER_SEND_METRICS': 'false'})
want = re.search(r'gid-[0-9a-f]+', (ROOT / 'site/sw.js').read_text()).group(0)
for i in range(40):
    try:
        live = urllib.request.urlopen(urllib.request.Request('https://gameindubai.com/sw.js', headers={'User-Agent': 'deploy'}), timeout=15).read().decode()
        if want in live: break
    except Exception: pass
    time.sleep(5)
else: sys.exit('Deployed, but the live site never started serving this build (check Cloudflare).')
step('4/4 live smoke tests');     run([sys.executable, '-m', 'pytest', '-q', '-m', 'live'])
print('\nDEPLOYED AND VERIFIED:', want)
