import { GuildMember } from "discord.js";

export class ServerPermissions {

  private perms: Map<string, Permissions> = new Map();

  getPerm(user: GuildMember, perm: PermissionType): boolean {
    let p = this.perms.get(user.user.id);
    return p?.getPerm(perm.name) ?? perm.default.defaultPermissionFor(user);
  }

  setPerm(user: GuildMember, perm: PermissionType, value: boolean): void {
    let userID = user.user.id;
    if (!this.perms.has(userID)) {
      this.perms.set(userID, new Permissions());
    }
    this.perms.get(userID)?.setPerm(perm.name, value); //this.perms.get(userID) already always never null
  }

  serialize(): object {
    let result: any = {};
    for (let [id, perm] of this.perms) {
      result[id] = perm.serialize();
    }
    return result;
  }

  static deserialize(obj: any): ServerPermissions {
    let result = new ServerPermissions();
    for (let user in obj) {
      result.perms.set(user, Permissions.deserialize(obj[user]));
    }
    return result;
  }

}

class Permissions {
  private perms: Map<string, boolean> = new Map();

  getPerm(name: string): boolean | null {
    return this.perms.get(name) ?? null;
  }

  setPerm(name: string, value: boolean): void {
    this.perms.set(name, value);
  }

  serialize(): object {
    let result: any = {};
    for (let [name, val] of this.perms) {
      result[name] = val;
    }
    return result;
  }

  static deserialize(obj: any): Permissions {
    let result = new Permissions();
    for (let perm in obj) {
      result.perms.set(perm, obj[perm]);
    }
    return result;
  }

}

interface DefaultPermissionPolicy {
  defaultPermissionFor(user: GuildMember): boolean;
}

const ALWAYS_ALLOWED: DefaultPermissionPolicy = {
  defaultPermissionFor: _ => true
};

const ADMINISTRATOR_ONLY: DefaultPermissionPolicy = {
  defaultPermissionFor: user => user.hasPermission("ADMINISTRATOR")
}

export class PermissionType {

  private names: string[];
  private voiceChannelOnly: boolean;
  private defaultPolicy: DefaultPermissionPolicy;

  constructor(names: string[], voiceChannelOnly?: boolean, defaultPolicy?: DefaultPermissionPolicy) {
    this.names = names;
    this.voiceChannelOnly = voiceChannelOnly ?? true;
    this.defaultPolicy = defaultPolicy ?? ALWAYS_ALLOWED;
  }

  get default(): DefaultPermissionPolicy {
    return this.defaultPolicy;
  }

  get isVoiceChannelOnly(): boolean {
    return this.voiceChannelOnly;
  }

  get allNames(): string[] {
    return this.names;
  }

  /**
  The main name of this command.
  */
  get name(): string {
    return this.names[0];
  }

  isName(name: string): boolean {
    return this.names.includes(name);
  }

  equals(other: PermissionType): boolean {
    for (let n of this.names) {
      if (other.names.includes(n)) {
        return true;
      }
    }
    return false;
  }

}

export namespace PermissionTypes {
  export const play = new PermissionType(["play"]);
  export const rr = new PermissionType(["rr"]);
  export const leave = new PermissionType(["leave"]);
  export const queue = new PermissionType(["queue"]);
  export const skip = new PermissionType(["skip"]);
  export const loop = new PermissionType(["loop"]);
  export const perms = new PermissionType(["perms"], false);
  export const ban = new PermissionType(["ban"], false, ADMINISTRATOR_ONLY);
  export const unban = new PermissionType(["unban"], false, ADMINISTRATOR_ONLY);
  export const help = new PermissionType(["help"], false);
  export const libs = new PermissionType(["libs"], false);
  export const forceSkip = new PermissionType(["forceskip"], true, ADMINISTRATOR_ONLY);
  export const forceLeave = new PermissionType(["forceleave"], true, ADMINISTRATOR_ONLY);

  export const PERM_TYPES: PermissionType[] = [play, rr, leave, queue, skip, loop, perms, ban, unban, help, libs,
    forceSkip, forceLeave];

  const mapping: Map<string, PermissionType> = new Map();
  for (let perm of PERM_TYPES) {
    for (let name of perm.allNames) {
      mapping.set(name, perm);
    }
  }

  export function fromName(name: string): PermissionType | undefined {
    return mapping.get(name);
  }
}