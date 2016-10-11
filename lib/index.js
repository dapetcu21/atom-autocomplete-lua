'use babel'

import LuaProvider from './provider'
import EmptyOptionProvider from './options/empty'
import { addOptionProviders, removeOptionProviders } from './options'
import { Disposable } from 'atom'

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  config: {
    suggestUsedMembers: {
      type: 'boolean',
      default: true,
      title: 'Suggest members I have used',
      description: 'Suggest table members I have used around my code as opposed to just those I have explicitly set'
    },
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
  },

  getOptionProviders () {
    return new EmptyOptionProvider()
  },

  onOptionProviders (providers) {
    if (!Array.isArray(providers)) {
      providers = [providers]
    }

    addOptionProviders(providers)
    return new Disposable(() => removeOptionProviders(providers))
  }
}
