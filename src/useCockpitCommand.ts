/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useCallback, useState } from 'react';

import cockpit from 'cockpit';

type CockpitCommand = string[];

interface CockpitCommandState {
    loading: boolean;
    stdout: string;
    stderr: string;
    exitStatus: number | null;
}

interface CockpitSpawnError extends Error {
    problem?: string;
    exit_status?: number;
}

export const useCockpitCommand = (command: CockpitCommand) => {
    const [state, setState] = useState<CockpitCommandState>({
        loading: false,
        stdout: "",
        stderr: "",
        exitStatus: null
    });

    const execute = useCallback(async (overrideCommand?: CockpitCommand) => {
        const commandToRun = overrideCommand ?? command;

        setState({
            loading: true,
            stdout: "",
            stderr: "",
            exitStatus: null
        });

        try {
            const stdout = await cockpit.spawn(commandToRun, { err: "message" });

            setState({
                loading: false,
                stdout,
                stderr: "",
                exitStatus: 0
            });

            return stdout;
        } catch (error) {
            const spawnError = error as CockpitSpawnError;
            const stderr = spawnError.message || spawnError.problem || String(error);

            setState({
                loading: false,
                stdout: "",
                stderr,
                exitStatus: spawnError.exit_status ?? null
            });

            throw error;
        }
    }, [command]);

    return {
        ...state,
        execute
    };
};
