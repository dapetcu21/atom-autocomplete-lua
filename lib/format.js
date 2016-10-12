'use babel'

const emptyVariant = {}
function formatVariant (key, typeDef, variant, prefix) {
  const description = variant.description || typeDef.description
  const type = typeDef.type
  const link = variant.link || typeDef.link
  const args = variant.args || typeDef.args

  let displayText
  if (type === 'function') {
    displayText = key + '(' + args.map(a => a.displayName).join(', ') + ')'
  }

  return {
    text: key,
    displayText,
    replacementPrefix: prefix,
    type: type === 'function' ? 'function' : 'value',
    rightLabel: type === 'unknown' ? '' : type,
    description,
    descriptionMoreURL: link
  }
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
