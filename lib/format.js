'use babel'

/*
 * Code to format the type definitions into ready-for-display suggestions
 */

import config from './config'

function getDefault () {
  for (let i = 0, n = arguments.length; i < n; i++) {
    const arg = arguments[i]
    if (arg !== null && arg !== undefined) { return arg }
  }
}

const emptyVariant = {}
const emptyArray = []
function formatVariant (key, typeDef, variant, trimSelf) {
  const description = variant.description || typeDef.description
  const descriptionMarkdown = variant.descriptionMarkdown || typeDef.descriptionMarkdown
  const type = typeDef.type
  const link = variant.link || typeDef.link
  const args = variant.args || typeDef.args || emptyArray
  const argsDisplay = trimSelf
    ? getDefault(variant.argsDisplayOmitSelf, variant.argsDisplay, typeDef.argsDisplayOmitSelf, typeDef.argsDisplay)
    : getDefault(variant.argsDisplay, typeDef.argsDisplay)
  const isFunction = type === 'function'

  const suggestion = {
    type: isFunction ? 'function' : 'value',
    rightLabel: type === 'unknown' ? '' : type,
    description,
    descriptionMarkdown,
    descriptionMoreURL: link
  }

  let argList = args
  if (isFunction) {
    argList = (trimSelf ? args.slice(1) : args)
    const signature = argsDisplay || argList.map(a => a.displayName || a.name).join(', ')
    suggestion.displayText = key + '(' + signature + ')'
  }

  if (config.useSnippets && isFunction) {
    const signature = argList
        .map((a, i) => `\${${i + 1}:${a.name}}`)
        .join(', ') || '$1'
    suggestion.snippet = `${key}(${signature})\$${(argList.length || 1) + 1}`
  } else {
    suggestion.text = key
  }

  return suggestion
}

export default function formatResults (results, trimSelf) {
  const suggestions = []
  results.forEach(({ key, typeDef }) => {
    if (typeDef.variants) {
      typeDef.variants.forEach(variant =>
        suggestions.push(formatVariant(key, typeDef, variant, trimSelf))
      )
    } else {
      suggestions.push(formatVariant(key, typeDef, emptyVariant, trimSelf))
    }
  })
  return suggestions
}
