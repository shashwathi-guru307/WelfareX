#!/usr/bin/env bash
# ============================================================
# Nalavariyam Smart Welfare Assistant — Firebase Deployment
# ============================================================
# Usage:
#   ./deploy.sh              # Deploy everything (functions + hosting)
#   ./deploy.sh hosting      # Deploy frontend only
#   ./deploy.sh functions    # Deploy backend only
#   ./deploy.sh storage      # Deploy storage rules only
#   ./deploy.sh init         # First-time setup
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- Check prerequisites ----

check_firebase() {
  if ! command -v firebase &>/dev/null; then
    error "Firebase CLI not found. Install it: npm install -g firebase-tools"
  fi
  log "Firebase CLI found: $(firebase --version)"
}

check_node() {
  if ! command -v node &>/dev/null; then
    error "Node.js not found. Install Node.js 18+."
  fi
  log "Node.js found: $(node --version)"
}

# ---- Build frontend ----

build_frontend() {
  log "Building frontend..."
  cd frontend
  npm install --legacy-peer-deps
  npm run build
  cd ..
  log "Frontend built successfully → frontend/dist/"
}

# ---- Deploy functions ----

deploy_functions() {
  log "Deploying Cloud Functions..."
  firebase deploy --only functions
  log "Cloud Functions deployed."
}

# ---- Deploy hosting ----

deploy_hosting() {
  build_frontend
  log "Deploying to Firebase Hosting..."
  firebase deploy --only hosting
  log "Hosting deployed."
}

# ---- Deploy storage rules ----

deploy_storage() {
  log "Deploying Storage rules..."
  firebase deploy --only storage
  log "Storage rules deployed."
}

# ---- First-time initialization ----

init_project() {
  log "Running first-time Firebase setup..."

  check_firebase

  # Check if already initialized
  if [[ -f ".firebaserc" ]]; then
    warn ".firebaserc already exists. Skipping project linking."
    warn "Edit .firebaserc manually if you need to change the project ID."
  else
    firebase init
  fi

  log ""
  log "Next steps:"
  log "  1. Edit .firebaserc with your Firebase project ID"
  log "  2. Set environment variables: firebase functions:config:set ..."
  log "  3. Create Cloud SQL instance in Google Cloud Console"
  log "  4. Deploy: ./deploy.sh"
  log ""
  log "See docs/FIREBASE_DEPLOYMENT.md for full instructions."
}

# ---- Main ----

TARGET="${1:-all}"

check_firebase
check_node

case "$TARGET" in
  init)
    init_project
    ;;
  hosting)
    deploy_hosting
    ;;
  functions)
    deploy_functions
    ;;
  storage)
    deploy_storage
    ;;
  all)
    build_frontend
    log "Deploying all Firebase services..."
    firebase deploy
    log ""
    log "✅ Deployment complete!"
    log "   Frontend: https://$(firebase functions:config:get 2>/dev/null | grep -o '"default".*' || echo 'your-project-id').web.app"
    ;;
  *)
    error "Unknown target: $TARGET. Usage: ./deploy.sh [init|hosting|functions|storage|all]"
    ;;
esac
