'use babel'

import config from './config'

const emptyVariant = {}
const emptyArray = []
function formatVariant (key, typeDef, variant, prefix) {
  const description = variant.description || typeDef.description
  const type = typeDef.type
  const link = variant.link || typeDef.link
  const args = variant.args || typeDef.args || emptyArray

  const suggestion = {
    replacementPrefix: prefix,
    type: type === 'function' ? 'function' : 'value',
    rightLabel: type === 'unknown' ? '' : type,
    description,
    descriptionMoreURL: link
  }

  if (type === 'function') {
    suggestion.displayText = key + '(' + args.map(a => a.displayName).join(', ') + ')'
  }

  if (config.useSnippets && type === 'function') {
    const signature = args
        .map((a, i) => `\${${i + 1}:${a.name}}`)
        .join(', ') || '$1'
    suggestion.snippet = `${key}(${signature})\$${(args.length || 1) + 1}`
  } else {
    suggestion.text = key
  }

  return suggestion
}

export default function formatResults (results, prefix) {
  const suggestions = []
  results.forEach(({ key, typeDef }) => {
    if (typeDef.variants) {
      typeDef.variants.forEach(variant =>
        suggestions.push(formatVariant(key, typeDef, variant, prefix))
      )
    } else {
      suggestions.push(formatVariant(key, typeDef, emptyVariant, prefix))
    }
  })
  return suggestions
}
