import subprocess, os, sys, time

backend_dir = r"D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend"
frontend_dir = r"D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\frontend"
backend_log = r"D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log"
backend_err = r"D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log.err"
frontend_log = r"D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log"
frontend_err = r"D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log.err"

# Start backend
with open(backend_log, 'w') as blog, open(backend_err, 'w') as berr:
    bp = subprocess.Popen(
        ['python', 'server.py'],
        cwd=backend_dir,
        env={**os.environ, 'PORT': '5000'},
        stdout=blog, stderr=berr,
        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    )
print(f"Backend PID: {bp.pid}")

# Start frontend
with open(frontend_log, 'w') as flog, open(frontend_err, 'w') as ferr:
    fp = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=frontend_dir,
        stdout=flog, stderr=ferr,
        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    )
print(f"Frontend PID: {fp.pid}")
