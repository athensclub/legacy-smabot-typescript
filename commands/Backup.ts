
import { Command, CommandMessage } from "@typeit/discord";
import { backup } from "../core/Backup";
import { Main } from "../Main";
import { CommandUtil } from "../util/CommandUtil";

let usableID = ['420564488484290560']; // You can change custom user id which can use !backup command here

export abstract class Backup {
  @Command("backup")
  async backup(command: CommandMessage) {

    if (!Main.getConfig("use_google_drive_backup")) {
      CommandUtil.sendEmbed(`Error`, `:x: Google Drive backup feature is not enabled in SMABot configuration file (see property "use_google_drive_backup" in smabotconfig.json).`,
        command.channel, 0xff0000);
      return;
    }

    if (!usableID.includes(command.author.id)) {
      CommandUtil.sendEmbed(`Error`, `:x: You can not use backup commands, only the developers can use this command.`, command.channel, 0xff0000);
      return;
    }

    let msg = await CommandUtil.sendEmbed("Upload backup", "Uploading backup! Please wait a few seconds.", command.channel);
    await backup.upload();
    msg.delete();
    CommandUtil.sendEmbed("Upload backup", "Successfully uploaded backup!", command.channel);

  }
}
