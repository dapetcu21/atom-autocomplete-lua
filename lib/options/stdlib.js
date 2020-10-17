'use babel'

import config from '../config'

function getOptions (luaVersion) {
  switch (luaVersion) {
    case '5.1':
      return require('../stdlib/5_1.json')
    case '5.2':
      return require('../stdlib/5_2.json')
    case '5.3':
      return require('../stdlib/5_3.json')
    case '5.4':
      return require('../stdlib/5_4.json')
    case 'luajit-2.0':
      return require('../stdlib/luajit-2_0.json')
  }
}

const optionsCache = {}
function getCachedOptions (luaVersion, reviveOptions) {
  const cachedValue = optionsCache[luaVersion]
  if (cachedValue) { return cachedValue }
  const options = reviveOptions(getOptions(luaVersion))
  if (!options) { return }
  optionsCache[luaVersion] = options
  return options
}

export default class StdLibProvider {
  priority = 100;

  getOptions = async function (request, getPreviousOptions, utils, cache) {
    const previousOptions = await getPreviousOptions()
    const luaVersion = previousOptions.luaVersion || config.luaVersion || '5.2'
    const stdOptions = getCachedOptions(luaVersion, utils.reviveOptions)
    if (!stdOptions) { return { options: previousOptions } }
    return utils.mergeOptionsCached(previousOptions, stdOptions, cache)
  }
}
