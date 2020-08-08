import { Command, CommandMessage } from "@typeit/discord";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Loop {
  @Command("loop")
  async loop(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !data.queue || !CommandGuard.guard(data))
      return;

    data.queue.looping = !data.queue.looping;
    let msg = data.queue.looping ? ":repeat: Currently looping queue!" : "Stopped looping queue!";
    let loopTitle = data.queue.looping ? "Looped" : "Unlooped";
    CommandUtil.sendEmbed(loopTitle,msg,command.channel);
  }
}
