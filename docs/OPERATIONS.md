# Operations Guide

This guide describes the operational behavior of each Router Admin page.

## Overview

Runs:

- reads `/etc/hostname`
- reads `/proc/uptime`
- reads `/proc/loadavg`
- reads `/proc/meminfo`
- `df -B1 /`
- `ip -j addr show`
- `ip -j route show default`
- `systemctl is-active` for monitored router services

Displays uptime, load, memory, root disk usage, default route, interfaces, and
service health. Auto-refresh runs every 15 seconds.

## Network Status

Runs:

- `nmcli -j device show`
- `wc -l /proc/net/nf_conntrack`
- reads `/var/lib/dnsmasq/dnsmasq.leases`

Displays upstream protocol, IP, gateway, DNS, device, MAC, active connection
count, and active DNS leases.

## DNSMasq

Controls `dnsmasq` with `systemctl start|stop|restart|reload`.

Edits:

- `/etc/dnsmasq.conf`

Saving the file reloads `dnsmasq`.

## Unbound

Controls `unbound` with `systemctl start|stop|restart`.

Edits:

- `/etc/unbound/unbound.conf`

The editor ensures the Hagezi RPZ include stanza is present:

```conf
rpz:
    name: "hagezi"
    zonefile: "/etc/unbound/hagezi-*.rpz"
```

The adblock updater removes old `/etc/unbound/hagezi-*.rpz` files, downloads
selected lists, and restarts Unbound.

## NUT UPS

Controls `nut-server` with `systemctl restart`.

Edits:

- `/etc/ups/ups.conf`

Metrics come from `upsc ups` and display `battery.charge`, `ups.load`, and
`ups.status`.

## MiniUPnP

Controls `miniupnpd` with `systemctl restart`.

Edits:

- `/etc/miniupnpd/miniupnpd.conf`

Active mappings come from:

```sh
upnpc -l
```

## Fail2Ban

Controls `fail2ban` with `systemctl start|stop|restart`.

Reads SSH jail status with:

```sh
fail2ban-client status sshd
```

The Unban action runs:

```sh
fail2ban-client set sshd unbanip <IP>
```

## Tailscale

Controls `tailscaled` with `systemctl start|stop|restart`.

Runs:

- `tailscale up`
- `tailscale down`
- `tailscale status --json`

The Tailnet DNS helper writes or clears:

```conf
server:
  domain-insecure: "ts.net"
forward-zone:
  name: "ts.net"
  forward-addr: 100.100.100.100
```

at:

```sh
/etc/unbound/conf.d/tailscale.conf
```

Then it restarts Unbound.

## Firewall NAT

Uses the `external` firewalld zone.

Masquerading:

- read: `firewall-cmd --zone=external --query-masquerade`
- enable: `firewall-cmd --zone=external --add-masquerade --permanent`
- disable: `firewall-cmd --zone=external --remove-masquerade --permanent`
- apply: `firewall-cmd --reload`

Port forwarding:

- read: `firewall-cmd --list-forward-ports --zone=external`
- add: `firewall-cmd --zone=external --add-forward-port=... --permanent`
- apply: `firewall-cmd --reload`

## SQM QoS

Lists interfaces with:

```sh
ls /sys/class/net/
```

Apply deletes the current root qdisc and adds Cake:

```sh
tc qdisc del dev <interface> root
tc qdisc add dev <interface> root cake bandwidth <upload>mbit
```

Clear deletes the root qdisc.

Status comes from:

```sh
tc -s qdisc show dev <interface>
```

## Bandwidth Stats

Controls `vnstat` with `systemctl start|stop|restart`.

Reads JSON data from:

```sh
vnstat --json
```

Daily and monthly tables are rendered per interface.

## Diagnostics

Runs on demand:

- `ping -c 4 <target>`
- `traceroute <target>`
- `dig <target>`

Output is shown in a terminal-styled block.

## DDNS

Controls `ddclient` with `systemctl start|stop|restart`.

Edits:

- `/etc/ddclient.conf`

Force Update runs:

```sh
ddclient -daemon=0 -debug -verbose -noquiet
```

## WireGuard

Controls `wg-quick@wg0` with `systemctl start|stop|restart`.

Edits:

- `/etc/wireguard/wg0.conf`

Status comes from:

```sh
wg show
```

## Wireless AP

Controls `hostapd` with `systemctl start|stop|restart`.

Edits:

- `/etc/hostapd/hostapd.conf`

Connected clients come from:

```sh
hostapd_cli all_sta
```

MAC address lines are extracted and shown as a list.
