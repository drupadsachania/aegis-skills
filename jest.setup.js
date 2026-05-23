require('@testing-library/jest-dom')

// In jsdom environments, prevent @testing-library/user-event from replacing
// the navigator.clipboard mock set in beforeEach, so jest.fn() assertions work.
if (typeof window !== 'undefined') {
  const Clipboard = require('./node_modules/@testing-library/user-event/dist/cjs/utils/dataTransfer/Clipboard.js')
  Clipboard.attachClipboardStubToView = () => {}
}
