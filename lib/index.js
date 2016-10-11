'use babel'

import LuaProvider from './provider'

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  config: {
    excludeLowerPriority: {
      type: 'boolean',
      default: false,
      title: 'Override lower priority providers',
      description: 'Disable Atom\'s default keyword-based autocompletion provider and other lower priority providers'
    },
    inclusionPriority: {
      type: 'integer',
      default: 1,
      minimum: 0,
      title: 'Provider inclusion priority',
      description: 'Priority relative to other autocomplete providers'
    }
  },

  getProvider () {
    return new LuaProvider()
  }
}
