import * as Discord from 'discord.js'

export interface Responder {
  name: string;
  applicable(msg: Discord.Message): boolean;
  handle(msg: Discord.Message): Promise<string>;
}
