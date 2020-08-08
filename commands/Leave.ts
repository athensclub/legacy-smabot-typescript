import { Command, CommandMessage } from "@typeit/discord";
import { PermissionTypes } from "../core/Permission";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Leave {
  @Command("leave")
  async leave(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if (!data || !data.queue || !CommandGuard.guard(data))
      return;

    if (!command.member) {
      console.log("command.member is null from Leave command");
      return;
    }

    if (data.server.perms.getPerm(command.member, PermissionTypes.forceLeave)) {
      data.server.forceLeave();
    } else {
      let voted = !data.server.leaveManager.vote(command.author);
      if (voted) {
        CommandUtil.sendEmbed(`Error`, `:x: You have already voted leave.`, data.textChannel, 0xff0000);
      } else if (data.server.leaveManager.votedCount > 0) { //check for vote has not passed yet to display message
        CommandUtil.sendEmbed(`Leave`, data.server.leaveManager.createMessage(command.author, "disconnect this bot"), data.textChannel);
      }
    }
  }
}
