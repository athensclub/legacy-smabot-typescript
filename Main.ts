import { Client } from "@typeit/discord";
import { backup } from "./core/Backup";
import fs from "fs";
import path from "path";

export class Main {
  private static _client: Client;

  private static config: any;

  /**
   * Get the configuration read from smabotconfig.json
   * @param name 
   */
  public static getConfig(name: string): any{
    return Main.config[name];
  }

  static async start() {

    Main.config = JSON.parse(fs.readFileSync(path.join(__dirname, "../", "smabotconfig.json")).toString());

    this._client = new Client();

    if(Main.getConfig("use_google_drive_backup")){
      await backup.init();
      console.log("Loading previous backup...");
      await backup.load();
      setInterval(function(){
        console.log("Performing bi-daily backup...");
        backup.upload();
      },
      1000*60*60*12);
    }

    let key = fs.readFileSync(path.join(__dirname, "../", "datas", "discord_api_key.txt")).toString();
    this._client.login(
      key,
      `${__dirname}/discords/*.js` // If you compile your bot, the file extension will be .js
    );

  }
}

Main.start() 
