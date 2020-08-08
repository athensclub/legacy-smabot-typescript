import { Command, CommandMessage } from "@typeit/discord";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Ban {
  @Command("ban")
  async ban(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !CommandGuard.guard(data))
      return;

    if(!data.commandContent){
      let msg = "";
      if(data.server.blacklist.size > 0){
        msg = "The banned songs in this server are\n";
        data.server.blacklist.forEach((title,url) => {
          msg += `**${title}** (${url})\n`;
        });
      }else{
        msg = "There are no banned songs in this server!";
      }

      CommandUtil.sendEmbed("Blacklist",msg,command.channel);

    }else{
      let song = await CommandUtil.getSong(data.commandContent);
      data.server.ban(song);
      CommandUtil.sendEmbed(`Banned`,`**${song.title}** is now banned from this server!`,command.channel);
    }


  }
}
