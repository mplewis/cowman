import * as Discord from 'discord.js'
import ferris from './responders/ferris'
import riir from './responders/riir'
import roulette from './responders/roulette'
import annoy from './responders/annoy'

process.on('unhandledRejection', function (err) { throw err })

const responders = [ferris, riir, roulette, annoy]

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

  responders.forEach(responder => {
    if (!responder.applicable(msg)) return

    const { username: requesterUsername } = author
    const { name: responderName } = responder

    console.log(`${responderName} ← ${requesterUsername}: ${msg.content}`)
    const response = responder.handle(msg)
    console.log(`${responderName} → ${botUsername}: ${response}`)
    msg.channel.send(response)
  })
})

client.login(TOKEN)
