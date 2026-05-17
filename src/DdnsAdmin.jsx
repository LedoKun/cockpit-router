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
const configPath = "/etc/ddclient.conf";

export const DdnsAdmin = () => {
    const [config, setConfig] = useState("");
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const showMessage = (variant, title) => setMessage({ variant, title });

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
            await cockpit.spawn(["systemctl", command, "ddclient"], { err: "message" });
            showMessage("success", cockpit.format(_("ddclient $0 succeeded"), command));
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

    const forceUpdate = async () => {
        setLoading(true);
        setOutput("");

        try {
            setOutput(await cockpit.spawn(["ddclient", "-daemon=0", "-debug", "-verbose", "-noquiet"], { err: "out" }));
        } catch (exception) {
            setOutput(exception.message || String(exception));
            showMessage("danger", _("Force update failed"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

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
                        <Button variant="primary" isDisabled={loading} onClick={forceUpdate}>{_("Force Update")}</Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("DDNS Configuration")}</CardTitle>
                <CardBody>
                    <TextArea aria-label={_("DDNS configuration")} value={config} onChange={(_event, value) => setConfig(value)} resizeOrientation="vertical" rows={24} />
                    <Button className="router-admin__editor-save" variant="primary" isDisabled={loading} onClick={saveConfig}>{_("Save Configuration")}</Button>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Force Update Output")}</CardTitle>
                <CardBody><pre className="router-admin__terminal">{output}</pre></CardBody>
            </Card>
        </>
    );
};
