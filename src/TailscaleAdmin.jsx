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
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const tailscaleDnsPath = "/etc/unbound/conf.d/tailscale.conf";
const tailscaleDnsConfig = `server:
  domain-insecure: "ts.net"
forward-zone:
  name: "ts.net"
  forward-addr: 100.100.100.100
`;

const parseStatus = output => {
    const status = JSON.parse(output);
    const self = status.Self ?? {};

    return {
        backendState: status.BackendState ?? "",
        tailscaleIp: self.TailscaleIPs?.[0] ?? "",
        peers: Object.values(status.Peer ?? {}).map(peer => ({
            id: peer.ID ?? peer.PublicKey ?? peer.HostName,
            hostname: peer.HostName ?? peer.DNSName ?? "",
            ips: (peer.TailscaleIPs ?? []).join(", ")
        }))
    };
};

export const TailscaleAdmin = () => {
    const [status, setStatus] = useState({ backendState: "", tailscaleIp: "", peers: [] });
    const [dnsInjected, setDnsInjected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchStatus = useCallback(async () => {
        try {
            setStatus(parseStatus(await cockpit.spawn(["tailscale", "status", "--json"], { err: "message" })));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const fetchDnsState = useCallback(async () => {
        try {
            setDnsInjected((await cockpit.file(tailscaleDnsPath).read() ?? "") === tailscaleDnsConfig);
        } catch {
            setDnsInjected(false);
        }
    }, []);

    const runCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(command, { err: "message" });
            showMessage("success", cockpit.format(_("$0 succeeded"), command.join(" ")));
            await fetchStatus();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const toggleDns = async () => {
        setLoading(true);

        try {
            await cockpit.file(tailscaleDnsPath).replace(dnsInjected ? "" : tailscaleDnsConfig);
            await cockpit.spawn(["systemctl", "restart", "unbound"], { err: "message" });
            setDnsInjected(!dnsInjected);
            showMessage("success", dnsInjected ? _("Tailnet DNS removed") : _("Tailnet DNS injected"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchDnsState();
    }, [fetchDnsState, fetchStatus]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchStatus, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchStatus]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Toolbar>
                <ToolbarContent>
                    {["start", "stop", "restart"].map(command => (
                        <ToolbarItem key={command}>
                            <Button
                              variant={command === "stop" ? "danger" : "secondary"}
                              isDisabled={loading}
                              onClick={() => runCommand(["systemctl", command, "tailscaled"])}
                            >
                                {command[0].toUpperCase() + command.slice(1)}
                            </Button>
                        </ToolbarItem>
                    ))}
                    <ToolbarItem>
                        <Button variant="secondary" isDisabled={loading} onClick={() => runCommand(["tailscale", "up"])}>
                            {_("Tailscale Up")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="secondary" isDisabled={loading} onClick={() => runCommand(["tailscale", "down"])}>
                            {_("Tailscale Down")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="primary" isDisabled={loading} onClick={toggleDns}>
                            {dnsInjected ? _("Remove Tailnet DNS") : _("Inject Tailnet DNS")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("Tailscale Status")}</CardTitle>
                <CardBody>
                    <DescriptionList isHorizontal>
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Status")}</DescriptionListTerm>
                            <DescriptionListDescription>{status.backendState || _("Unknown")}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Tailscale IP")}</DescriptionListTerm>
                            <DescriptionListDescription>{status.tailscaleIp || _("Unknown")}</DescriptionListDescription>
                        </DescriptionListGroup>
                    </DescriptionList>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Peers")}</CardTitle>
                <CardBody>
                    <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={_("Tailscale peers")}>
                        <thead>
                            <tr>
                                <th>{_("Hostname")}</th>
                                <th>{_("IP")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {status.peers.map(peer => (
                                <tr key={peer.id}>
                                    <td>{peer.hostname}</td>
                                    <td>{peer.ips}</td>
                                </tr>
                            ))}
                            {status.peers.length === 0 && (
                                <tr>
                                    <td colSpan="2">{_("No peers")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardBody>
            </Card>
        </>
    );
};
