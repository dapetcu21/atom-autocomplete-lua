'use babel'

import LuaProvider from './provider'

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  config: {

  },

  getProvider () {
    return new LuaProvider()
  }
}
