import { licensing_v1 } from "googleapis";
import { Library } from "./Libraries";

export class Users{

  static users: Map<string,BUser> = new Map();

}

/**
A user representation used by this bot.
*/
export class BUser{

  libraries: Library[];

  constructor(){
    this.libraries = [];
  }

  serialize(): object{
    let lib = [];
    for(let l of this.libraries){
      lib.push(l.serialize());
    }
    return {
      libraries: lib
    };
  }

  static deserialize(obj: any): BUser{
    let result = new BUser();
    let libraries = obj["libraries"];
    for(let lib of libraries){
      result.libraries.push(Library.deserialize(lib));
    }
    return result;
  }

}
