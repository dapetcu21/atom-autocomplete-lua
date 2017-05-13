'use babel'

let LuaProvider

function loadAutocompleteProvider () {
  if (!LuaProvider) {
    LuaProvider = require('./provider')
  }
}

let EmptyOptionProvider, StdLibProvider, LuaCompleteRcProvider

function loadLuaProviders () {
  if (!EmptyOptionProvider) {
    EmptyOptionProvider = require('./options/empty')
  }
  if (!StdLibProvider) {
    StdLibProvider = require('./options/stdlib')
  }
  if (!LuaCompleteRcProvider) {
    LuaCompleteRcProvider = require('./options/luacompleterc')
  }
}

let addOptionProviders, removeOptionProviders, Disposable

function loadLuaConsumer () {
  if (!addOptionProviders || !removeOptionProviders) {
    let options = require('./options')

    addOptionProviders = options.addOptionProviders
    removeOptionProviders = options.removeOptionProviders
  }
  if (!Disposable) {
    let atom = require('atom')

    Disposable = atom.Disposable
  }
}

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  activate () {
    this.idleCallbacks = new Set()

    let callbackID

    const installAutocompleteLuaDeps = () => {
      loadAutocompleteProvider()
      loadLuaProviders()
      loadLuaConsumer()
    }

    callbackID = window.requestIdleCallback(installAutocompleteLuaDeps)

    this.idleCallbacks.add(callbackID)
  },

  deactivate () {
    this.idleCallbacks.forEach(id =>
       window.cancelIdleCallback(id)
    )

    this.idleCallbacks.clear()
  },

  getProvider () {
    loadAutocompleteProvider()

    return new LuaProvider()
  },

  getOptionProviders () {
    loadLuaProviders()

    return [
      new EmptyOptionProvider(),
      new StdLibProvider(),
      new LuaCompleteRcProvider()
    ]
  },

  onOptionProviders (providers) {
    loadLuaConsumer()

    if (!Array.isArray(providers)) {
      providers = [providers]
    }

    addOptionProviders(providers)
    return new Disposable(() => removeOptionProviders(providers))
  }
}
