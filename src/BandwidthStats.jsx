/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";

import cockpit from 'cockpit';

import { formatBytes, formatDate } from './routerUtils.js';

const _ = cockpit.gettext;

const TrafficTable = ({ title, rows }) => (
    <Card>
        <CardTitle>{title}</CardTitle>
        <CardBody>
            <table className="pf-v6-c-table pf-m-grid-md" role="grid" aria-label={title}>
                <thead>
                    <tr>
                        <th>{_("Date")}</th>
                        <th>{_("RX")}</th>
                        <th>{_("TX")}</th>
                        <th>{_("Total")}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={formatDate(row.date)}>
                            <td>{formatDate(row.date)}</td>
                            <td>{formatBytes(row.rx ?? 0)}</td>
                            <td>{formatBytes(row.tx ?? 0)}</td>
                            <td>{formatBytes((row.rx ?? 0) + (row.tx ?? 0))}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan="4">{_("No data")}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </CardBody>
    </Card>
);

export const BandwidthStats = () => {
    const [interfaces, setInterfaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const showMessage = (variant, title) => setMessage({ variant, title });

    const fetchStats = useCallback(async () => {
        try {
            const data = JSON.parse(await cockpit.spawn(["vnstat", "--json"], { err: "message" }));
            setInterfaces(data.interfaces ?? []);
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        }
    }, []);

    const runServiceCommand = async command => {
        setLoading(true);

        try {
            await cockpit.spawn(["systemctl", command, "vnstat"], { err: "message" });
            showMessage("success", cockpit.format(_("vnstat $0 succeeded"), command));
            await fetchStats();
        } catch (exception) {
            showMessage("danger", exception.message || String(exception));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        const interval = window.setInterval(fetchStats, 15000);

        return () => window.clearInterval(interval);
    }, [autoRefresh, fetchStats]);

    return (
        <>
            {message && <Alert isInline variant={message.variant} title={message.title} />}
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
                    <ToolbarItem>
                        <Button variant={autoRefresh ? "secondary" : "primary"} onClick={() => setAutoRefresh(!autoRefresh)}>
                            {autoRefresh ? _("Stop Auto-Refresh") : _("Start Auto-Refresh")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            {interfaces.map(item => (
                <React.Fragment key={item.name}>
                    <TrafficTable title={cockpit.format(_("$0 Daily"), item.name)} rows={item.traffic?.day ?? []} />
                    <TrafficTable title={cockpit.format(_("$0 Monthly"), item.name)} rows={item.traffic?.month ?? []} />
                </React.Fragment>
            ))}
        </>
    );
};
