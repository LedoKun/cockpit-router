/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const configPath = "/etc/unbound/unbound.conf";

const rpzConfig = `rpz:
    name: "hagezi"
    zonefile: "/etc/unbound/hagezi-*.rpz"
`;

const blocklists = [
    {
        id: "light",
        label: "Light",
        url: "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/rpz/light.txt",
        target: "/etc/unbound/hagezi-light.rpz"
    },
    {
        id: "normal",
        label: "Normal",
        url: "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/rpz/normal.txt",
        target: "/etc/unbound/hagezi-normal.rpz"
    },
    {
        id: "pro",
        label: "Pro",
        url: "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/rpz/pro.txt",
        target: "/etc/unbound/hagezi-pro.rpz"
    },
    {
        id: "pro-plus",
        label: "Pro Plus",
        url: "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/rpz/pro.plus.txt",
        target: "/etc/unbound/hagezi-pro-plus.rpz"
    },
    {
        id: "ultimate",
        label: "Ultimate",
        url: "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/rpz/ultimate.txt",
        target: "/etc/unbound/hagezi-ultimate.rpz"
    }
];

const allHageziLists = [
    "Multi Light",
    "Multi Normal",
    "Multi Pro",
    "Multi Pro Mini",
    "Multi Pro Plus",
    "Multi Pro Plus Mini",
    "Multi Ultimate",
    "Multi Ultimate Mini",
    "Fake",
    "Pop-Up Ads",
    "Threat Intelligence Feeds",
    "Threat Intelligence Feeds Medium",
    "Threat Intelligence Feeds Mini",
    "Newly Registered Domains - NRD/DGA",
    "DoH/VPN/TOR/Proxy Bypass",
    "DoH only",
    "DoH IPs",
    "Safesearch not supported",
    "Dynamic DNS",
    "Badware Hoster",
    "URL Shortener",
    "Most Abused TLDs",
    "DNS Rebind Protection",
    "Anti Piracy",
    "Gambling",
    "Gambling Medium",
    "Gambling Mini",
    "Social Networks",
    "NSFW",
    "Native Tracker"
];

const ensureRpzConfig = config => {
    if (config.includes("/etc/unbound/hagezi-*.rpz"))
        return config;

    return `${config.trimEnd()}\n\n${rpzConfig}`;
};

export const UnboundAdmin = () => {
    const [config, setConfig] = useState("");
    const [selectedLists, setSelectedLists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const loadConfig = useCallback(async () => {
        setLoading(true);

        try {
            const content = await cockpit.file(configPath).read();
            setConfig(ensureRpzConfig(content ?? ""));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    }, []);

    const runServiceCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", command, "unbound"], { err: "message" });
            showMessage("success", cockpit.format(_("unbound $0 succeeded"), command));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setLoading(true);

        try {
            await cockpit.file(configPath).replace(ensureRpzConfig(config));
            showMessage("success", _("Configuration saved"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const updateBlocklists = async () => {
        setLoading(true);

        try {
            await cockpit.spawn(["sh", "-c", "rm -f /etc/unbound/hagezi-*.rpz"], { err: "message" });
            await Promise.all(blocklists
                    .filter(list => selectedLists.includes(list.id))
                    .map(list => cockpit.spawn(["curl", "-sL", list.url, "-o", list.target], { err: "message" })));
            await cockpit.spawn(["systemctl", "restart", "unbound"], { err: "message" });
            showMessage("success", _("Adblock lists updated and unbound restarted"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
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
            <Card>
                <CardTitle>{_("Unbound Service")}</CardTitle>
                <CardBody>
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
                        </ToolbarContent>
                    </Toolbar>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Hagezi RPZ Blocklists")}</CardTitle>
                <CardBody>
                    {blocklists.map(list => (
                        <Checkbox
                          key={list.id}
                          id={`hagezi-${list.id}`}
                          label={list.label}
                          isChecked={selectedLists.includes(list.id)}
                          onChange={(_event, checked) => setSelectedLists(checked
                                  ? [...selectedLists, list.id]
                                  : selectedLists.filter(id => id !== list.id))}
                        />
                    ))}
                    <Button
                      className="router-admin__editor-save"
                      variant="primary"
                      isDisabled={loading}
                      onClick={updateBlocklists}
                    >
                        {_("Update Adblock Lists")}
                    </Button>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Extracted Hagezi Lists")}</CardTitle>
                <CardBody>{allHageziLists.join(", ")}</CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Unbound Configuration")}</CardTitle>
                <CardBody>
                    <TextArea
                      aria-label={_("unbound configuration")}
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
