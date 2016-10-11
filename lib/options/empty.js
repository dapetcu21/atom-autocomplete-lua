'use babel'

const empty = {
  global: { type: 'table', fields: {} }
}

export default class EmptyOptionProvider {
  priority = 0;

  getOptions () {
    return { options: empty }
  }
}
