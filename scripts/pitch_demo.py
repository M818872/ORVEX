#!/usr/bin/env python3
"""ORVEX 7-minute pitch controller."""
import os, sys, time, json, urllib.request, urllib.error
BASE_URL = os.getenv("ORVEX_API_URL", "http://127.0.0.1:8000")
DELAY = int(os.getenv("PITCH_EVENT_DELAY_SECONDS", "75"))

def request(path, method='GET'):
    req = urllib.request.Request(BASE_URL + path, method=method, headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            raw = response.read().decode('utf-8')
            return json.loads(raw) if raw else {}
    except urllib.error.URLError as exc:
        print(f'ERROR: backend unavailable at {BASE_URL}: {exc}')
        print('Start the demo backend first with scripts/start_demo_mode.sh')
        sys.exit(1)

def main():
    print('==============================================')
    print(' ORVEX — 7-MINUTE PITCH CONTROLLER')
    print(' Synthetic Enterprise Data')
    print('==============================================')
    print('[00:00] Resetting demo database...')
    reset = request('/api/demo/pitch/reset', method='POST')
    print(f"        {reset.get('message', 'Healthy baseline restored')}")
    health = request('/health')
    if health.get('status') != 'ok':
        print('ERROR: ORVEX backend health check failed.')
        sys.exit(1)
    print('[00:05] Backend healthy')
    print('[00:05] Demo database is running continuously')
    print(f'[00:05] Supplier event will be armed after {DELAY} seconds')
    print('Presenter: show the healthy dashboard and explain the problem.')
    for remaining in range(DELAY, 0, -1):
        if remaining <= 10 or remaining % 15 == 0:
            elapsed = DELAY - remaining
            print(f'[{elapsed:02d}s] Healthy enterprise feed — event in {remaining}s')
        time.sleep(1)
    print(f'[{DELAY:02d}s] Arming supplier disruption...')
    started = request('/api/demo/pitch/start', method='POST')
    print(f"        {started.get('message', 'Supplier event armed')}")
    print('        MicroTech Components / PO-8842 / MCU-742')
    print('        ETA Oct 12 -> Oct 17 (+5 days)')
    print('NOW: presenter should let the dashboard animate the real pipeline.')
    print('     INPUT -> UNDERSTAND -> CONNECT -> IMPACT -> RECOVER')
    print('     Then investigate with Copilot and manually approve recovery.')
    print('[DONE] Pitch event handed to the ORVEX pipeline.')
    print('       Keep manager approval as a live click.')

if __name__ == '__main__':
    main()
