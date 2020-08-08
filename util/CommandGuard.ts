import { PermissionType } from "../core/Permission";
import { CommandUtil, CommandData } from "./CommandUtil";

export namespace CommandGuard {

    /**
    * Guard the command against all the basic checks (including permission and voice channel),
    * returning true only if the command pass all the test, and will return false if the check fails,
    * meaning the command should not run.
    * @param data the data extracted from CommandUtil.extractData() of the user's command
    */
    export function guard(data: CommandData): boolean {
        return CommandGuard.guardPerm(data) && CommandGuard.guardVoiceChannelOnly(data);
    }

    /**
     * Guard the voice channel to allow only the user with the permission with the same name as the command
     * to use the command.
     * @param data the data extracted from CommandUtil.extractData() of the user's command
     */
    export function guardPerm(data: CommandData): boolean {
        return forceGuardPerm(data, data.commandType.permission);
    }

    /**
     * Guard the command for the permission and force the user to have the given permission to use the command,
     * even if the command's permission type allow it.
     * @param data 
     */
    export function forceGuardPerm(data: CommandData, perm: PermissionType): boolean {
        if (!data.server.perms.getPerm(data.member, perm)) {
            CommandUtil.sendEmbed(`Error`, `:x: ${CommandUtil.tag(data.member.user)} does not has permission for ${data.commandName}.`, data.textChannel, 0xff0000);
            return false;
        }
        return true;
    }

    /**
     * Guard the voice channel only property of each command, returning false and sending error
     * message on error.
     * @param data the data extracted from CommandUtil.extractData() of the user's command
     */
    export function guardVoiceChannelOnly(data: CommandData): boolean {
        if (data.commandType.isVoiceChannelOnly) {
            return CommandGuard.forceGuardVoiceChannelOnly(data);
        }
        return true;
    }

    /**
     * Guard the command and treat the command as voice channel only, even if it is not 
     * (even if PermissionType.isVoiceChannelOnly is false).
     * @param data the data extracted from CommandUtil.extractData() of the user's command
     */
    export function forceGuardVoiceChannelOnly(data: CommandData): boolean {
        const voiceChannel = data.member.voice.channel;
        if (!voiceChannel) {
            CommandUtil.sendEmbed("Error", ":x: You need to be in a voice channel to use my commands.", data.textChannel, 0xff0000);
            return false;
        }

        const permissions = voiceChannel.permissionsFor(data.member);
        if (!permissions || !permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            CommandUtil.sendEmbed("Error", ":x: I need the permissions to join and speak in your voice channel!", data.textChannel, 0xff0000);
            return false;
        }

        if (data.server.queue && data.server.queue.voiceChannel &&
            data.server.queue.voiceChannel.id !== voiceChannel.id) {
            CommandUtil.sendEmbed("Error", ":x: I'm playing in a different voice channel! You must be in the same voice channel as me to use this command!",
                data.textChannel, 0xff0000);
            return false;
        }
        return true;
    }
}