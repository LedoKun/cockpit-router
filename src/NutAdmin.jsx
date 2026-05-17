/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Gallery } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const configPath = "/etc/ups/ups.conf";

const parseUpsc = output => Object.fromEntries(output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(line => {
            const separator = line.indexOf(":");
            return [line.slice(0, separator), line.slice(separator + 1).trim()];
        }));

export const NutAdmin = () => {
    const [config, setConfig] = useState("");
    const [metrics, setMetrics] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchMetrics = useCallback(async () => {
        try {
            setMetrics(parseUpsc(await cockpit.spawn(["upsc", "ups"], { err: "message" })));
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
            await cockpit.spawn(["systemctl", "restart", "nut-server"], { err: "message" });
            showMessage("success", _("nut-server restarted"));
            await fetchMetrics();
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
        fetchMetrics();
    }, [fetchMetrics, loadConfig]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchMetrics, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchMetrics]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Button variant="secondary" isDisabled={loading} onClick={restartService}>
                            {_("Restart nut-server")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Gallery hasGutter minWidths={{ default: "16rem" }}>
                {[
                    [_("Battery Charge"), metrics["battery.charge"]],
                    [_("UPS Load"), metrics["ups.load"]],
                    [_("UPS Status"), metrics["ups.status"]]
                ].map(([title, value]) => (
                    <Card key={title}>
                        <CardTitle>{title}</CardTitle>
                        <CardBody>{value || _("Unknown")}</CardBody>
                    </Card>
                ))}
            </Gallery>
            <Card>
                <CardTitle>{_("NUT Configuration")}</CardTitle>
                <CardBody>
                    <TextArea
                      aria-label={_("NUT configuration")}
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
