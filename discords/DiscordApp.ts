import { CommandNotFound, Discord, CommandMessage, On } from "@typeit/discord";
import * as Path from "path";
import { VoiceState } from "discord.js";
import { Servers } from "../core/Servers";

@Discord("!", {
  import: [
    Path.join(__dirname,"..","commands","*.js")
  ]
})
export class DiscordApp {

  @On("ready")
  onReady(){
    console.log("Discod Bot Ready!");
  }

  @On("voiceStateUpdate")
  onVoiceStateUpdate(states: VoiceState[]){
    for(let state of states){
      Servers.handleVoiceStateUpdate(state);
    }
  }


  @CommandNotFound()
  notFoundA(command: CommandMessage) {
    command.reply("Command not found");
  }
}
