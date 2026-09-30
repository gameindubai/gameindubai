"""The play counter / top score API (_worker.js), run in Node against an in-memory D1 stand-in."""
import subprocess
from conftest import ROOT, LIVE_IDS


def test_worker_api(built_site):
    r = subprocess.run(['node', str(ROOT / 'tests' / 'worker_test.mjs'), str(built_site / '_worker.js'), ','.join(LIVE_IDS)],
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stdout[-2000:] + r.stderr[-2000:]
