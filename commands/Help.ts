import { Command, CommandMessage } from "@typeit/discord";
import { CommandUtil } from "../util/CommandUtil";
import fs from "fs";
import path from "path";
import { CommandGuard } from "../util/CommandGuard";

let helpObject: any = JSON.parse(fs.readFileSync(path.join(__dirname, "../../", "datas/help.json")).toString("utf8"));
const summary: string = helpObject["summary"];

let commands = helpObject["commands"];
const messages = new Map<string, string>();
for(let key in commands){
  let arr = commands[key];
  let temp = "";
  for(let str of arr){
    temp += str + "\n";
  }
  messages.set(key,temp);
}

export abstract class Loop {
  @Command("help :command")
  async help(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !CommandGuard.guard(data))
      return;

    if(!command.args.command){
      CommandUtil.sendEmbed("Help", summary, command.channel);
      return;
    }

    let c = messages.get(command.args.command.toString().toLowerCase());
    if(!c){
      CommandUtil.sendEmbed(`Error`, `:x: Unknown command: ${command.args.command}.`, data.textChannel, 0xff0000);
      return;
    }

    CommandUtil.sendEmbed(`Help !${command.args.command}`, c, command.channel);
  }
}
