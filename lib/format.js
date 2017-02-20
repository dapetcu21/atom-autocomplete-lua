'use babel'

/*
 * Code to format the type definitions into ready-for-display suggestions
 */

import config from './config'
import {
  TYPE_NIL, TYPE_UNKNOWN, TYPE_BOOLEAN, TYPE_NUMBER,
  TYPE_STRING, TYPE_FUNCTION, TYPE_TABLE
} from './typedefs'

const typeNames = {
  [TYPE_NIL]: 'nil',
  [TYPE_UNKNOWN]: 'unknown',
  [TYPE_BOOLEAN]: 'boolean',
  [TYPE_NUMBER]: 'number',
  [TYPE_STRING]: 'string',
  [TYPE_FUNCTION]: 'function',
  [TYPE_TABLE]: 'table'
}

function getDefault () {
  for (let i = 0, n = arguments.length; i < n; i++) {
    const arg = arguments[i]
    if (arg !== null && arg !== undefined) { return arg }
  }
}

const emptyObject = {}
const emptyArray = []
function formatVariant (key, typeDef, variant, trimSelf) {
  const description = variant.description || typeDef.description
  const type = typeDef.type
  const docs = typeDef.docs || emptyObject
  const link = variant.link || docs.link
  const args = variant.args || docs.args || emptyArray
  const argsDisplay = trimSelf
    ? getDefault(variant.argsDisplayOmitSelf, variant.argsDisplay, docs.argsDisplayOmitSelf, docs.argsDisplay)
    : getDefault(variant.argsDisplay, docs.argsDisplay)
  const isFunction = type === TYPE_FUNCTION

  const suggestion = {
    type: isFunction ? 'function' : 'value',
    rightLabel: type === TYPE_UNKNOWN ? '' : typeNames[type],
    description,
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
    if (typeDef.docs && typeDef.docs.variants) {
      typeDef.docs.variants.forEach(variant =>
        suggestions.push(formatVariant(key, typeDef, variant, trimSelf))
      )
    } else {
      suggestions.push(formatVariant(key, typeDef, emptyObject, trimSelf))
    }
  })
  return suggestions
}
