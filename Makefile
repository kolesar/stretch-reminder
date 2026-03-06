.PHONY: dev preview build clean

# ── Development ──────────────────────────────────────────────
# Compile and open in the ZeppOS Simulator (simulator must be running).
dev:
	zeus dev compile preview

# Generate a QR code — scan with the Zepp mobile app to sideload onto a real watch.
# Requires: zeus login (one-time)
preview:
	zeus preview

# ── Release build ────────────────────────────────────────────
# Compile and package into dist/*.zpk ready for Zepp OS Store upload.
build:
	zeus build

# ── Housekeeping ─────────────────────────────────────────────
# Remove build artefacts (dist/ contents).
clean:
	rm -rf dist/*
	@echo "dist/ cleaned."
