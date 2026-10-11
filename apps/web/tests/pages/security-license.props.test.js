'use strict'

const security = require('../../pages/security')
const license = require('../../pages/license')

test('security page renders SECURITY.md and reports whether the compliance mapping exists', async () => {
  const { props } = await security.getStaticProps()
  expect(props.securityHtml).toMatch(/<h1[^>]*>Security Policy<\/h1>/)
  expect(typeof props.hasComplianceMapping).toBe('boolean')
})

test('license page carries the dual-licence text', async () => {
  const { props } = await license.getStaticProps()
  expect(props.licenseText).toMatch(/Apache/)
  expect(props.licenseText).toMatch(/MIT/)
})
