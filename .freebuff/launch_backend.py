import subprocess, sys, time, os

proc = subprocess.Popen(
    [sys.executable, 'server.py'],
    cwd=r'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend',
    creationflags=0x08000000,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.PIPE,
)

# Wait and check
time.sleep(5)
if proc.poll() is not None:
    err = proc.stderr.read().decode() if proc.stderr else ''
    print(f'FAILED: process exited with code {proc.returncode}')
    print(f'Stderr: {err[:1000]}')
else:
    print(f'Server running PID: {proc.pid}')
