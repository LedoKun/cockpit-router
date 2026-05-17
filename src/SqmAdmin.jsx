/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { NumberInput } from "@patternfly/react-core/dist/esm/components/NumberInput/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const SqmAdmin = () => {
    const [interfaces, setInterfaces] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState("");
    const [uploadSpeed, setUploadSpeed] = useState(20);
    const [downloadSpeed, setDownloadSpeed] = useState(100);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchInterfaces = useCallback(async () => {
        try {
            const names = (await cockpit.spawn(["ls", "/sys/class/net/"], { err: "message" }))
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

            setInterfaces(names);
            setSelectedInterface(current => current || names[0] || "");
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        if (!selectedInterface)
            return;

        try {
            setStatus(await cockpit.spawn(["tc", "-s", "qdisc", "show", "dev", selectedInterface], { err: "message" }));
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, [selectedInterface]);

    const applySqm = async () => {
        setLoading(true);

        try {
            await cockpit.spawn(["tc", "qdisc", "del", "dev", selectedInterface, "root"], { err: "ignore" }).catch(() => undefined);
            await cockpit.spawn(["tc", "qdisc", "add", "dev", selectedInterface, "root", "cake", "bandwidth", `${uploadSpeed}mbit`], { err: "message" });
            showMessage("success", _("SQM applied"));
            await fetchStatus();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    const clearSqm = async () => {
        setLoading(true);

        try {
            await cockpit.spawn(["tc", "qdisc", "del", "dev", selectedInterface, "root"], { err: "message" });
            showMessage("success", _("SQM cleared"));
            await fetchStatus();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterfaces();
    }, [fetchInterfaces]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

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
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <Card>
                <CardTitle>{_("SQM QoS")}</CardTitle>
                <CardBody>
                    <Form>
                        <FormGroup label={_("Interface")} fieldId="sqm-interface">
                            <FormSelect id="sqm-interface" value={selectedInterface} onChange={(_event, value) => setSelectedInterface(value)}>
                                {interfaces.map(name => <FormSelectOption key={name} value={name} label={name} />)}
                            </FormSelect>
                        </FormGroup>
                        <FormGroup label={_("Upload Speed (Mbit)")} fieldId="sqm-upload">
                            <NumberInput
                              value={uploadSpeed}
                              min={1}
                              onMinus={() => setUploadSpeed(Math.max(1, uploadSpeed - 1))}
                              onPlus={() => setUploadSpeed(uploadSpeed + 1)}
                              onChange={event => setUploadSpeed(Number(event.currentTarget.value) || 1)}
                              inputAriaLabel={_("Upload Speed (Mbit)")}
                            />
                        </FormGroup>
                        <FormGroup label={_("Download Speed (Mbit)")} fieldId="sqm-download">
                            <NumberInput
                              value={downloadSpeed}
                              min={1}
                              onMinus={() => setDownloadSpeed(Math.max(1, downloadSpeed - 1))}
                              onPlus={() => setDownloadSpeed(downloadSpeed + 1)}
                              onChange={event => setDownloadSpeed(Number(event.currentTarget.value) || 1)}
                              inputAriaLabel={_("Download Speed (Mbit)")}
                            />
                        </FormGroup>
                        <Button variant="primary" isDisabled={loading || !selectedInterface} onClick={applySqm}>
                            {_("Apply SQM")}
                        </Button>{" "}
                        <Button variant="secondary" isDisabled={loading || !selectedInterface} onClick={clearSqm}>
                            {_("Clear SQM")}
                        </Button>
                    </Form>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("tc Status")}</CardTitle>
                <CardBody>
                    <pre>{status || _("No status")}</pre>
                </CardBody>
            </Card>
        </>
    );
};
