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
import { Gallery } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;

const emptyUpstream = {
    protocol: "",
    ip: "",
    gateway: "",
    dns1: "",
    dns2: "",
    deviceName: "",
    mac: ""
};

const getValue = (device, key) => {
    const value = device[key];

    if (Array.isArray(value))
        return value[0] ?? "";

    return value ?? "";
};

const parseUpstream = output => {
    const devices = JSON.parse(output);
    const upstream = devices.find(device => getValue(device, "IP4.GATEWAY")) ??
        devices.find(device => getValue(device, "GENERAL.STATE").includes("connected")) ??
        devices[0] ??
        {};

    const dns = [
        getValue(upstream, "IP4.DNS[1]"),
        getValue(upstream, "IP4.DNS[2]")
    ].filter(Boolean);

    return {
        protocol: getValue(upstream, "IP4.METHOD") || getValue(upstream, "GENERAL.TYPE"),
        ip: getValue(upstream, "IP4.ADDRESS[1]"),
        gateway: getValue(upstream, "IP4.GATEWAY"),
        dns1: dns[0] ?? "",
        dns2: dns[1] ?? "",
        deviceName: getValue(upstream, "GENERAL.DEVICE"),
        mac: getValue(upstream, "GENERAL.HWADDR")
    };
};

const parseLeases = leases => leases
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(line => {
            const [expiry, mac, ip, hostname, clientId] = line.split(/\s+/);

            return {
                expiry,
                mac,
                ip,
                hostname,
                clientId
            };
        });

export const NetworkStatus = () => {
    const [upstream, setUpstream] = useState(emptyUpstream);
    const [activeConnections, setActiveConnections] = useState("");
    const [leases, setLeases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [deviceOutput, conntrackOutput, leaseOutput] = await Promise.all([
                cockpit.spawn(["nmcli", "-j", "device", "show"], { err: "message" }),
                cockpit.spawn(["wc", "-l", "/proc/net/nf_conntrack"], { err: "message" }),
                cockpit.file("/var/lib/dnsmasq/dnsmasq.leases").read()
            ]);

            setUpstream(parseUpstream(deviceOutput));
            setActiveConnections(conntrackOutput.trim().split(/\s+/)[0] ?? "0");
            setLeases(parseLeases(leaseOutput ?? ""));
        } catch (exception) {
            setError(exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchMetrics, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchMetrics]);

    return (
        <Gallery hasGutter minWidths={{ default: "100%" }}>
            <Button
              variant={autoRefresh ? "secondary" : "primary"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
                {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
            </Button>
            {loading && <Spinner size="md" />}
            {error && <Alert variant="danger" isInline title={error} />}
            <Card>
                <CardTitle>{_("Upstream Status")}</CardTitle>
                <CardBody>
                    <DescriptionList isHorizontal>
                        {[
                            [_("Protocol"), upstream.protocol],
                            [_("IP"), upstream.ip],
                            [_("Gateway"), upstream.gateway],
                            [_("DNS1"), upstream.dns1],
                            [_("DNS2"), upstream.dns2],
                            [_("Device Name"), upstream.deviceName],
                            [_("MAC"), upstream.mac]
                        ].map(([term, value]) => (
                            <DescriptionListGroup key={term}>
                                <DescriptionListTerm>{term}</DescriptionListTerm>
                                <DescriptionListDescription>{value || _("Unknown")}</DescriptionListDescription>
                            </DescriptionListGroup>
                        ))}
                    </DescriptionList>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{cockpit.format(_("Active Connections: $0"), activeConnections || "0")}</CardTitle>
            </Card>
            <Card>
                <CardTitle>{_("Active DNS Leases")}</CardTitle>
                <CardBody>
                    <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={_("Active DNS leases")}>
                        <thead>
                            <tr>
                                <th>{_("Expiry Time")}</th>
                                <th>{_("MAC")}</th>
                                <th>{_("IP")}</th>
                                <th>{_("Hostname")}</th>
                                <th>{_("Client-ID")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leases.map(lease => (
                                <tr key={`${lease.mac}-${lease.ip}-${lease.expiry}`}>
                                    <td>{lease.expiry}</td>
                                    <td>{lease.mac}</td>
                                    <td>{lease.ip}</td>
                                    <td>{lease.hostname}</td>
                                    <td>{lease.clientId}</td>
                                </tr>
                            ))}
                            {leases.length === 0 && (
                                <tr>
                                    <td colSpan="5">{_("No active leases")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardBody>
            </Card>
        </Gallery>
    );
};
