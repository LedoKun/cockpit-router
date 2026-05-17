/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    AlertActionCloseButton,
    AlertGroup
} from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const configPath = "/etc/dnsmasq.conf";

export const DnsmasqAdmin = () => {
    const [config, setConfig] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (variant, title) => setToast({ variant, title, key: Date.now() });

    const loadConfig = useCallback(async () => {
        setLoading(true);

        try {
            const content = await cockpit.file(configPath).read();
            setConfig(content ?? "");
        } catch (exception) {
            showToast("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    }, []);

    const runServiceCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", command, "dnsmasq"], { err: "message" });
            showToast("success", cockpit.format(_("dnsmasq $0 succeeded"), command));
        } catch (exception) {
            showToast("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setLoading(true);

        try {
            await cockpit.file(configPath).replace(config);
            await cockpit.spawn(["systemctl", "reload", "dnsmasq"], { err: "message" });
            showToast("success", _("Configuration saved and dnsmasq reloaded"));
        } catch (exception) {
            showToast("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return (
        <>
            <AlertGroup isToast isLiveRegion>
                {toast && (
                    <Alert
                      key={toast.key}
                      variant={toast.variant}
                      title={toast.title}
                      actionClose={<AlertActionCloseButton onClose={() => setToast(null)} />}
                    />
                )}
            </AlertGroup>
            <Card>
                <CardTitle>{_("DNSMasq Service")}</CardTitle>
                <CardBody>
                    <Toolbar>
                        <ToolbarContent>
                            {["start", "stop", "restart", "reload"].map(command => (
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
                        </ToolbarContent>
                    </Toolbar>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("DNSMasq Configuration")}</CardTitle>
                <CardBody>
                    <TextArea
                      aria-label={_("dnsmasq configuration")}
                      value={config}
                      onChange={(_event, value) => setConfig(value)}
                      resizeOrientation="vertical"
                      rows={28}
                    />
                    <Button
                      className="router-admin__editor-save"
                      variant="primary"
                      isDisabled={loading}
                      onClick={saveConfig}
                    >
                        {_("Save Configuration")}
                    </Button>
                </CardBody>
            </Card>
        </>
    );
};
