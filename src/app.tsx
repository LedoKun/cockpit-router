/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Copyright (C) 2017 Red Hat, Inc.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { Masthead, MastheadBrand, MastheadContent, MastheadMain } from "@patternfly/react-core/dist/esm/components/Masthead/index.js";
import { Nav, NavGroup, NavItem, NavList } from "@patternfly/react-core/dist/esm/components/Nav/index.js";
import { Page, PageSection, PageSidebar, PageSidebarBody } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";

import cockpit from 'cockpit';

import { BandwidthStats } from './BandwidthStats.jsx';
import { DdnsAdmin } from './DdnsAdmin.jsx';
import { Diagnostics } from './Diagnostics.jsx';
import { DnsmasqAdmin } from './DnsmasqAdmin.jsx';
import { Fail2banAdmin } from './Fail2banAdmin.jsx';
import { HostapdAdmin } from './HostapdAdmin.jsx';
import { MiniupnpAdmin } from './MiniupnpAdmin.jsx';
import { NetworkStatus } from './NetworkStatus.jsx';
import { NutAdmin } from './NutAdmin.jsx';
import { RouterFirewall } from './RouterFirewall.jsx';
import { RouterDashboard } from './RouterDashboard.jsx';
import { serviceStatusColor } from './routerUtils.js';
import { SqmAdmin } from './SqmAdmin.jsx';
import { TailscaleAdmin } from './TailscaleAdmin.jsx';
import { UnboundAdmin } from './UnboundAdmin.jsx';
import { WireguardAdmin } from './WireguardAdmin.jsx';

const _ = cockpit.gettext;

const routes = [
    {
        label: _("Overview"),
        component: RouterDashboard,
        group: _("Status")
    },
    {
        label: _("Network Status"),
        component: NetworkStatus,
        group: _("Status")
    },
    {
        label: _("Bandwidth Stats"),
        component: BandwidthStats,
        service: "vnstat",
        group: _("Status")
    },
    {
        label: _("Diagnostics"),
        component: Diagnostics,
        group: _("Status")
    },
    {
        label: _("DNSMasq"),
        component: DnsmasqAdmin,
        service: "dnsmasq",
        group: _("Services")
    },
    {
        label: _("Unbound"),
        component: UnboundAdmin,
        service: "unbound",
        group: _("Services")
    },
    {
        label: _("NUT UPS"),
        component: NutAdmin,
        service: "nut-server",
        group: _("Services")
    },
    {
        label: _("MiniUPnP"),
        component: MiniupnpAdmin,
        service: "miniupnpd",
        group: _("Services")
    },
    {
        label: _("Fail2Ban"),
        component: Fail2banAdmin,
        service: "fail2ban",
        group: _("Services")
    },
    {
        label: _("DDNS"),
        component: DdnsAdmin,
        service: "ddclient",
        group: _("Services")
    },
    {
        label: _("Tailscale"),
        component: TailscaleAdmin,
        service: "tailscaled",
        group: _("Network")
    },
    {
        label: _("Firewall NAT"),
        component: RouterFirewall,
        service: "firewalld",
        group: _("Network")
    },
    {
        label: _("SQM QoS"),
        component: SqmAdmin,
        group: _("Network")
    },
    {
        label: _("WireGuard"),
        component: WireguardAdmin,
        service: "wg-quick@wg0",
        group: _("Network")
    },
    {
        label: _("Wireless AP"),
        component: HostapdAdmin,
        service: "hostapd",
        group: _("Network")
    }
];

const routeGroups = [...new Set(routes.map(route => route.group))];

const ServiceStatus = ({ service }) => {
    const [status, setStatus] = useState(_("checking"));
    const [loading, setLoading] = useState(false);

    const refreshStatus = useCallback(async () => {
        setLoading(true);

        try {
            setStatus((await cockpit.spawn(["systemctl", "is-active", service], { err: "ignore" })).trim() || _("unknown"));
        } catch {
            setStatus(_("inactive"));
        } finally {
            setLoading(false);
        }
    }, [service]);

    useEffect(() => {
        refreshStatus();

        const interval = window.setInterval(refreshStatus, 15000);

        return () => window.clearInterval(interval);
    }, [refreshStatus]);

    return (
        <div className="router-admin__service-status">
            <Label color={serviceStatusColor(status)}>{cockpit.format(_("$0: $1"), service, status)}</Label>
            <Button variant="link" isInline isDisabled={loading} onClick={refreshStatus}>
                {_("Refresh")}
            </Button>
        </div>
    );
};

export const Application = () => {
    const [activeRouteLabel, setActiveRouteLabel] = useState(routes[0].label);
    const activeRoute = routes.find(route => route.label === activeRouteLabel) ?? routes[0];
    const ActiveComponent = activeRoute.component;

    const header = (
        <Masthead>
            <MastheadMain>
                <MastheadBrand>
                    <span className="router-admin__brand">{_("Router Admin")}</span>
                </MastheadBrand>
            </MastheadMain>
            <MastheadContent>
                <span className="router-admin__subtitle">{_("Fedora-IoT")}</span>
            </MastheadContent>
        </Masthead>
    );

    const sidebar = (
        <PageSidebar>
            <PageSidebarBody>
                <Nav aria-label={_("Router sections")}>
                    <NavList>
                        {routeGroups.map(group => (
                            <NavGroup key={group} title={group}>
                                {routes.filter(route => route.group === group).map(route => (
                                    <NavItem
                                      key={route.label}
                                      preventDefault
                                      isActive={activeRoute.label === route.label}
                                      itemId={route.label}
                                      to={`#${route.label.toLowerCase().replaceAll(" ", "-")}`}
                                      onClick={() => setActiveRouteLabel(route.label)}
                                    >
                                        {route.label}
                                    </NavItem>
                                ))}
                            </NavGroup>
                        ))}
                    </NavList>
                </Nav>
            </PageSidebarBody>
        </PageSidebar>
    );

    return (
        <Page
          masthead={header}
          sidebar={sidebar}
          isManagedSidebar
          defaultManagedSidebarIsOpen
          mainAriaLabel={_("Router administration")}
        >
            <PageSection variant="secondary">
                <div className="router-admin__page-header">
                    <Title headingLevel="h1" size="2xl">{activeRoute.label}</Title>
                    {activeRoute.service && <ServiceStatus service={activeRoute.service} />}
                </div>
            </PageSection>
            <PageSection isFilled aria-label={activeRoute.label}>
                <div className="router-admin__content">
                    <ActiveComponent />
                </div>
            </PageSection>
        </Page>
    );
};
