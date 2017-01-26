'use babel'

/*
 * The type analysis sweep
 */

import {
  tableNew, unknownNew,
  tableSet, tableGet, tableSetMetatable, tableGetMetatable,
  tableSearch,
  tableInvalidateDiffs, tableFreeze, tableDiffShallow, tableDiff, tableApplyDiff
} from './typedefs'
import { nodeGetType, nodeGetReturnTypes } from './resolve'
import extractTypes from './extraction'
import formatResults from './format'
import luaparse from 'luaparse'
import ModuleCache from './module-cache'
import config from './config'

//A class constructed around the luaparse package. The _on methods are
//used as callbacks for the luaparse package.
// https://github.com/oxyc/luaparse for more info
export default class Analysis {
  constructor (options, query) {
    this.query = query
    this.queryBase = null

    //Holds all the defined identifiers in the current lua file. Its metatable
    //is the global named type list.
    this.queryType = null

    this.chunk = null
    if (query && query.dot !== ':' && query.dot !== '.') {
      query.dot = null //Initialize query.dot if it was not already created
    }

    const globalScope = options.global
    tableInvalidateDiffs()
    if (tableGet(globalScope, '_G') !== globalScope) {
      tableSet(globalScope, '_G', globalScope)
    }
    tableFreeze(globalScope)

    this.currentScope = globalScope
    this.globalScope = globalScope
    this.options = options
    options.moduleCache = options.moduleCache || new ModuleCache(options)

    this.iteration = []
    this.requires = new Set()
    this.requireCache = {}

    luaparse.parse({
      wait: true,
      comments: false,
      scope: true,
      ranges: true,
      onCreateNode: this._onCreateNode,
      onCreateScope: this._onCreateScope,
      onDestroyScope: this._onDestroyScope,
      onScopeIdentifierName: this._onScopeIdentifierName,
      luaVersion: options.luaVersion || config.luaVersion || '5.2'
    })
  }

  _onCreateNode = (node) => {
    this.iteration.push(node)
    node.scope = this.currentScope //Reflection?
    node.globalScope = this.globalScope
    node.options = this.options

    if (node.type === 'Chunk') {
      this.chunk = node
    }

    if (
      (node.type === 'CallExpression' || node.type === 'StringCallExpression') &&
      node.base.type === 'Identifier' &&
      node.base.name === 'require'
    ) {
      const argument = node.argument || (node.arguments && node.arguments[0])
      if (argument && argument.type === 'StringLiteral') {
        this.requires.add(argument.value)
        node.requireValue = argument.value
        node.requireCache = this.requireCache
      }
    }

    if (
      this.query &&
      node.type === 'MemberExpression' &&
      node.identifier.name.indexOf('__prefix_placeholder__') !== -1
    ) {
      if (this.query.dot) {
        this.queryBase = node.base
      } else {
        this.queryType = node.scope
      }
      node.isPlaceholder = true
      node.identifier.isPlaceholder = true
      if (
        node.base &&
        node.base.type === 'Identifier' &&
        node.base.name.indexOf('__prefix_placeholder__') !== -1
      ) {
        node.base.isPlaceholder = true
      }
    }

    __LOG__ && console.log('onCreateNode', node)
  };

  _onCreateScope = () => {
    __LOG__ && console.log('onCreateScope')
    const oldScope = this.currentScope
    const metatable = tableNew()
    tableSet(metatable, '__index', oldScope)
    this.currentScope = tableNew()
    tableSetMetatable(this.currentScope, metatable)
  };

  _onDestroyScope = () => {
    __LOG__ && console.log('onDestroyScope')
    const parentScope = tableGet(tableGetMetatable(this.currentScope), '__index')
    this.currentScope = parentScope
  };

  _onScopeIdentifierName = (newName, data) => {
    __LOG__ && console.log('onScopeIdentifierName', newName, data)
    if (newName.indexOf('__prefix_placeholder__') !== -1) { return }

    if (data && data.parameterOf) {
      const func = nodeGetType(data.parameterOf)
      if (func && func.type === 'function' && func.argTypes) {
        const argType = func.argTypes[data.parameterIndex]
        if (argType) {
          tableSet(this.currentScope, newName, argType)
          return
        }
      }
    }

    tableSet(this.currentScope, newName, unknownNew())
  };

  write (string) {
    luaparse.write(string)
  }

  end (string) {
    luaparse.end(string)
  }

  _evaluate = async (syncAction) => {
    if (this.requires.size) {
      const mainDiff = tableDiffShallow(this.globalScope)
      await Promise.all([...this.requires].map(async moduleName => {
        const module = await this.options.moduleCache.get(moduleName, this._analyseModule)
        this.requireCache[moduleName] = module
      }))
      tableInvalidateDiffs()
      tableApplyDiff(mainDiff)
    }
    this.iteration.forEach(extractTypes)

    // Due to the stateful nature of tableDiffCount, we need to sample data
    // quickly before we return to the run loop and let another Analysis take
    // place, so .then()-ing promises is out of the question
    return syncAction()
  }

  _analyseModule = async (moduleData) => {
    const analysis = new Analysis(this.options)
    try {
      analysis.end(moduleData)
    } catch (ex) {
      __LOG__ && console.error(ex)
    }
    return await analysis.returnModule()
  };

  returnModule = async () => {
    return await this._evaluate(() => {
      const returnTypes = this.chunk ? nodeGetReturnTypes(this.chunk.body) : []
      const globalDiff = tableDiff(this.globalScope)
      return { returnTypes, globalDiff }
    })
  }

  solveQuery = async () => {
    return await this._evaluate(() => {
      let queryType = this.queryType
      if (this.queryBase) {
        queryType = nodeGetType(this.queryBase)
      }

      if (!queryType) {
        console.log('query has no type', this.query.prefix)
        return []
      //v v if we are indexing
      } else if (this.queryBase) {
        let queryBaseType = this.queryBase.scope.fields[this.queryBase.name]
        console.log(queryBaseType, ' ; ', this.queryBase)
      }

      let results = tableSearch(queryType, this.query.prefix)
      const trimSelf = this.query.dot === ':'
      if (trimSelf) {
        results = results.filter(x => x.typeDef && x.typeDef.type === 'function')
      }
      results.sort((a, b) => a.key.localeCompare(b.key))
      return formatResults(results, trimSelf)
    })
  }

  //Finds an autocompletion suggestion in the whole cache, ignoring type
  findInCache = function (prefix) {

  }
}
