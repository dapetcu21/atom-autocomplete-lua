'use babel'

import { tableNew, contextNew } from '../typedefs'

const empty = {
  context: contextNew(),
  global: tableNew()
}

export default class EmptyOptionProvider {
  priority = 0;

  getOptions () {
    return { options: empty }
  }
}
