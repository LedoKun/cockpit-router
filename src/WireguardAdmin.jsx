/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const configPath = "/etc/wireguard/wg0.conf";

export const WireguardAdmin = () => {
    const [config, setConfig] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchStatus = useCallback(async () => {
        try {
            setStatus(await cockpit.spawn(["wg", "show"], { err: "message" }));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const loadConfig = useCallback(async () => {
        setLoading(true);

        try {
            setConfig(await cockpit.file(configPath).read() ?? "");
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    }, []);

    const runServiceCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", command, "wg-quick@wg0"], { err: "message" });
            showMessage("success", cockpit.format(_("wg-quick@wg0 $0 succeeded"), command));
            await fetchStatus();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setLoading(true);

        try {
            await cockpit.file(configPath).replace(config);
            showMessage("success", _("Configuration saved"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
        fetchStatus();
    }, [fetchStatus, loadConfig]);

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
                            <Button variant={command === "stop" ? "danger" : "secondary"} isDisabled={loading} onClick={() => runServiceCommand(command)}>
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
                <CardTitle>{_("WireGuard Status")}</CardTitle>
                <CardBody><pre className="router-admin__terminal">{status}</pre></CardBody>
            </Card>
            <Card>
                <CardTitle>{_("WireGuard Configuration")}</CardTitle>
                <CardBody>
                    <TextArea aria-label={_("WireGuard configuration")} value={config} onChange={(_event, value) => setConfig(value)} resizeOrientation="vertical" rows={24} />
                    <Button className="router-admin__editor-save" variant="primary" isDisabled={loading} onClick={saveConfig}>{_("Save Configuration")}</Button>
                </CardBody>
            </Card>
        </>
    );
};
