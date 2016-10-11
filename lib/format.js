'use babel'

const formatResult = (prefix) => ({ key, typeDef }) => {
  const { type } = typeDef
  return {
    text: key,
    replacementPrefix: prefix,
    type: type === 'function' ? 'function' : 'value',
    rightLabel: type === 'unknown' ? '' : type
  }
}

export default formatResult
