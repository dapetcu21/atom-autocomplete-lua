'use babel'

import LuaProvider from './provider'

export default {
  config: {

  },

  getProvider () {
    return new LuaProvider()
  }
}
