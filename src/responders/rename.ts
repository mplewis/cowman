import { Responder } from '../types'

const matcher = /\brust\b/i
const chance = 0.1
const messages = [
  'Did someone say Rust?',
  'Rust is the best language',
  'Psst. RIIR',
  'Sounds like someone wants to RIIR.',
  'Rust is great for all use cases!',
  'There is literally nothing that Rust is bad at',
  "Rewrite your company's core codebase in Rust",
  'Rust comes with Cargo, a great package manager',
  'I love Rust.',
  "Who doesn't love Rust?",
  "If you don't love Rust I will fight you",
  'Have you programmed in Rust today?',
  "Rust's compile-time memory safety is second to none.",
  'Rust is the best and C is the worst',
  'Imagine programming in Java when you could be writing Rust'
]

const roulette: Responder = {
  name: 'roulette',
  applicable: msg => !!(msg.content.match(matcher) && Math.random() <= chance),
  handle: _ => {
    const i = Math.floor(Math.random() * messages.length)
    return messages[i]
  }
}

export default roulette
