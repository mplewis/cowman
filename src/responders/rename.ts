import { Responder } from '../types'

const matcher = /^rename <@!\d+> to (.+)$/i

const rename: Responder = {
  name: 'rename',
  applicable: msg => !!msg.content.match(matcher),
  handle: async msg => {
    const result = msg.content.match(matcher)
    if (!result) throw new Error('applicable matched, but no result')
    const [, newName] = result
    const target = msg.mentions.members.first()
    if (!target) throw new Error('applicable matched, but no target')
    await target.setNickname(newName)
    return `Renamed ${target.user.username} to ${newName}`
  }
}

export default rename
