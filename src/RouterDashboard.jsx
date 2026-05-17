/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import {
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm
} from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { Gallery } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";

import cockpit from 'cockpit';

import { formatBytes, formatDuration, serviceStatusColor } from './routerUtils.js';

const _ = cockpit.gettext;

const monitoredServices = [
    "firewalld",
    "dnsmasq",
    "unbound",
    "tailscaled",
    "wg-quick@wg0",
    "hostapd",
    "fail2ban",
    "vnstat",
    "ddclient",
    "miniupnpd",
    "nut-server"
];

const parseMeminfo = output => Object.fromEntries(output
        .split("\n")
        .filter(Boolean)
        .map(line => {
            const [key, rawValue] = line.split(":");
            return [key, Number(rawValue.trim().split(/\s+/)[0]) * 1024];
        }));

const parseDf = output => {
    const [filesystem, size, used, available, usePercent, mounted] = output.trim().split("\n")[1]?.split(/\s+/) ?? [];

    return { filesystem, size, used, available, usePercent, mounted };
};

const parseInterfaces = output => JSON.parse(output)
        .filter(device => device.ifname !== "lo")
        .map(device => ({
            name: device.ifname,
            state: device.operstate,
            mac: device.address,
            ipv4: (device.addr_info ?? [])
                    .filter(address => address.family === "inet")
                    .map(address => `${address.local}/${address.prefixlen}`)
                    .join(", ")
        }));

export const RouterDashboard = () => {
    const [system, setSystem] = useState({
        hostname: "",
        uptime: "",
        load: "",
        memoryUsed: "",
        memoryTotal: "",
        diskUsed: "",
        diskTotal: "",
        diskUsePercent: "",
        defaultRoute: ""
    });
    const [interfaces, setInterfaces] = useState([]);
    const [services, setServices] = useState([]);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchDashboard = useCallback(async () => {
        try {
            const [
                hostname,
                uptime,
                load,
                meminfo,
                disk,
                interfaceOutput,
                routeOutput,
                serviceResults
            ] = await Promise.all([
                cockpit.file("/etc/hostname").read(),
                cockpit.file("/proc/uptime").read(),
                cockpit.file("/proc/loadavg").read(),
                cockpit.file("/proc/meminfo").read(),
                cockpit.spawn(["df", "-B1", "/"], { err: "message" }),
                cockpit.spawn(["ip", "-j", "addr", "show"], { err: "message" }),
                cockpit.spawn(["ip", "-j", "route", "show", "default"], { err: "message" }),
                Promise.all(monitoredServices.map(async service => {
                    try {
                        const status = await cockpit.spawn(["systemctl", "is-active", service], { err: "ignore" });
                        return { service, status: status.trim() || "unknown" };
                    } catch {
                        return { service, status: "inactive" };
                    }
                }))
            ]);
            const memory = parseMeminfo(meminfo ?? "");
            const rootDisk = parseDf(disk);
            const routes = JSON.parse(routeOutput || "[]");
            const defaultRoute = routes[0]
                ? `${routes[0].dev ?? ""} via ${routes[0].gateway ?? ""}`.trim()
                : "";

            setSystem({
                hostname: hostname?.trim() ?? "",
                uptime: formatDuration((uptime ?? "0").split(/\s+/)[0]),
                load: (load ?? "").split(/\s+/).slice(0, 3).join(" "),
                memoryUsed: formatBytes((memory.MemTotal ?? 0) - (memory.MemAvailable ?? 0)),
                memoryTotal: formatBytes(memory.MemTotal ?? 0),
                diskUsed: formatBytes(rootDisk.used),
                diskTotal: formatBytes(rootDisk.size),
                diskUsePercent: rootDisk.usePercent ?? "",
                defaultRoute
            });
            setInterfaces(parseInterfaces(interfaceOutput));
            setServices(serviceResults);
            setMessage(null);
        } catch (exception) {
            setMessage({ variant: "danger", title: exception.message || String(exception) });
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchDashboard, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchDashboard]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="secondary" onClick={fetchDashboard}>{_("Refresh Now")}</Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Gallery hasGutter minWidths={{ default: "18rem" }}>
                <Card>
                    <CardTitle>{_("System")}</CardTitle>
                    <CardBody>
                        <DescriptionList isHorizontal>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Hostname")}</DescriptionListTerm>
                                <DescriptionListDescription>{system.hostname || _("Unknown")}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Uptime")}</DescriptionListTerm>
                                <DescriptionListDescription>{system.uptime}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Load")}</DescriptionListTerm>
                                <DescriptionListDescription>{system.load}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Default route")}</DescriptionListTerm>
                                <DescriptionListDescription>{system.defaultRoute || _("Unknown")}</DescriptionListDescription>
                            </DescriptionListGroup>
                        </DescriptionList>
                    </CardBody>
                </Card>
                <Card>
                    <CardTitle>{_("Resources")}</CardTitle>
                    <CardBody>
                        <DescriptionList isHorizontal>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Memory")}</DescriptionListTerm>
                                <DescriptionListDescription>{cockpit.format(_("$0 / $1"), system.memoryUsed, system.memoryTotal)}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Root disk")}</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {cockpit.format(_("$0 / $1 ($2)"), system.diskUsed, system.diskTotal, system.diskUsePercent)}
                                </DescriptionListDescription>
                            </DescriptionListGroup>
                        </DescriptionList>
                    </CardBody>
                </Card>
            </Gallery>
            <Card>
                <CardTitle>{_("Interfaces")}</CardTitle>
                <CardBody>
                    <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={_("Interfaces")}>
                        <thead>
                            <tr>
                                <th>{_("Name")}</th>
                                <th>{_("State")}</th>
                                <th>{_("IPv4")}</th>
                                <th>{_("MAC")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interfaces.map(device => (
                                <tr key={device.name}>
                                    <td>{device.name}</td>
                                    <td>{device.state}</td>
                                    <td>{device.ipv4}</td>
                                    <td>{device.mac}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Service Health")}</CardTitle>
                <CardBody>
                    <div className="router-admin__service-grid">
                        {services.map(item => (
                            <Label key={item.service} color={serviceStatusColor(item.status)}>
                                {cockpit.format(_("$0: $1"), item.service, item.status)}
                            </Label>
                        ))}
                    </div>
                </CardBody>
            </Card>
        </>
    );
};
