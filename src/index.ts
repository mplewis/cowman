import * as Discord from 'discord.js'
import rename from './responders/rename'

process.on('unhandledRejection', function (err) { throw err })

const responders = [rename]

const { TOKEN } = process.env
if (!TOKEN) throw new Error('TOKEN is unset')

const client = new Discord.Client()

let botUsername = '<unset>'
client.on('ready', () => {
  const { user } = client
  if (!user) throw new Error('No user on client')
  console.log(`Signed in as ${user.tag}`)
  botUsername = user.username
})

client.on('message', msg => {
  const { author } = msg
  if (!author) return
  if (author.bot) return

  responders.forEach(async responder => {
    if (!responder.applicable(msg)) return

    const { username: requesterUsername } = author
    const { name: responderName } = responder

    console.log(`${responderName} ← ${requesterUsername}: ${msg.content}`)
    let response: string
    try {
      response = await responder.handle(msg)
    } catch (e) {
      console.error(`Responder ${responderName} threw an error for message:`)
      console.error(msg.content)
      console.error(e)
      return
    }
    console.log(`${responderName} → ${botUsername}: ${response}`)
    msg.channel.send(response)
  })
})

client.login(TOKEN)
