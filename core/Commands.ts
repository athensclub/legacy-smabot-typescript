import { PermissionType, PermissionTypes } from "./Permission";

export class Command {

    private names: string[];

    readonly permission: PermissionType;

    readonly isVoiceChannelOnly: boolean;

    constructor(names: string[], permission: PermissionType, isVoiceChannelOnly?: boolean) {
        this.names = names;
        this.permission = permission;
        this.isVoiceChannelOnly = isVoiceChannelOnly ?? false;
    }

    /**
     * Get the main name of the command.
     */
    get mainName() {
        return this.names[0];
    }

    /**
     * Get all the name of this command.
     */
    get allNames() {
        return this.names;
    }


}

export namespace CommandTypes {
    export const ban = new Command(["ban"], PermissionTypes.ban);
    export const help = new Command(["help"], PermissionTypes.help);
    export const leave = new Command(["leave"], PermissionTypes.leave, true);
    export const libs = new Command(["libs"], PermissionTypes.libs);
    export const loop = new Command(["loop"], PermissionTypes.loop, true);
    export const perms = new Command(["perms"], PermissionTypes.perms);
    export const play = new Command(["play"], PermissionTypes.play, true);
    export const queue = new Command(["queue"], PermissionTypes.queue);
    export const rr = new Command(["rr"], PermissionTypes.rr, true);
    export const skip = new Command(["skip"], PermissionTypes.skip, true);
    export const unban = new Command(["unban"], PermissionTypes.unban);

    export const ALL_COMMANDS = [ban, help, leave, libs, loop, perms, play, queue, rr, skip, unban];

    const mapping: Map<string, Command> = new Map();
    for (let command of ALL_COMMANDS) {
        for (let name of command.allNames) {
            mapping.set(name, command);
        }
    }

    /**
     * Get a command from the given name (case insensitive).
     * @param name the name of the command to search (case insensitive).
     */
    export function fromName(name: string): Command | undefined {
        return mapping.get(name.toLowerCase());
    }
}