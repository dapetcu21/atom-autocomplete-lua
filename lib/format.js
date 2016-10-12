'use babel'

const formatResult = (prefix) => ({ key, typeDef }) => {
  const { type, description, link } = typeDef
  return {
    text: key,
    replacementPrefix: prefix,
    type: type === 'function' ? 'function' : 'value',
    rightLabel: type === 'unknown' ? '' : type,
    description,
    descriptionMoreURL: link
  }
}

export default formatResult
