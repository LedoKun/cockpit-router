/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";

import cockpit from 'cockpit';

const _ = cockpit.gettext;

const commands = {
    ping: target => ["ping", "-c", "4", target],
    traceroute: target => ["traceroute", target],
    dig: target => ["dig", target]
};

export const Diagnostics = () => {
    const [target, setTarget] = useState("");
    const [tool, setTool] = useState("ping");
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const runDiagnostic = async event => {
        event.preventDefault();
        setLoading(true);
        setMessage(null);
        setOutput("");

        try {
            setOutput(await cockpit.spawn(commands[tool](target), { err: "out" }));
        } catch (exception) {
            setOutput(exception.message || String(exception));
            setMessage({ variant: "danger", title: _("Diagnostic command failed") });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
            <Card>
                <CardTitle>{_("Diagnostics")}</CardTitle>
                <CardBody>
                    <Form onSubmit={runDiagnostic}>
                        <FormGroup label={_("Target IP / Domain")} fieldId="diagnostics-target">
                            <TextInput
                              id="diagnostics-target"
                              value={target}
                              onChange={(_event, value) => setTarget(value)}
                            />
                        </FormGroup>
                        <FormGroup label={_("Tool")} fieldId="diagnostics-tool">
                            <FormSelect id="diagnostics-tool" value={tool} onChange={(_event, value) => setTool(value)}>
                                <FormSelectOption value="ping" label={_("Ping")} />
                                <FormSelectOption value="traceroute" label={_("Traceroute")} />
                                <FormSelectOption value="dig" label={_("DNS Lookup")} />
                            </FormSelect>
                        </FormGroup>
                        <Button type="submit" variant="primary" isDisabled={loading || target.trim() === ""}>
                            {_("Run")}
                        </Button>
                    </Form>
                </CardBody>
            </Card>
            <Card>
                <CardTitle>{_("Output")}</CardTitle>
                <CardBody>
                    <pre className="router-admin__terminal">{output}</pre>
                </CardBody>
            </Card>
        </>
    );
};
