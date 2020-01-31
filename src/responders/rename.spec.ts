import rename from './rename'

import fakeMessage from '../__spec__/fake_message'

describe('ferris', () => {
  it('applies to messages starting with the trigger', () => {
    expect(rename.applicable(fakeMessage('!retf rust is great!'))).toBe(true)
    expect(rename.applicable(fakeMessage('rust is great!'))).toBe(false)
    expect(rename.applicable(fakeMessage('!retf'))).toBe(false)
  })
})
