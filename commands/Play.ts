import { Command, CommandMessage } from "@typeit/discord"
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Play {

  @Command("play")
  async play(command: CommandMessage) {
    const data = CommandUtil.extractData(command);
    if(!data || !CommandGuard.guard(data))
      return;

    if(!data.commandContent){
      CommandUtil.sendEmbed(`Error`,":x: Please enter song name or url.",command.channel,0xff0000);
      return;
    }

    let song = await CommandUtil.getSong(data.commandContent);
    await data.server.addToQueue(song,command,data);

  }
}
