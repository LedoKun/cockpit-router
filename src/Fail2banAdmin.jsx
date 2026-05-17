/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;

const parseBannedIps = output => {
    const line = output
            .split("\n")
            .find(row => row.includes("Banned IP list"));

    if (!line)
        return [];

    return line
            .replace(/^.*Banned IP list:\s*/, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
};

export const Fail2banAdmin = () => {
    const [bannedIps, setBannedIps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchBannedIps = useCallback(async () => {
        try {
            const output = await cockpit.spawn(["fail2ban-client", "status", "sshd"], { err: "message" });
            setBannedIps(parseBannedIps(output));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const runServiceCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", command, "fail2ban"], { err: "message" });
            showMessage("success", cockpit.format(_("fail2ban $0 succeeded"), command));
            await fetchBannedIps();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const unbanIp = async ip => {
        setLoading(true);

        try {
            await cockpit.spawn(["fail2ban-client", "set", "sshd", "unbanip", ip], { err: "message" });
            showMessage("success", cockpit.format(_("$0 unbanned"), ip));
            await fetchBannedIps();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBannedIps();
    }, [fetchBannedIps]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchBannedIps, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchBannedIps]);

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
                              onClick={() => runServiceCommand(command)}
                            >
                                {command[0].toUpperCase() + command.slice(1)}
                            </Button>
                        </ToolbarItem>
                    ))}
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("Banned IPs")}</CardTitle>
                <CardBody>
                    <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={_("Banned IPs")}>
                        <thead>
                            <tr>
                                <th>{_("IP Address")}</th>
                                <th>{_("Actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bannedIps.map(ip => (
                                <tr key={ip}>
                                    <td>{ip}</td>
                                    <td>
                                        <Button variant="link" isInline isDisabled={loading} onClick={() => unbanIp(ip)}>
                                            {_("Unban")}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {bannedIps.length === 0 && (
                                <tr>
                                    <td colSpan="2">{_("No banned IPs")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardBody>
            </Card>
        </>
    );
};
