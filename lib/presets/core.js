'use babel'

export default {
  type: 'table',
  fields: {
    math: {
      type: 'table',
      fields: {
        maxinteger: { type: 'number' },
        max: {
          type: 'function',
          return_value: { type: 'number' }
        }
      }
    }
  }
}
