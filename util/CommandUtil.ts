import { CommandMessage } from "@typeit/discord";
import { VoiceChannel, Guild, TextChannel, DMChannel, NewsChannel, User, MessageEmbed, Message, GuildMember } from "discord.js";
import { Servers, Server, ServerQueue, Song } from "../core/Servers";
import { BUser, Users } from "../core/Users";
import { Command, CommandTypes } from "../core/Commands";
import ytdl from "ytdl-core";
import YouTube from "discord-youtube-api"
import utf8 from "utf8"
import fs from "fs"
import path from "path"

const youtubeApiKey = fs.readFileSync(path.join(__dirname, "../../", "datas", "youtube_api_key.txt")).toString();
const youtube = new YouTube(youtubeApiKey);

export abstract class CommandUtil {

  static async sendEmbed(title: string, desc: string, channel: TextChannel | DMChannel | NewsChannel, color?: number): Promise<Message> {
    const richEmbed = new MessageEmbed();
    richEmbed.setTitle(title);
    richEmbed.setDescription(desc);
    richEmbed.setColor(color ?? 0x00ff00);
    return await channel.send({
      content: "",
      embed: richEmbed
    });
  }

  static async getUserByTag(command: CommandMessage, tag: string): Promise<User | null> {
    return (await command.guild?.members.fetch(CommandUtil.idFromTag(tag)))?.user ?? null;
  }

  static tag(user: User): string {
    return `<@!${user.id}>`;
  }

  static idFromTag(tag: string): string {
    if (tag?.startsWith("<@!")) {
      return tag?.substring(3, tag.length - 1) ?? null;
    }
    return tag?.substring(2, tag.length - 1) ?? null;
  }

  /**
  Take in either a url or title to be searched on youtube, returns the requested song.
  */
  static async getSong(query: string): Promise<Song> {
    let url, title;
    if (query.startsWith("http")) {
      url = query;
      const songInfo = await ytdl.getInfo(url);
      title = songInfo.title;
    } else {
      let vid = await youtube.searchVideos(utf8.encode(query), 1);
      url = vid.url;
      title = vid.title;
    }
    
    const song: Song = new Song(url, title);
    return song;
  }

  static extractData(command: CommandMessage): CommandData | null {

    let commandName = command.commandContent;
    let idx = commandName.indexOf(" ");
    idx = idx < 0 ? commandName.length : idx;
    let commandContent = idx + 1 >= commandName.length ? null : commandName.substring(idx + 1);
    commandName = commandName.substring(0, idx);

    const member = command.member;
    if (!member) {
      console.log("member is unknown");
      return null;
    }

    if (!command.guild) {
      console.log("Guild is unknown");
      return null;
    }

    let commandType = CommandTypes.fromName(commandName);
    if(!commandType){
      console.log("Command type is unknown");
      return null;
    }

    let server = Servers.servers.get(command.guild.id);
    if (!server) {
      let serverConstruct: Server = new Server();
      Servers.servers.set(command.guild.id, serverConstruct);
      server = serverConstruct;
    }
    let serverQueue = server.queue;

    let user = Users.users.get(command.author.id);
    if (!user) {
      let userConstruct: BUser = new BUser();
      Users.users.set(command.author.id, userConstruct);
      user = userConstruct;
    }

    const textChannel = command.channel;
    if (!(textChannel instanceof TextChannel)) {
      CommandUtil.sendEmbed("Error", ":x: You must be in a normal text channel to use my commands (not in news or DM).", command.channel, 0xff0000);
      return null;
    }

    return {
      user: user,
      server: server,
      queue: serverQueue,
      voiceChannel: member.voice.channel,
      textChannel: textChannel,
      guild: command.guild,
      commandName: commandName,
      commandContent: commandContent,
      commandType: commandType,
      member: member
    };
  }

  /**
   * Remove elements from given array from the given begin index and end index 
   * (input must be 1-indexed, shifted to 0-indexed by this function). This function
   * will display error message to the given text channel if error occurs. 
   * @param songs the array of song to be applied
   * @param begin the begin index of the songs that need to be removed (inclusive, 1-indexed)
   * @param end the end index of the songs that need to be removed (inclusive, 1-indexed)
   * @param channel the channel to send error message to in case of error
   * @returns the list of the removed songs
   */
  static removeRange(songs: Song[], begin: number | undefined, end: number | undefined, channel: TextChannel | NewsChannel | DMChannel): Song[]{

    if(!begin){
      CommandUtil.sendEmbed(`Error`,`:x: Please specify the beginning index of the range to remove.`,
        channel,0xff0000);
      return [];
    }

    if(!end){
      CommandUtil.sendEmbed(`Error`,`:x: Please specify the ending index of the range to remove.`,
        channel,0xff0000);
      return [];
    }

    if(begin > end){
      CommandUtil.sendEmbed(`Error`,":x: Invalid input (beginning index > ending index). Please try again.",
      channel,0xff0000);
      return [];
    }

    if(begin < 1 || begin > songs.length){
      CommandUtil.sendEmbed(`Error`,":x: Remove range input out of range. Please try again.",channel,0xff0000);
      return [];
    }

    if(end < 1 || end > songs.length){
      CommandUtil.sendEmbed(`Error`,":x: Remove range input out of range. Please try again.",channel,0xff0000);
      return [];
    }

    return songs.splice(begin-1,end - begin + 1);

  }

  static botCount(channel: VoiceChannel): number{
    return channel.members.filter(member => member.user.bot).size;
  }

}

export interface CommandData {

  user: BUser,
  server: Server,
  queue: ServerQueue | null,
  voiceChannel: VoiceChannel | null,
  textChannel: TextChannel,
  guild: Guild,
  commandType: Command,
  commandName: string,
  commandContent: string | null,
  member: GuildMember

}
