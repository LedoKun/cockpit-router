/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { Switch } from "@patternfly/react-core/dist/esm/components/Switch/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;

const parseForwardPort = value => Object.fromEntries(value
        .split(":")
        .map(part => part.split("=")));

export const RouterFirewall = () => {
    const [masquerade, setMasquerade] = useState(false);
    const [forwardPorts, setForwardPorts] = useState([]);
    const [form, setForm] = useState({ port: "", protocol: "tcp", targetIp: "", targetPort: "" });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchMasquerade = useCallback(async () => {
        try {
            setMasquerade((await cockpit.spawn(["firewall-cmd", "--zone=external", "--query-masquerade"], { err: "message" })).trim() === "yes");
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const fetchForwardPorts = useCallback(async () => {
        try {
            const output = await cockpit.spawn(["firewall-cmd", "--list-forward-ports", "--zone=external"], { err: "message" });
            setForwardPorts(output.trim().split(/\s+/).filter(Boolean).map(parseForwardPort));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const reloadFirewall = async () => {
        await cockpit.spawn(["firewall-cmd", "--reload"], { err: "message" });
        await fetchMasquerade();
        await fetchForwardPorts();
    };

    const toggleMasquerade = async checked => {
        setLoading(true);

        try {
            await cockpit.spawn([
                "firewall-cmd",
                "--zone=external",
                checked ? "--add-masquerade" : "--remove-masquerade",
                "--permanent"
            ], { err: "message" });
            await reloadFirewall();
            showMessage("success", checked ? _("Masquerading enabled") : _("Masquerading disabled"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const addForwardPort = async event => {
        event.preventDefault();
        setLoading(true);

        try {
            await cockpit.spawn([
                "firewall-cmd",
                "--zone=external",
                `--add-forward-port=port=${form.port}:proto=${form.protocol}:toport=${form.targetPort}:toaddr=${form.targetIp}`,
                "--permanent"
            ], { err: "message" });
            await reloadFirewall();
            setForm({ port: "", protocol: "tcp", targetIp: "", targetPort: "" });
            showMessage("success", _("Port forward added"));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasquerade();
        fetchForwardPorts();
    }, [fetchForwardPorts, fetchMasquerade]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchForwardPorts, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchForwardPorts]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Switch
                          id="external-masquerade"
                          label={_("External NAT Masquerading")}
                          isChecked={masquerade}
                          isDisabled={loading}
                          onChange={(_event, checked) => toggleMasquerade(checked)}
                        />
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("Port Forwarding Table")}</CardTitle>
                <CardBody>
                    <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={_("Port forwarding table")}>
                        <thead>
                            <tr>
                                <th>{_("Port")}</th>
                                <th>{_("Protocol")}</th>
                                <th>{_("Target IP")}</th>
                                <th>{_("Target Port")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forwardPorts.map(rule => (
                                <tr key={`${rule.port}-${rule.proto}-${rule.toaddr}-${rule.toport}`}>
                                    <td>{rule.port}</td>
                                    <td>{rule.proto}</td>
                                    <td>{rule.toaddr}</td>
                                    <td>{rule.toport}</td>
                                </tr>
                            ))}
                            {forwardPorts.length === 0 && (
                                <tr>
                                    <td colSpan="4">{_("No port forwards")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Add Port Forward")}</CardTitle>
                <CardBody>
                    <Form onSubmit={addForwardPort}>
                        <FormGroup label={_("Port")} fieldId="forward-port">
                            <TextInput id="forward-port" value={form.port} onChange={(_event, value) => setForm({ ...form, port: value })} />
                        </FormGroup>
                        <FormGroup label={_("Protocol")} fieldId="forward-protocol">
                            <FormSelect id="forward-protocol" value={form.protocol} onChange={(_event, value) => setForm({ ...form, protocol: value })}>
                                <FormSelectOption value="tcp" label="tcp" />
                                <FormSelectOption value="udp" label="udp" />
                            </FormSelect>
                        </FormGroup>
                        <FormGroup label={_("Target IP")} fieldId="forward-target-ip">
                            <TextInput id="forward-target-ip" value={form.targetIp} onChange={(_event, value) => setForm({ ...form, targetIp: value })} />
                        </FormGroup>
                        <FormGroup label={_("Target Port")} fieldId="forward-target-port">
                            <TextInput id="forward-target-port" value={form.targetPort} onChange={(_event, value) => setForm({ ...form, targetPort: value })} />
                        </FormGroup>
                        <Button type="submit" variant="primary" isDisabled={loading}>
                            {_("Add Port Forward")}
                        </Button>
                    </Form>
                </CardBody>
            </Card>
        </>
    );
};
