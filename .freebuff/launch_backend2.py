import subprocess, sys, time, os

# Clear any PORT env that might be set
env = os.environ.copy()
env['PORT'] = '5000'

proc = subprocess.Popen(
    [sys.executable, 'server.py'],
    cwd=r'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend',
    env=env,
    creationflags=0x08000000,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

print(f'Server launched PID: {proc.pid}')
time.sleep(4)
if proc.poll() is not None:
    print(f'Process exited with code {proc.returncode}')
else:
    print(f'Process still alive')
