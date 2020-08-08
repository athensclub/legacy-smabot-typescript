import { Command, CommandMessage } from "@typeit/discord";
import { PermissionTypes } from "../core/Permission";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Skip {
  @Command("skip")
  async skip(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if (!data || !data.queue || !CommandGuard.guard(data))
      return;

    if (!command.member) {
      console.log("command.member is null from Skip command");
      return;
    }

    if (data.server.perms.getPerm(command.member, PermissionTypes.forceSkip)) {
      data.server.forceSkip();
    } else {
      let voted = !data.server.skipManager.vote(command.author);
      if (voted) {
        CommandUtil.sendEmbed(`Error`, `:x: You have already voted skip.`, data.textChannel, 0xff0000);
      } else if (data.server.skipManager.votedCount > 0) { //check for vote has not passed yet to display message
        CommandUtil.sendEmbed(`Skip`, data.server.skipManager.createMessage(command.author, "skip the current song"), data.textChannel);
      }
    }
  }
}
