import subprocess, sys, time

proc = subprocess.Popen(
    [sys.executable, 'server.py'],
    cwd=r'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

time.sleep(5)
if proc.poll() is not None:
    out = proc.stdout.read().decode() if proc.stdout else ''
    err = proc.stderr.read().decode() if proc.stderr else ''
    print(f'EXITS CODE: {proc.returncode}')
    print(f'STDOUT: {out[:2000]}')
    print(f'STDERR: {err[:2000]}')
else:
    out = proc.stdout.read1(2000).decode() if hasattr(proc.stdout, 'read1') else ''
    err = proc.stderr.read1(2000).decode() if hasattr(proc.stderr, 'read1') else ''
    print(f'SERVER RUNNING PID: {proc.pid}')
    print(f'STDOUT: {out[:1000]}')
    print(f'STDERR: {err[:1000]}')
    proc.kill()
