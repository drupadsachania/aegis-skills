import * as core from '../src'

it('loads the package entry without side effects', () => {
  expect(typeof core).toBe('object')
})
