'use babel'

/*
 * Autocomplete+ provider
 */

import Analysis from './analysis'
import getOptions from './options'
import config, { configObserve, configDispose } from './config'
import path from 'path'

function getFilePath (request) {
  let p
  const buffer = request.editor.getBuffer()
  p = buffer.getPath()
  if (p) { return p }
  const madeUpName = buffer.madeUpName = buffer.madeUpName || `untitled-${Math.round(10000 * Math.random())}.lua`
  p = window.atom.project.rootDirectories[0]
  if (p) { return path.join(p.getPath(), madeUpName) }
  return path.join(process.cwd(), madeUpName)
}

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

    prefix = prefix.replace(/^[\s.:]*/, '')
    let charsToPrefix = cursorIndex - prefix.length

    prefix = prefix.replace(/[\s]*$/, '') // trim from back
    // we don't do untriggered 0-length completions
    if (!request.activatedManually && prefix.length === 0) {
      return []
    }
    __LOG__ && console.log('suggestions', request, prefix)
    // Convenience function to querry text in the editor from offset `a` to offset `b`
    const textInIndexRange = (a, b) => buffer.getTextInRange([
      buffer.positionForCharacterIndex(a),
      buffer.positionForCharacterIndex(b)
    ])
    const dotEndPos = buffer.positionForCharacterIndex(charsToPrefix)
    const dotLine = buffer.getTextInRange([[dotEndPos.row, 0], dotEndPos])
    const dot = dotLine.match(/([^\s])?\s*$/)[1]

    if (!request.activatedManually &&
      dot !== '.' && dot !== ':' &&
      prefix.length < Math.max(1, config.minCharsPrefix)
    ) {
      return []
    }

    request.filePath = getFilePath(request)
    const options = await getOptions(request)
    options.cwd = options.cwd || path.dirname(request.filePath)
    // Create an Analysis instance with the following querry arguments:
    const analysis = new Analysis(options, { prefix, charsToPrefix, dot }, options.namedTypes)

    try {
      analysis.write(textInIndexRange(0, charsToPrefix))

      if (dot === '.' || dot === ':') {
        analysis.write('__prefix_placeholder__()')
      } else {
        analysis.write('__prefix_placeholder__.__prefix_placeholder__()')
      }
      let continuePos = cursorIndex
      if (request.activatedManually) {
        let nextChar = textInIndexRange(cursorIndex, cursorIndex + 1)
        if (nextChar.replace(/\s/g, '').length !== 0) { // ...and the next char is non-whitespace
          continuePos = charsToPrefix // parse the prefix as well
        }
      }
      analysis.end(textInIndexRange(continuePos, Infinity))
    } catch (ex) {
      if (__LOG__) { console.error(ex) }
    }
    return await analysis.solveQuery()
  }
};
