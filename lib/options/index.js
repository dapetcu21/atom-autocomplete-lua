'use babel'

import includes from 'lodash.includes'

let providers = []

export function addOptionProviders (v) {
  v.forEach(provider => {
    providers.push({
      provider
    })
  })
}

export function removeOptionProviders (v) {
  providers = providers.filter(p => !includes(v, p.provider))
}

export default function getOptions (request) {
  providers.sort((a, b) => b.provider.priority - a.provider.priority)
  const chainProviders = (index) => {
    const providerSpec = providers[index]
    if (!providerSpec) { return () => ({}) }
    return () => providerSpec.provider.getOptions(request, chainProviders(index + 1))
  }
  return Promise.resolve(chainProviders(0)())
}
