'use babel'
/* global describe, it, expect, beforeEach, waitsForPromise */

import Analysis from '../lib/analysis'
import { tableNew, contextNew } from '../lib/typedefs'

async function getSuggestions (options, text, prefix = '', dot = null) {
  const analysis = new Analysis(options, { prefix, dot })
  analysis.end(text)
  const results = await analysis.solveQuery()
  return results.map(suggestion => suggestion.text)
}

describe('When analysing with empty options', () => {
  let options

  beforeEach(() => {
    options = {
      context: contextNew(),
      global: tableNew()
    }
  })

  it('should suggest _G', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        __prefix_placeholder__.__prefix_placeholder__()
      `)
      expect(suggestions).toEqual(['_G'])
    })
  })
})
