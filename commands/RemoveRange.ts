import { Command, CommandMessage } from "@typeit/discord";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class RemoveRange {
  @Command("rr :begin :end")
  async removeRange(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if (!data || !CommandGuard.guard(data))
      return;

    if (!data.queue) {
      CommandUtil.sendEmbed(`Error`, ":x: There aren't any queue in this server.", command.channel, 0xff0000);
      return;
    }

    let removed = CommandUtil.removeRange(data.queue.songs, command.args.begin, command.args.end, command.channel);
    if (removed.length > 0) {
      if (data.queue.currentIndex > command.args.begin - 1) {
        data.queue.currentIndex -= command.args.end - command.args.begin;
      }

      CommandUtil.sendEmbed(`🗑️Removed`, `Removed ${removed.length} tracks!`, command.channel, 0x696969);
    }
    
  }
}
