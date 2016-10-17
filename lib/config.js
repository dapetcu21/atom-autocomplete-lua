'use babel'

/*
 * Extracted-out config keys
 */

const config = {}
const disposeables = []

const keys = ['suggestUsedMembers', 'useSnippets', 'luaVersion']

export function configObserve () {
  keys.forEach(key => {
    disposeables.push(window.atom.config.observe('autocomplete-lua.' + key, (value) => {
      config[key] = value
    }))
  })
}

export function configDispose () {
  disposeables.forEach(d => d.dispose())
  disposeables.length = 0
}

export default config
