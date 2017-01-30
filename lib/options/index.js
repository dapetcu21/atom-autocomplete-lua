'use babel'

import includes from 'lodash.includes'
import {
  tableNew, booleanNew, functionNew, numberNew, unknownNew, nilNew,
  tableSet, tableSetMetatable, tableGet, tableGetMetatable,
  tableRevertAndUnfreeze, mergeTypeKnowledge, typeDefDeepClone
} from '../typedefs'

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
      if (typeDef.argTypes) {
        typeDef.argTypes.forEach((argType, index) => {
          crawlAndRevive(argType, namedTypes, v => { typeDef.argTypes[index] = v })
        })
      }
      if (typeDef.returnTypes) {
        typeDef.returnTypes.forEach((retType, index) => {
          crawlAndRevive(retType, namedTypes, v => { typeDef.returnTypes[index] = v })
        })
      }
      break
  }
}

function reviveOptions (options) {
  if (!options || !options.namedTypes) { return options }
  let namedTypes = options.namedTypes
  crawlAndRevive(options.global, namedTypes, v => { options.global = v })
  for (let key in namedTypes) {
    crawlAndRevive(namedTypes[key], namedTypes, v => { namedTypes[key] = v })
  }
  return options
}

function mergeOptions (previousOptions, newOptions) {
  const newGlobal = newOptions.global
  const previousGlobal = previousOptions.global

  let mergedOptions = Object.assign({}, previousOptions, newOptions)
  Object.assign(mergedOptions.namedTypes, previousOptions.namedTypes, newOptions.namedTypes)
  tableRevertAndUnfreeze(newGlobal)

  const mergedGlobal = mergeTypeKnowledge(
    typeDefDeepClone(newGlobal),
    typeDefDeepClone(previousGlobal)
  )
  if (mergedGlobal) {
    mergedOptions.global = mergedGlobal
  }
  return mergedOptions
}

function mergeOptionsCached (previousOptions, newOptions, cache, merger) {
  if (cache.newOptions === newOptions && cache.previousOptions === previousOptions) {
    return cache
  }
  const options = utils.mergeOptions(previousOptions, newOptions)
  if (merger) {
    merger(options, previousOptions, newOptions)
  }
  return { options, newOptions, previousOptions }
}

const utils = { reviveOptions, mergeOptions, mergeOptionsCached, tableNew, booleanNew, functionNew, numberNew, unknownNew, nilNew, tableSet, tableSetMetatable, tableGet, tableGetMetatable, mergeTypeKnowledge }

let providers = []

export function addOptionProviders (v) {
  v.forEach(provider => {
    providers.push({
      provider,
      cache: {}
    })
  })
}

export function removeOptionProviders (v) {
  providers = providers.filter(p => !includes(v, p.provider))
  v.forEach(provider => provider.dispose && provider.dispose())
}

export default function getOptions (request) {
  providers.sort((a, b) => b.provider.priority - a.provider.priority)
  // Accesses provider[index] and sets up a call to the next provider
  // The function returned, when called, calls the next entry in chainProviders
  const chainProviders = (index) => {
    const providerSpec = providers[index]
    if (!providerSpec) { // terminal condition
      return () => ({})
    } else {
      // Returns the options as returned by the first called provider.
      // Note that it constructs the complete cache entry by giving the previous
      // (the one from the lower priority provider) to the current provider
      // and recovering it as its return value.
      return async function () {
        const nextGetOptions = chainProviders(index + 1)
        const cacheKey = request.filePath
        const cacheEntry = providerSpec.cache[cacheKey] || {}
        const newCacheEntry = (
          await providerSpec.provider.getOptions(request, nextGetOptions, utils, cacheEntry)
        )
        providerSpec.cache[cacheKey] = newCacheEntry
        return newCacheEntry.options
      }
    }
  }
  return Promise.resolve(chainProviders(0)())
}
