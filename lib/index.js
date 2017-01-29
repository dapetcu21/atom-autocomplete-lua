'use babel'

import { Disposable } from 'atom'

import LuaProvider from './provider'
import EmptyOptionProvider from './options/empty'
import StdLibProvider from './options/stdlib'
import LuaCompleteRcProvider from './options/luacompleterc'
import { addOptionProviders, removeOptionProviders } from './options'
import { CompletionStrategy } from './extraction'

window.__LOG__ = window.localStorage.getItem('__LOG__')

export default {
  config: {
    luaVersion: {
      order: 0,
      type: 'string',
      default: '5.2',
      enum: ['5.1', '5.2', '5.3'],
      title: 'Default Lua version',
      description: 'Can be overriden in .luacompleterc or by plugins'
    },
    useSnippets: {
      order: 1,
      type: 'boolean',
      default: true,
      title: 'Suggest snippets',
      description: 'Complete functions with snippets of their arguments'
    },
    suggestUsedMembers: {
      order: 2,
      type: 'integer',
      default: CompletionStrategy.TYPE_ASSUMPTION,
      title: 'Table member suggestion strategy',
      description: 'Suggestion strategy for unknown identifiers. Choose to suggest nothing, suggest only already accessed members, or suggest members from an already existing type with similar members.',
      enum: [
        {
          value: CompletionStrategy.VANILLA,
          description: 'No inferred members'
        }, {
          value: CompletionStrategy.ALREADY_USED_ONLY,
          description: 'Infers already accessed members only'
        }, {
          value: CompletionStrategy.TYPE_ASSUMPTION,
          description: 'Infers from already defined types'
        }
      ]
    },
    minCharsPrefix: {
      order: 3,
      type: 'integer',
      default: 2,
      minimum: 1,
      title: 'Min chars to start completion',
      description: 'The minimum number of typed characters required to start a completion'
    },
    excludeLowerPriority: {
      order: 4,
      type: 'boolean',
      default: false,
      title: 'Override lower priority providers',
      description: 'Disable Atom\'s default keyword-based autocompletion provider and other lower priority providers'
    },
    inclusionPriority: {
      order: 5,
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
      new StdLibProvider(),
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
