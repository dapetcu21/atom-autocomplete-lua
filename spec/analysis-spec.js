'use babel'
/* global describe, it, expect, beforeEach, waitsForPromise */

import Analysis from '../lib/analysis'
import { tableNew, contextNew } from '../lib/typedefs'

const getNames = (suggestions) => suggestions.map(suggestion => suggestion.text)

async function getSuggestions (options, text, dot = null, prefix = '') {
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

  describe('types extracted from assignment', () => {
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
        `, '.')
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
        `, '.')
        expect(getNames(suggestions)).toEqual(['bar', 'foo'])
        expect(suggestions[0].rightLabel).toEqual('string')
        expect(suggestions[1].rightLabel).toEqual('number')
      })
    })
  })

  describe('types extracted from function declaration', () => {
    it('should suggest function', () => {
      waitsForPromise(async () => {
        const suggestions = await getSuggestions(options, `
          function foo (bar, baz) end
          __prefix_placeholder__.__prefix_placeholder__()
        `)
        expect(getNames(suggestions)).toEqual(['_G', 'foo'])
        expect(suggestions[1].rightLabel).toEqual('function')
        expect(suggestions[1].displayText).toEqual('foo(bar, baz)')
      })
    })

    it('should suggest function arguments', () => {
      waitsForPromise(async () => {
        const suggestions = await getSuggestions(options, `
          function foo (bar, baz)
            __prefix_placeholder__.__prefix_placeholder__()
          end
        `)
        expect(getNames(suggestions)).toEqual(['_G', 'bar', 'baz', 'foo'])
        expect(suggestions[1].rightLabel).toEqual('')
        expect(suggestions[2].rightLabel).toEqual('')
      })
    })

    it('should suggest self', () => {
      waitsForPromise(async () => {
        const suggestions = await getSuggestions(options, `
          local a = {}
          function a:foo (bar, baz)
            __prefix_placeholder__.__prefix_placeholder__()
          end
        `)
        expect(getNames(suggestions)).toEqual(['_G', 'a', 'bar', 'baz', 'self'])
      })
    })

    it('should suggest function return type', () => {
      waitsForPromise(async () => {
        const suggestions = await getSuggestions(options, `
          function foo ()
            return { bar = 42 }
          end
          foo().__prefix_placeholder__()
        `, '.')
        expect(getNames(suggestions)).toEqual(['bar'])
        expect(suggestions[0].rightLabel).toEqual('number')
      })
    })
  })

  it('should suggest types extracted from setmetatable()', () => {
    waitsForPromise(async () => {
      const suggestions = await getSuggestions(options, `
        local a = { foo = 42 }
        local metatable = {
          __index = { bar = 'baz' }
        }
        setmetatable(a, metatable)
        a.__prefix_placeholder__()
      `, '.')
      expect(getNames(suggestions)).toEqual(['bar', 'foo'])
      expect(suggestions[0].rightLabel).toEqual('string')
      expect(suggestions[1].rightLabel).toEqual('number')
    })
  })
})
