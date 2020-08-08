import { TextChannel, VoiceChannel, VoiceConnection, Message, VoiceState, User } from "discord.js"
import { ServerPermissions } from "./Permission";
import { CommandUtil, CommandData } from "../util/CommandUtil";
import { CommandMessage } from "@typeit/discord";
import ytdl from "ytdl-core"

export abstract class Servers {

  static servers: Map<string, Server> = new Map();

  static handleVoiceStateUpdate(state: VoiceState) {
    if (!state.channel)
      return;

    let server = Servers.servers.get(state.guild.id);
    if (!server || !server.queue)
      return;

    if (server.queue.voiceChannel.id === state.channel.id) {
      server.update();
    }
  }

}

/**
 * Handle the auto leaving for the bot.
 */
class AutoLeaveManager {

  private timeout: NodeJS.Timeout | null;
  private server: Server;

  constructor(server: Server) {
    this.timeout = null;
    this.server = server;
  }

  /**
   * Called to update logic of this manager. It will update the timeout if the voice channel state is changed.
   * Will be indirectly called automatically by Servers.handleVoiceStateUpdate().
   */
  async update(): Promise<void> {
    let channel = this.server.queue?.voiceChannel;
    if (!channel) {
      console.log("channel is null from AutoLeaveManager");
      return;
    }

    if (channel.members.size <= 1 && this.timeout === null) {
      this.timeout = setTimeout(() => {
        if (!this.server.queue) {
          //should never happen?
          console.log("Server queue is null from AutoLeaveManager Timeout");
          return;
        }

        CommandUtil.sendEmbed("Disconnection", "I am leaving voice channel because I was inactive for too long!", this.server.queue.textChannel);
        this.server.disconnect();
      }, 1000 * 60 * 10);
    } else if (channel.members.size > 0 && this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

}

class VoteManager {

  private server: Server;
  private voted: Set<string>;
  private onVotePass: () => void;

  constructor(server: Server, onVotePass: () => void) {
    this.server = server;
    this.voted = new Set<string>();
    this.onVotePass = onVotePass;
  }

  /**
   * Create message to be displayed when a vote has occured.
   * The message is the following: "{User} voted to {action} ({voted}/{user_count})."
   * @param user the user that is doing the vote.
   * @param action the goal of the vote, or the result when the vote pass.
   */
  createMessage(user: User, action: string): string {
    if (!this.server.queue)
      return "There is no song queue in this server!";
    let bot = CommandUtil.botCount(this.server.queue.voiceChannel);
    return `${CommandUtil.tag(user)} voted to ${action} (${this.votedCount - bot}/${Math.floor((this.server.queue.voiceChannel.members.size - bot) / 2)}).`;
  }

  /**
   * @returns The amount of people that has already voted.
   */
  get votedCount(): number {
    return this.voted.size;
  }

  /**
   * Make the given user id vote.
   * @param user the user id that is voting.
   * @returns true if the user has not voted yet, returns false if the user
   * already voted.
   */
  vote(user: User): boolean {
    if (this.voted.has(user.id))
      return false;
    this.voted.add(user.id);
    this.checkPass();
    return true;
  }

  /**
   * Reset the vote count to be empty.
   */
  reset() {
    this.voted.clear();
  }

  private checkPass() {
    if (!this.server.queue)
      return;
    let bot = CommandUtil.botCount(this.server.queue.voiceChannel);
    if (this.voted.size > 0 &&
      this.voted.size >= (this.server.queue.voiceChannel.members.size - bot) / 2) {
      this.reset();
      this.onVotePass();
    }
  }

  /**
   * Check whether the vote is enough, and do the action if it is.
   */
  async update() {
    if (!this.server.queue)
      return;

    for (let voter of this.voted) {
      if (!this.server.queue.voiceChannel.members.some((m, k) => m.user.id === voter)) {
        this.voted.delete(voter);
      }
    }

    this.checkPass();

  }

}

export class Server {

  perms: ServerPermissions;
  queue: ServerQueue | null;
  autoLeave: AutoLeaveManager;
  skipManager: VoteManager;
  leaveManager: VoteManager;

  /**
   * A mapping from a banned song url to the banned song title. All the songs in this map can not be played
   * on this server.
  */
  blacklist: Map<string, Song>;

  constructor() {
    this.perms = new ServerPermissions();
    this.queue = null;
    this.blacklist = new Map();
    this.autoLeave = new AutoLeaveManager(this);
    this.skipManager = new VoteManager(this, () => this.forceSkip()); //this.forceSkip as argument doesnt work, idk why
    this.leaveManager = new VoteManager(this, () => this.forceLeave()); //similar behavior might apply here, so i use anonymous function instead
  }

  /**
   *  Ban the given song from this server.
  */
  ban(song: Song): void {
    this.blacklist.set(song.url, song);
  }

  /**
   * Remove the given song from this server's blacklist, making it playable again.
  */
  unban(song: Song): void {
    this.blacklist.delete(song.url);
  }

  /**
   *  Unban all the song that is banned on this server.
  */
  unbanAll(): void {
    this.blacklist.clear();
  }

  /**
   * Force the skip of the current song. This will does nothing if the queue does not exist.
   */
  forceSkip(): void {
    if (!this.queue) {
      console.log("server.queue is null from forceSkip()");
      return;
    }
    this.queue.connection.dispatcher.end();
    CommandUtil.sendEmbed("Skip", "Skipped 1 track!", this.queue.textChannel);
  }

  /**
   * Force the bot to leave voice channel. this will does nothing if queue does not exist.
   */
  forceLeave(): void {
    if (!this.queue)
      return;
    let channel = this.queue.textChannel;
    this.disconnect();
    CommandUtil.sendEmbed("Disconnection", "Successfully left voice chat!", channel);
  }

  /**
   * Called when there is a change in this server instance's voice channel.
   * Does nothing when there is no queue in this server.
   */
  async update(): Promise<void> {
    if (!this.queue)
      return;
    this.queue.voiceChannel = await this.queue.voiceChannel.fetch();
    this.autoLeave.update();
    this.skipManager.update();
    this.leaveManager.update();
  }

  /**
   * Make the bot play the next song in the queue of this server.This will be called automatically when songs
   * are added to empty queue, and when the current song finishes playing, so the client should not ever call
   * this function.
  */
  private async play(): Promise<void> {

    if (!this.queue) {
      //should never happen
      console.log("queue is null");
      return;
    }

    if (this.queue.currentIndex >= this.queue.songs.length && this.queue.looping) {
      this.queue.currentIndex = this.queue.currentIndex % this.queue.songs.length;
    }

    const song = this.queue.songs[this.queue.currentIndex];
    if (!song) {
      this.disconnect();
      return;
    }

    this.skipManager.reset();

    this.queue.currentSong = song;
    const dispatcher = this.queue.connection
      .play(ytdl(song.url))
      .once("finish", () => {
        if (this.queue) {
          this.queue.currentIndex++;
          this.play();
        }
      })
      .on("error", (error: any) => console.error(error))
      .on('uncaughtException', err => console.error(err.stack));
    dispatcher.setVolumeLogarithmic(this.queue.volume / 5);

    if (this.queue.currentMessage !== null) {
      this.queue.currentMessage.delete();
    }
    let message = await CommandUtil.sendEmbed(`Currently playing`, `:notes: **${song.title}** is now playing.`, this.queue.textChannel);
    this.queue.currentMessage = message;
  }

  /**
   * Add the given song to the server's queue. This will return true only if the song is 
   * successfully added to the queue.
   * @param song the song to be added to the queue
   * @param command the command message instance of the discord user
   * @param data the command data extracted by CommandUtil.extractData method 
   */
  async addToQueue(song: Song, command: CommandMessage, data: CommandData): Promise<boolean> {

    if (this.blacklist.has(song.url)) {
      CommandUtil.sendEmbed(`Error`, `:x: The song **${song.title}** is banned on this server!`, command.channel);
      return false;
    }

    if (!this.queue) {
      if (!(command.channel instanceof TextChannel)) {
        console.log("channel is not TextChannel");
        return false;
      }

      if (!data.voiceChannel) {
        //should already be handled by extractData, this should not happen
        console.log("voice channel is null");
        return false;
      }

      let connection = await data.voiceChannel.join();
      let queueContruct: ServerQueue = {
        textChannel: command.channel,
        voiceChannel: data.voiceChannel,
        connection: connection,
        currentSong: song,
        songs: [song],
        volume: 5,
        currentIndex: 0,
        playing: true,
        looping: false,
        currentMessage: null
      };
      this.queue = queueContruct;
      this.play();
    } else {
      this.queue.songs.push(song);
      CommandUtil.sendEmbed(`Queue`, `Added **${song.title}** to the queue!`, command.channel);
    }
    return true;
  }

  /**
  Disconnect this bot from the server's voice channel and clear all the queue.
  */
  disconnect(): void {
    this.queue?.connection.disconnect();
    this.queue?.currentMessage?.delete();
    this.queue = null;
  }

  serialize(): object {
    let result: any = {};
    let blacklist: any = {};
    for (let [url, song] of this.blacklist) {
      blacklist[url] = song.serialize;
    }
    return {
      perms: this.perms.serialize(),
      blacklist: blacklist
    };
  }

  static deserialize(obj: any): Server {
    let result = new Server();
    let blacklist = obj["blacklist"];
    for (let url in blacklist) {
      result.blacklist.set(url, Song.deserialize(blacklist[url]));
    }
    result.perms = ServerPermissions.deserialize(obj["perms"]);
    return result;
  }

}

export interface ServerQueue {
  textChannel: TextChannel,
  voiceChannel: VoiceChannel,
  connection: VoiceConnection,
  currentSong: Song,
  currentIndex: number,
  songs: Song[],
  volume: number,
  playing: boolean,
  looping: boolean,
  currentMessage: Message | null
}

export class Song {
  url: string;
  title: string;

  /**
   * Deserialize javascript object into instance of Song class.
   * @param obj the javascript object serialized from the Song instance
   */
  static deserialize(obj: any): Song {
    return new Song(obj["url"], obj["title"]);
  }

  constructor(url: string, title: string) {
    this.url = url;
    this.title = title;
  }

  serialize(): object {
    return {
      url: this.url,
      title: this.title
    };
  }

  equals(song: Song): boolean {
    return song.url === this.url;
  }

  toMessageString() {
    return `**${this.title}** (${this.url})`;
  }

}
