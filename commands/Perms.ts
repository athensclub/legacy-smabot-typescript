import { Command, CommandMessage } from "@typeit/discord";
import { CommandUtil } from "../util/CommandUtil";
import { User } from "discord.js";
import { PermissionTypes, ServerPermissions } from "../core/Permission";
import { CommandGuard } from "../util/CommandGuard";

export abstract class Perms {
  @Command("perms :user :permName :isAllowed")
  async perms(command: CommandMessage) {
    let data = CommandUtil.extractData(command);
    if(!data || !CommandGuard.guard(data))
      return;

    if(!command.args.permName || !command.args.isAllowed){
      //print permission for user/caller
      let user: User = await CommandUtil.getUserByTag(command,command.args.user) ?? command.author;
      let member = command.guild?.member(user);
      if(!member){
        console.log("member is null | undefined");
        return;
      }

      let msg = `Permissions of ${CommandUtil.tag(user)}\n`;
      for(let perm of PermissionTypes.PERM_TYPES){
        msg += `${data.server.perms.getPerm(member,perm) ? ":white_check_mark:" : ":x:"}  **${perm.name}**\n`;
      }
      CommandUtil.sendEmbed(`View Permissions`,msg,command.channel);

    }else{
      //set permission
      if(!command.member){
        console.log("member is null");
        return;
      }

      if(!command.member.hasPermission("ADMINISTRATOR")){
        CommandUtil.sendEmbed(`Error`,
          `:x:  ${CommandUtil.tag(command.author)} is not an administrator, they can not set permissions for other users.`
          ,command.channel,0xff0000);
        return;
      }

      let isAllowed = command.args.isAllowed;
      let value = isAllowed == "allow" ? true : isAllowed == "deny" ? false : null;
      if(value == null){
        CommandUtil.sendEmbed(`Error`,
          `:x:  ${CommandUtil.tag(command.author)}, ${isAllowed} is not a valid expression. Choose either allow or deny.`
          ,command.channel,0xff0000);
        return;
      }

      let user = await CommandUtil.getUserByTag(command,command.args.user);
      if(!user){
        CommandUtil.sendEmbed(`Error`,
          `:x: ${CommandUtil.tag(command.author)}, Unknown user: ${command.args.user}.`
          ,command.channel,0xff0000);
        return;
      }

      let member = command.guild?.member(user);
      if(!member){
        console.log("member is null | undefined");
        return;
      }

      let permName = command.args.permName;
      if(!PermissionTypes.fromName(permName) && permName != "all"){
        CommandUtil.sendEmbed(`Error`,
          `:x: ${CommandUtil.tag(command.author)}, Permission for ${command.args.permName} does not exist.`
          ,command.channel,0xff0000);
        return;
      }

      if(command.guild?.owner?.id === user.id){
        CommandUtil.sendEmbed(`Error`,
          `:x: ${CommandUtil.tag(command.author)}, You can not set permission for the server owner. The owner always has all permissions allowed.`
          ,command.channel,0xff0000);
        return;
      }

      if(member.hasPermission("ADMINISTRATOR") && command.guild?.owner?.id !== command.author.id){
        CommandUtil.sendEmbed(`Error`,
          `:x: ${CommandUtil.tag(command.author)}, Only server owner can set permission for user with administrator permission.`
          ,command.channel,0xff0000);
      }

      if(permName.toLowerCase() === "all"){
        for(let p of PermissionTypes.PERM_TYPES){
          data.server.perms.setPerm(member,p,value);
        }
        CommandUtil.sendEmbed(`Set Permission`,
        `Successfully set all permissions for ${CommandUtil.tag(user)}.`,command.channel);
        return;
      }

      let permType = PermissionTypes.fromName(permName);
      if(!permType){
        CommandUtil.sendEmbed(`Error`,
          `:x: ${CommandUtil.tag(command.author)}, Permission with name ${permName} does not exist.`
          ,command.channel,0xff0000);
        return;
      }

      data.server.perms.setPerm(member,permType,value);
      CommandUtil.sendEmbed(`Set Permission`,
        `Successfully set permission ${permName} for ${CommandUtil.tag(user)}.`,command.channel);

    }

  }
}
