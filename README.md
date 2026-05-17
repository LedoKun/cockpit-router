# Router Admin

Router Admin is a Cockpit module for administering a Fedora IoT router from the
Cockpit web console.

The module is installed as `router-admin` and appears in Cockpit as
**Router Admin**. Its manifest requires superuser mode so the backend commands
run with the privileges needed to manage system services and network
configuration.

## Current Features

- Overview dashboard for uptime, load, memory, disk, interfaces, routes, and service health
- Network status, upstream details, connection count, and DNS leases
- DNSMasq service control and `/etc/dnsmasq.conf` editor
- Unbound service control, config editor, and Hagezi RPZ blocklist downloads
- NUT UPS metrics and `/etc/ups/ups.conf` editor
- MiniUPnP service control, config editor, and active mapping view
- Fail2Ban service control and SSH jail unban action
- Tailscale service control, status view, peer table, and Unbound tailnet DNS helper
- Firewall NAT masquerading and port-forward management for the `external` zone
- SQM/Cake QoS apply, clear, and `tc` status view
- VNStat bandwidth tables by interface, day, and month
- On-demand diagnostics for ping, traceroute, and DNS lookup
- DDNS service control, config editor, and forced ddclient update
- WireGuard service control, config editor, and `wg show` status view
- Wireless AP service control, hostapd config editor, and connected client list

## Host Requirements

Install Cockpit and whichever services you want this UI to manage:

```sh
sudo dnf install cockpit firewalld dnsmasq unbound fail2ban tailscale wireguard-tools \
  vnstat ddclient hostapd miniupnpc nut traceroute bind-utils iproute
```

The UI assumes these service names and files:

| Module | Service | Main file or command |
| --- | --- | --- |
| DNSMasq | `dnsmasq` | `/etc/dnsmasq.conf` |
| Unbound | `unbound` | `/etc/unbound/unbound.conf` |
| NUT UPS | `nut-server` | `/etc/ups/ups.conf`, `upsc ups` |
| MiniUPnP | `miniupnpd` | `/etc/miniupnpd/miniupnpd.conf`, `upnpc -l` |
| Fail2Ban | `fail2ban` | `fail2ban-client status sshd` |
| Tailscale | `tailscaled` | `tailscale status --json` |
| Firewall NAT | `firewalld` | `firewall-cmd --zone=external` |
| SQM QoS | none | `tc qdisc` |
| Bandwidth Stats | `vnstat` | `vnstat --json` |
| DDNS | `ddclient` | `/etc/ddclient.conf` |
| WireGuard | `wg-quick@wg0` | `/etc/wireguard/wg0.conf`, `wg show` |
| Wireless AP | `hostapd` | `/etc/hostapd/hostapd.conf`, `hostapd_cli all_sta` |

## Build

Install development dependencies:

```sh
sudo dnf install gettext nodejs npm make
npm install
```

Build the module:

```sh
make
```

The build output is written to `dist/`.

This starter-derived repository fetches shared Cockpit build helpers into
`pkg/lib` the first time `make` runs. If `npm run build` fails with a missing
`pkg/lib/cockpit-po-plugin.js`, run `make` or allow the Makefile to fetch the
Cockpit helper files.

## Install For Development

```sh
make devel-install
```

Then open Cockpit and reload the browser page. The module is linked into:

```sh
~/.local/share/cockpit/router-admin
```

To remove the development install:

```sh
make devel-uninstall
```

## Production Install

```sh
sudo make install PREFIX=/usr
sudo systemctl restart cockpit
```

## Development Workflow

Run checks:

```sh
npm run eslint
npm run stylelint
```

Run a focused bundle check without Cockpit runtime modules:

```sh
npx esbuild src/index.tsx --bundle --external:cockpit \
  --external:cockpit-dark-theme --external:*.scss --outfile=/tmp/router-admin.js
```

Watch mode:

```sh
make watch
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Operations Guide](docs/OPERATIONS.md)
- [Maintenance Notes](docs/MAINTENANCE.md)
