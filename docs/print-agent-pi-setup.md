# Print agent — Raspberry Pi setup

`apps/print-agent` is the warehouse label-print daemon. It polls the Medusa
backend for print jobs, downloads the Shiprocket-hosted label (PDF or ZPL),
sends it to a printer, and acks the job back. It has **zero runtime
dependencies** — only Node's built-in `fetch`, `fs`, and `child_process`.
Everything below assumes a Raspberry Pi running headless next to the packing
station, but the same steps work on any Linux box with a USB or network
printer.

## Why the queue survives a Pi reboot / power loss

The job queue lives entirely on the backend (`print_job` table). The agent
holds no state of its own beyond an in-memory poll loop — if the Pi is
unplugged, rebooted, or replaced outright, nothing is lost. On restart the
agent simply resumes polling `/wms/print-agent/poll`, which re-releases any
jobs still `pending` (and, per the backend's retry rule, jobs that failed
fewer than 3 times get auto-retried). **Killing the Pi mid-shift is a
non-event**: bring it back up, and the backlog drains on its own.

## 1. Flash the OS

Use Raspberry Pi Imager to flash **Raspberry Pi OS Lite (64-bit)**. In the
imager's advanced options (gear icon / Ctrl+Shift+X):
- enable SSH, set a password or your public key
- set hostname (e.g. `controlkart-print-01`)
- configure Wi-Fi if not using Ethernet

Boot the Pi and `ssh` in.

## 2. Install Node 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # v20.x
```

## 3. Get the built agent onto the Pi

Do **not** clone the whole monorepo onto the Pi — build on your dev machine
or in CI and ship only the compiled output. From the monorepo root:

```bash
pnpm --filter @controlkart/print-agent build
```

This produces `apps/print-agent/dist/`. Two ways to get it onto the Pi:

**Option A — pnpm deploy (recommended for repeatable installs):**

```bash
pnpm --filter @controlkart/print-agent... deploy --prod /tmp/print-agent-deploy
scp -r /tmp/print-agent-deploy pi@controlkart-print-01:/opt/controlkart/print-agent
```

Because the package has zero runtime `dependencies`, the deployed folder is
just `dist/`, `package.json`, and an (empty) `node_modules/` — no build
toolchain needed on the Pi.

**Option B — plain copy (fine for a one-off / quick iteration):**

```bash
scp -r apps/print-agent/dist apps/print-agent/package.json \
  pi@controlkart-print-01:/opt/controlkart/print-agent
```

On the Pi:

```bash
sudo mkdir -p /opt/controlkart/print-agent
sudo chown pi:pi /opt/controlkart/print-agent
# (copy dist/ + package.json here via scp/rsync as above)
```

> Note on the `dev` script: since this package intentionally has zero
> runtime dependencies (no `tsx`/`ts-node` as a *runtime* dep), `pnpm dev`
> simply runs `tsc && node dist/index.js` — it compiles then runs the
> compiled output, rather than executing TypeScript directly. This is also
> exactly what happens in production, just pre-built and shipped instead of
> compiled on the Pi.

## 4. Create the environment file

```bash
sudo mkdir -p /etc/controlkart
sudo tee /etc/controlkart/print-agent.env > /dev/null <<'EOF'
WMS_BACKEND_URL=https://api.controlkart.example.com
WMS_PRINT_AGENT_TOKEN=<the print-agent token from Medusa admin/env>
POLL_INTERVAL_MS=15000
WMS_PRINT_DRIVER=mock
ZEBRA_DEVICE_PATH=/dev/usb/lp0
# CUPS_PRINTER_NAME=zebra-zd230
EOF
sudo chmod 600 /etc/controlkart/print-agent.env
sudo chown root:pi /etc/controlkart/print-agent.env
```

Start with `WMS_PRINT_DRIVER=mock` to verify the poll loop end-to-end before
touching a real printer (see step 6).

## 5. Enable the systemd unit

The unit file lives at `apps/print-agent/systemd/print-agent.service` in the
repo. Copy it onto the Pi and enable it:

```bash
sudo cp print-agent.service /etc/systemd/system/print-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now print-agent
sudo systemctl status print-agent
journalctl -u print-agent -f
```

Key properties of the unit (see the file for the full config):
- `Restart=always`, `RestartSec=10` — the Pi's `Restart=always` supervisor
  brings the agent back after a crash or `apt upgrade` reboot.
- `EnvironmentFile=/etc/controlkart/print-agent.env` — keeps the token out
  of the unit file / version control.
- `User=pi` — runs unprivileged; the `pi` user needs `lp`/USB device
  permissions (see step 7).

## 6. Verify with the mock driver

With `WMS_PRINT_DRIVER=mock` still set, watch the logs:

```bash
journalctl -u print-agent -f
```

You should see startup config logged (never the token), then poll cycles.
Trigger a print job from the warehouse app / admin and confirm a file shows
up under `/opt/controlkart/print-agent/out/<job id>.pdf` (or `.zpl`) and the
job transitions to `done` in the backend.

If you see `AUTH/CONFIG ERROR` in the logs, the token in
`/etc/controlkart/print-agent.env` doesn't match what the backend expects —
fix the env file and `sudo systemctl restart print-agent`; the daemon does
**not** exit on auth errors, it just keeps retrying at a fixed 60s interval
until the env is fixed.

## 7. Switch to the real Zebra ZD230

1. Plug the ZD230 into the Pi via USB.
2. Find the device path:
   ```bash
   ls -l /dev/usb/lp*
   # or, more robustly:
   dmesg | tail -30   # look for "usblp" attach lines
   ```
   It's usually `/dev/usb/lp0`. If multiple USB printers are ever attached,
   confirm which one via `udevadm info -a /dev/usb/lp0` (check
   `idVendor`/`idProduct` against Zebra's `0a5f`).
3. Grant the `pi` user permission to write to the device — add a udev rule
   rather than relying on ad hoc `chmod`:
   ```bash
   sudo tee /etc/udev/rules.d/99-zebra-usb.rules > /dev/null <<'EOF'
   SUBSYSTEM=="usbmisc", ATTRS{idVendor}=="0a5f", MODE="0660", GROUP="lp"
   KERNEL=="lp[0-9]*", SUBSYSTEM=="usb", MODE="0660", GROUP="lp"
   EOF
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   sudo usermod -aG lp pi
   ```
   Log out/in (or reboot) for the group change to apply.
4. Update the env file and restart:
   ```bash
   sudo sed -i 's/^WMS_PRINT_DRIVER=.*/WMS_PRINT_DRIVER=zebra-usb/' /etc/controlkart/print-agent.env
   sudo systemctl restart print-agent
   ```
5. Print a test label from the warehouse flow and confirm it comes out of
   the ZD230. If a job fails with "zebra-usb driver cannot print pdf labels
   directly," that shipment's label came back as a PDF from Shiprocket —
   either accept those failures (they'll retry twice more, per the
   backend's 3-attempt rule, then need manual handling) or switch to the
   `cups` driver below, which handles both PDF and ZPL.

### Alternative: CUPS driver (handles PDF and ZPL, needed if Shiprocket
### sometimes returns PDF labels for this printer)

```bash
sudo apt-get install -y cups printer-driver-zebra-zpl # or the appropriate driver
sudo usermod -aG lpadmin pi
# Add the printer via CUPS web UI (https://<pi>:631) or lpadmin, note its
# queue name, then:
sudo sed -i 's/^WMS_PRINT_DRIVER=.*/WMS_PRINT_DRIVER=cups/' /etc/controlkart/print-agent.env
echo 'CUPS_PRINTER_NAME=<queue name>' | sudo tee -a /etc/controlkart/print-agent.env
sudo systemctl restart print-agent
```

## Troubleshooting

- **Agent won't start / exits immediately**: it fails fast on missing
  `WMS_BACKEND_URL` or `WMS_PRINT_AGENT_TOKEN` with a clear error in
  `journalctl -u print-agent`. This is the only case where the agent exits
  on its own — every other error (network, 401, 503, print failures) is
  retried forever.
- **Nothing prints but the backend shows jobs releasing**: check
  `WMS_PRINT_DRIVER` — if it's still `mock`, labels are written to
  `./out/` instead of a real printer.
- **Reboot / power-cycle the Pi mid-shift**: expected to be safe. The queue
  is server-side; the agent just resumes polling and the backlog drains.
