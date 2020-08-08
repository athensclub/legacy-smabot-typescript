import { Command, CommandMessage } from "@typeit/discord";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Unban {
  @Command("unban")
  async unban(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !CommandGuard.guard(data))
      return;

    if(!data.commandContent){
      CommandUtil.sendEmbed(`Error`,":x: Please enter song name or url.",command.channel,0xff0000);
      return;
    }

    if(data.commandContent === "all"){
      data.server.unbanAll();
      CommandUtil.sendEmbed(`Banned`,`Every song is now playable in this server!`,command.channel);
      return;
    }

    let song = await CommandUtil.getSong(data.commandContent);
    data.server.unban(song);
    CommandUtil.sendEmbed(`Unbanned`,`**${song.title}** is now unbanned from this server!`,command.channel);



  }
}
