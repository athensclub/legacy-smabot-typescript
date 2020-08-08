import { Song } from "./Servers";

export class Library{

  songs: Song[];

  constructor(){
    this.songs = [];
  }

  serialize(): object{
    let song = [];
    for(let s of this.songs){
      song.push(s.serialize());
    }
    return {
      songs: song
    };
  }

  static deserialize(obj: any): Library{
    let result = new Library();
    let songs = obj["songs"];
    for(let song of songs){
      result.songs.push(Song.deserialize(song));
    }
    return result;
  }

}
