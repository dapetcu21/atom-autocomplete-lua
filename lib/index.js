'use babel'

import LuaProvider from './provider'
import EmptyOptionProvider from './options/empty'
import LuaCompleteRcProvider from './options/luacompleterc'
import { addOptionProviders, removeOptionProviders } from './options'
import { Disposable } from 'atom'

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  config: {
    useSnippets: {
      order: 0,
      type: 'boolean',
      default: true,
      title: 'Suggest snippets',
      description: 'Complete functions with snippets of their arguments'
    },
    suggestUsedMembers: {
      order: 1,
      type: 'boolean',
      default: true,
      title: 'Suggest used table members',
      description: 'Suggest table members that you\'ve used in your code as opposed to just those you have explicitly set or defined'
    },
    excludeLowerPriority: {
      order: 2,
      type: 'boolean',
      default: false,
      title: 'Override lower priority providers',
      description: 'Disable Atom\'s default keyword-based autocompletion provider and other lower priority providers'
    },
    inclusionPriority: {
      order: 3,
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
    return [
      new EmptyOptionProvider(),
      new LuaCompleteRcProvider()
    ]
  },

  onOptionProviders (providers) {
    if (!Array.isArray(providers)) {
      providers = [providers]
    }

    addOptionProviders(providers)
    return new Disposable(() => removeOptionProviders(providers))
  }
}
