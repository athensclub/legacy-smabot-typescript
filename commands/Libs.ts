import { Command, CommandMessage } from "@typeit/discord";
import { Library } from "../core/Libraries";
import { PermissionTypes } from "../core/Permission";
import { CommandGuard } from "../util/CommandGuard";
import { CommandUtil } from "../util/CommandUtil";

export abstract class Libs {
  @Command("libs :action :index :index2 :index3")
  async libs(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if (!data || !CommandGuard.guard(data))
      return;

    if (!command.args.action) {
      //print all user's library
      if (data.user.libraries.length === 0) {
        CommandUtil.sendEmbed(`Libraries`, `Libraries of ${CommandUtil.tag(command.author)}: None`, command.channel);
        return;
      }

      let msg = `Libraries of ${CommandUtil.tag(command.author)}:\n`;
      let i = 1;
      for (let lib of data.user.libraries) {
        if (i !== 1)
          msg += "\n";
        if (lib.songs.length > 0) {
          msg += `Library #${i++}:\n`;
          let j = 1;
          for (let song of lib.songs) {
            msg += `**Song ${j++}**: ${song.toMessageString()}\n`;
          }
        } else {
          msg += `Library #${i++}: No songs\n`;
        }
      }
      CommandUtil.sendEmbed(`Libraries`, msg, command.channel);

    } else {

      if (command.args.action === "new") {
        data.user.libraries.push(new Library());
        CommandUtil.sendEmbed(`Libraries`, `New song library successfully created!`, command.channel);
      } else if (["add", "rr", "play"].includes(command.args.action)) { // command that requires library index
        let idx: number = command.args.index;
        if (!idx) {
          CommandUtil.sendEmbed(`Error`, `:x: Please specify the library number.`, command.channel, 0xff0000);
          return;
        }

        if (idx - 1 < 0 || idx - 1 >= data.user.libraries.length) {
          CommandUtil.sendEmbed(`Error`, `:x: Library number out of range.`, command.channel, 0xff0000);
          return;
        }

        let library = data.user.libraries[idx - 1];
        if (!library) {
          CommandUtil.sendEmbed(`Error`, `:x: You must use numbers to index the libraries.`, command.channel, 0xff0000);
          return;
        }

        if (command.args.action === "add") {
          let songData = data.commandContent?.substring(5 + idx.toString().length); // 3 for add,1 for space, idx length, 1 for space after idx => 5 + idx length
          if (!songData) {
            CommandUtil.sendEmbed(`Error`, `:x: Please specify the song name or url.`, command.channel, 0xff0000);
            return;
          }

          let song = await CommandUtil.getSong(songData);
          library.songs.push(song);
          CommandUtil.sendEmbed(`Libraries`, `Successfully added **${song.title}** to library #${idx}.`,
            command.channel);
        } else if (command.args.action === "rr") {
          let removed = CommandUtil.removeRange(library.songs, command.args.index2, command.args.index3, command.channel);
          if (removed.length > 0)
            CommandUtil.sendEmbed(`🗑️Removed`, `Removed ${removed.length} tracks from libary #${idx}!`, command.channel, 0x696969);
        } else if (command.args.action === "play") {
          if (!CommandGuard.forceGuardVoiceChannelOnly(data) ||
            !CommandGuard.forceGuardPerm(data, PermissionTypes.play))
            return;
          for (let song of library.songs) {
            await data.server.addToQueue(song, command, data);
          }
        }

      } else {
        CommandUtil.sendEmbed(`Error`, `:x: Unknown !libs subcommand: ${command.args.action}`, command.channel, 0xff0000);
        return;
      }

    }
  }
}
