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
const configPath = "/etc/miniupnpd/miniupnpd.conf";

export const MiniupnpAdmin = () => {
    const [config, setConfig] = useState("");
    const [forwards, setForwards] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchForwards = useCallback(async () => {
        try {
            setForwards(await cockpit.spawn(["upnpc", "-l"], { err: "message" }));
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

    const restartService = async () => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", "restart", "miniupnpd"], { err: "message" });
            showMessage("success", _("miniupnpd restarted"));
            await fetchForwards();
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
        fetchForwards();
    }, [fetchForwards, loadConfig]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchForwards, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchForwards]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Button variant="secondary" isDisabled={loading} onClick={restartService}>
                            {_("Restart miniupnpd")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("Active UPnP Port Forwards")}</CardTitle>
                <CardBody>
                    <pre>{forwards || _("No active port forwards")}</pre>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("MiniUPnP Configuration")}</CardTitle>
                <CardBody>
                    <TextArea
                      aria-label={_("MiniUPnP configuration")}
                      value={config}
                      onChange={(_event, value) => setConfig(value)}
                      resizeOrientation="vertical"
                      rows={24}
                    />
                    <Button className="router-admin__editor-save" variant="primary" isDisabled={loading} onClick={saveConfig}>
                        {_("Save Configuration")}
                    </Button>
                </CardBody>
            </Card>
        </>
    );
};
