/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export const formatBytes = bytes => {
    const value = Number(bytes) || 0;

    if (value >= 1024 ** 3)
        return `${(value / 1024 ** 3).toFixed(2)} GB`;

    if (value >= 1024 ** 2)
        return `${(value / 1024 ** 2).toFixed(2)} MB`;

    if (value >= 1024)
        return `${(value / 1024).toFixed(2)} KB`;

    return `${value} B`;
};

export const formatDate = date => {
    if (!date)
        return "";

    return [date.year, date.month, date.day].filter(Boolean).join("-");
};

export const serviceStatusColor = status => {
    if (status === "active")
        return "green";

    if (["failed", "inactive"].includes(status))
        return "red";

    return "orange";
};

export const formatDuration = seconds => {
    const total = Number(seconds) || 0;
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days > 0)
        return `${days}d ${hours}h ${minutes}m`;

    if (hours > 0)
        return `${hours}h ${minutes}m`;

    return `${minutes}m`;
};
