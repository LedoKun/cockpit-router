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
const configPath = "/etc/hostapd/hostapd.conf";

const parseMacs = output => output
        .split("\n")
        .filter(line => /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(line.trim()))
        .map(line => line.trim());

export const HostapdAdmin = () => {
    const [config, setConfig] = useState("");
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchClients = useCallback(async () => {
        try {
            setClients(parseMacs(await cockpit.spawn(["hostapd_cli", "all_sta"], { err: "message" })));
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
            await cockpit.spawn(["systemctl", command, "hostapd"], { err: "message" });
            showMessage("success", cockpit.format(_("hostapd $0 succeeded"), command));
            await fetchClients();
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
        fetchClients();
    }, [fetchClients, loadConfig]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchClients, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchClients]);

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
                <CardTitle>{_("Hostapd Clients")}</CardTitle>
                <CardBody>
                    <ul className="pf-v6-c-list">
                        {clients.map(mac => <li key={mac}>{mac}</li>)}
                        {clients.length === 0 && <li>{_("No clients")}</li>}
                    </ul>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Hostapd Configuration")}</CardTitle>
                <CardBody>
                    <TextArea aria-label={_("Hostapd configuration")} value={config} onChange={(_event, value) => setConfig(value)} resizeOrientation="vertical" rows={24} />
                    <Button className="router-admin__editor-save" variant="primary" isDisabled={loading} onClick={saveConfig}>{_("Save Configuration")}</Button>
                </CardBody>
            </Card>
        </>
    );
};
