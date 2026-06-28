.PHONY: all ci test test-frontend test-backend typecheck lint format build clean help

# ─── Default target ────────────────────────────────────────────────
all: ci

# ─── Full CI pipeline (matches GitHub Actions) ────────────────────
ci: typecheck lint test build
	@echo ""
	@echo "✅ All checks passed"

# ─── Tests ─────────────────────────────────────────────────────────
test: test-frontend test-backend

test-frontend:
	@echo "━━━ Frontend tests ━━━"
	npm test

test-backend:
	@echo "━━━ Backend tests ━━━"
	cd worker && npm test

# ─── Type-check ────────────────────────────────────────────────────
typecheck:
	@echo "━━━ Frontend type-check ━━━"
	npm run typecheck
	@echo "━━━ Backend type-check ━━━"
	cd worker && npm run typecheck

# ─── Lint ──────────────────────────────────────────────────────────
lint:
	@echo "━━━ Frontend lint ━━━"
	npm run lint
	@echo "━━━ Backend lint ━━━"
	cd worker && npm run lint

# ─── Format ────────────────────────────────────────────────────────
format:
	@echo "━━━ Frontend format ━━━"
	npm run format
	@echo "━━━ Backend format ━━━"
	cd worker && npm run format

# ─── Build ─────────────────────────────────────────────────────────
build:
	@echo "━━━ Frontend build ━━━"
	npm run build

# ─── Coverage ──────────────────────────────────────────────────────
coverage:
	@echo "━━━ Frontend coverage ━━━"
	npm run test:coverage
	@echo "━━━ Backend coverage ━━━"
	cd worker && npm run test:coverage

# ─── Install ───────────────────────────────────────────────────────
install:
	npm ci
	cd worker && npm ci

# ─── Clean ─────────────────────────────────────────────────────────
clean:
	rm -rf node_modules dist coverage
	rm -rf worker/node_modules worker/coverage

# ─── Help ──────────────────────────────────────────────────────────
help:
	@echo "Available targets:"
	@echo "  all (default) - Run full CI pipeline: typecheck + test + build"
	@echo "  ci            - Same as 'all'"
	@echo "  test          - Run all tests (frontend + backend)"
	@echo "  test-frontend - Run frontend tests only"
	@echo "  test-backend  - Run backend tests only"
	@echo "  typecheck     - Run TypeScript type-checking for both projects"
	@echo "  lint          - Run ESLint for frontend and backend"
	@echo "  format        - Run Prettier for frontend and backend"
	@echo "  build         - Build the frontend for production"
	@echo "  coverage      - Run tests with coverage reporting"
	@echo "  install       - Install dependencies for both projects"
	@echo "  clean         - Remove node_modules, dist, and coverage"
	@echo "  help          - Show this help"
