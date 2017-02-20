'use babel'
/* global describe, it, expect, beforeEach, waitsForPromise */

import Analysis from '../lib/analysis'
import { tableNew, contextNew } from '../lib/typedefs'

const getNames = (suggestions) => suggestions.map(suggestion => suggestion.text)

async function getSuggestions (options, text, prefix = '', dot = null) {
  const analysis = new Analysis(options, { prefix, dot })
  analysis.end(text)
  let results = await analysis.solveQuery()
  results.sort((a, b) => a.text.localeCompare(b.text))
  return results
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
      expect(getNames(suggestions)).toEqual(['_G'])
      expect(suggestions[0].rightLabel).toEqual('table')
    })
  })

  it('should suggest local variable', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        local a = 42
        __prefix_placeholder__.__prefix_placeholder__()
      `)
      expect(getNames(suggestions)).toEqual(['_G', 'a'])
      expect(suggestions[1].rightLabel).toEqual('number')
    })
  })

  it('should suggest global variable', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        a = 42
        __prefix_placeholder__.__prefix_placeholder__()
      `)
      expect(getNames(suggestions)).toEqual(['_G', 'a'])
      expect(suggestions[1].rightLabel).toEqual('number')
    })
  })

  it('should suggest table members', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        a = { foo = 42 }
        a.bar = 'baz'
        a.__prefix_placeholder__()
      `, '', '.')
      expect(getNames(suggestions)).toEqual(['bar', 'foo'])
      expect(suggestions[0].rightLabel).toEqual('string')
      expect(suggestions[1].rightLabel).toEqual('number')
    })
  })

  it('should suggest merging of double assignment', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        a = { foo = 42 }
        a = { bar = 'baz' }
        a.__prefix_placeholder__()
      `, '', '.')
      expect(getNames(suggestions)).toEqual(['bar', 'foo'])
      expect(suggestions[0].rightLabel).toEqual('string')
      expect(suggestions[1].rightLabel).toEqual('number')
    })
  })

  it('should suggest function', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        function foo() end
        __prefix_placeholder__.__prefix_placeholder__()
      `)
      expect(getNames(suggestions)).toEqual(['_G', 'foo'])
      expect(suggestions[1].rightLabel).toEqual('function')
    })
  })
})
