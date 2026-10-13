'use strict'

// The writer lives in scripts/lib/zip.js (Phase 7) so release tooling can share it without depending on the web app.
// apps/web/scripts/build-downloads.js and lib/downloads.js keep importing it from here.
module.exports = require('../../../scripts/lib/zip')
