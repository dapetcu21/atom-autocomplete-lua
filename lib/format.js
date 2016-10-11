'use babel'

const formatResult = (prefix) => ({ key, typeDef }) => {
  return {
    text: key,
    replacementPrefix: prefix,
    type: typeDef.type === 'function' ? 'function' : 'value',
    rightLabel: typeDef.type
  }
}

export default formatResult
