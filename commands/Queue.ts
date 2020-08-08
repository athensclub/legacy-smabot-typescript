import { Command, CommandMessage } from "@typeit/discord";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Queue {
  @Command("queue")
  async queue(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !data.queue || !CommandGuard.guard(data))
      return;

    const songs = data.queue.songs;
    let msg = "";

    for(let i = 0;i < songs.length;i++){
        let current = songs[i];
        if(i === data.queue.currentIndex){
          msg += "    **⬐ current track**\n"
        }
        msg += `${i+1}) ${current.title}\n`;
        if(i === data.queue.currentIndex){
          msg += "    **⬑ current track**\n"
        }
    }

    CommandUtil.sendEmbed("Queue",msg,command.channel);

  }
}
