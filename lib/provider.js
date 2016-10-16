'use babel'

/*
 * Autocomplete+ provider
 */

import luaparse from 'luaparse'
import analysis from './analysis'
import getOptions from './options'
import { configObserve, configDispose } from './config'

export default class LuaProvider {
  selector = '.source.lua';
  disableForSelector = '.source.lua .comment';
  inclusionPriority = 1;
  excludeLowerPriority = false;
  disposeables = [];

  constructor () {
    __LOG__ && console.log('new LuaProvider()')
    this.disposeables.push(window.atom.config.observe('autocomplete-lua.excludeLowerPriority', (value) => {
      this.excludeLowerPriority = value
    }))
    this.disposeables.push(window.atom.config.observe('autocomplete-lua.inclusionPriority', (value) => {
      this.inclusionPriority = value
    }))
    configObserve()
  }

  dispose () {
    this.disposeables.forEach(d => d.dispose())
    this.disposeables.length = 0
    configDispose()
  }

  getSuggestions = async function (request) {
    const buffer = request.editor.getBuffer()
    let prefix = request.prefix
    const cursorIndex = buffer.characterIndexForPosition(request.bufferPosition)
    let charsToPrefix = cursorIndex - prefix.length

    prefix = prefix.replace(/\s*$/, '') // trim from back
    const prefLen = prefix.length
    prefix = prefix.replace(/^\s*/, '') // trim from front
    charsToPrefix += prefLen - prefix.length

    // is there a cleaner way of treating this?
    if (prefix === '.' || prefix === ':') {
      prefix = ''
      charsToPrefix++
    } else {
      // we don't do untriggered 0-length completions
      if (!request.activatedManually && prefix.length === 0) {
        return []
      }
    }

    __LOG__ && console.log('suggestions', request, prefix)

    const textInIndexRange = (a, b) => buffer.getTextInRange([
      buffer.positionForCharacterIndex(a),
      buffer.positionForCharacterIndex(b)
    ])
    const dotEndPos = buffer.positionForCharacterIndex(charsToPrefix)
    const dotLine = buffer.getTextInRange([[dotEndPos.row, 0], dotEndPos])
    const dot = dotLine.match(/([^\s])?\s*$/)[1]

    analysis.init(await getOptions(request))
    analysis.setQuery({ prefix, charsToPrefix, dot })

    luaparse.parse({
      wait: true,
      comments: false,
      ranges: true,
      scope: true,
      onCreateNode (node) {
        analysis.onCreateNode(node)
      },
      onCreateScope () {
        analysis.onCreateScope()
      },
      onDestroyScope () {
        analysis.onDestroyScope()
      },
      onScopeIdentifierName (newName) {
        analysis.onScopeIdentifierName(newName)
      }
    })

    try {
      luaparse.write(textInIndexRange(0, charsToPrefix))

      if (dot === '.' || dot === ':') {
        luaparse.write('__prefix_placeholder__')
      }

      let continuePos = cursorIndex
      if (request.activatedManually) {
        let nextChar = textInIndexRange(cursorIndex, cursorIndex + 1)
        if (nextChar.replace(/\s/g, '').length !== 0) { // ...and the next char is non-whitespace
          continuePos = charsToPrefix // parse the prefix as well
        }
      }

      luaparse.end(textInIndexRange(continuePos, Infinity))
    } catch (ex) {
      if (__LOG__) { console.error(ex) }
    }
    analysis.end()

    return await analysis.solveQuery()
  }
};
