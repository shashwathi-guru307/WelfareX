"""
Launch backend and frontend servers detached on Windows.
Run with: python launch_servers.py
"""
import subprocess
import os
import time
import sys

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.join(os.path.dirname(LOG_DIR), "nalavariyam-smart-welfare-assistant")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

print(f"Log dir: {LOG_DIR}")
print(f"Project root: {PROJECT_ROOT}")

# Kill any existing processes on ports 5000 and 5173
for port in [5000, 5173]:
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split("\n"):
            if f":{port} " in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                print(f"Killing process {pid} on port {port}")
                subprocess.run(["taskkill", "/F", "/PID", pid],
                               capture_output=True, timeout=5)
    except Exception:
        pass

# Start backend with PORT=5000
backend_log = os.path.join(LOG_DIR, "backend.log")
backend_err = os.path.join(LOG_DIR, "backend.log.err")

env = os.environ.copy()
env["PORT"] = "5000"

print("Starting backend on port 5000...")
with open(backend_log, "w") as blog, open(backend_err, "w") as berr:
    be_proc = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=BACKEND_DIR,
        stdout=blog,
        stderr=berr,
        env=env,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
print(f"Backend PID: {be_proc.pid}")

# Wait for backend to start
time.sleep(3)

# Start frontend
frontend_log = os.path.join(LOG_DIR, "frontend.log")
frontend_err = os.path.join(LOG_DIR, "frontend.log.err")

npm_cmd = "npm.cmd"

print("Starting frontend on port 5173...")
with open(frontend_log, "w") as flog, open(frontend_err, "w") as ferr:
    fe_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=flog,
        stderr=ferr,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
print(f"Frontend PID: {fe_proc.pid}")

# Wait for frontend to be ready
time.sleep(5)

# Verify processes
be_alive = be_proc.poll() is None
fe_alive = fe_proc.poll() is None
print(f"Backend alive: {be_alive}")
print(f"Frontend alive: {fe_alive}")

if be_alive:
    print(f"Backend PID confirmed: {be_proc.pid}")
if fe_alive:
    print(f"Frontend PID confirmed: {fe_proc.pid}")

# Show any errors
for name, path in [("backend.log.err", backend_err), ("frontend.log.err", frontend_err)]:
    if os.path.exists(path):
        content = open(path).read().strip()
        if content:
            print(f"--- {name} ---")
            print(content[:1000])

print("Done.")
