'use babel'

import includes from 'lodash.includes'

function crawlAndRevive (typeDef, namedTypes, setter) {
  if (!typeDef) { return }
  switch (typeDef.type) {
    case 'ref':
      setter(namedTypes[typeDef.name])
      break
    case 'table':
      crawlAndRevive(typeDef.metatable, namedTypes, v => { typeDef.metatable = v })
      for (let key in typeDef.fields) {
        crawlAndRevive(typeDef.fields[key], namedTypes, v => { typeDef.fields[key] = v })
      }
      break
    case 'function':
      if (typeDef.returnTypes) {
        typeDef.returnTypes.forEach((retType, index) => {
          crawlAndRevive(retType, namedTypes, v => { typeDef.returnTypes[index] = v })
        })
      }
      break
  }
}

const utils = {
  reviveOptions (options) {
    if (!options.namedTypes) { return options }
    crawlAndRevive(options.global, options.namedTypes, v => { options.global = v })
    delete options.namedTypes
    return options
  }
}

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
  v.forEach(provider => provider.dispose && provider.dispose())
}

export default function getOptions (request) {
  providers.sort((a, b) => b.provider.priority - a.provider.priority)
  const chainProviders = (index) => {
    const providerSpec = providers[index]
    if (!providerSpec) { return () => ({}) }
    return async function () {
      const nextGetOptions = chainProviders(index + 1)
      return (await providerSpec.provider.getOptions(request, nextGetOptions, utils)).options
    }
  }
  return Promise.resolve(chainProviders(0)())
}
