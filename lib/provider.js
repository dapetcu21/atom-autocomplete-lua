'use babel'

import luaparse from 'luaparse'
import analysis from './analysis'
import getOptions from './options'

export default class LuaProvider {
  selector = '.source.lua';
  disableForSelector = '.source.lua .comment';
  inclusionPriority = 1;
  excludeLowerPriority = true;

  getSuggestions = async function (request) {
    const buffer = request.editor.getBuffer()
    let prefix = request.prefix
    const cursorIndex = buffer.characterIndexForPosition(request.bufferPosition)
    let charsToPrefix = cursorIndex - prefix.length

    prefix = prefix.replace(/^\s*/, '') // trim

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

    console.log('suggestions', request)

    const textInIndexRange = (a, b) => buffer.getTextInRange([
      buffer.positionForCharacterIndex(a),
      buffer.positionForCharacterIndex(b)
    ])
    const dot = textInIndexRange(charsToPrefix - 1, charsToPrefix)
    console.log({ prefix, charsToPrefix, dot })

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
      console.error(ex)
    }
    analysis.end()

    return await analysis.solveQuery()
  }
};
