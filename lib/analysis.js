'use babel'

/*
 * The type analysis sweep
 */

import {
  tableNew, unknownNew,
  tableSet, tableGet, tableSetMetatable, tableGetMetatable,
  tableSearch,
  TYPE_FUNCTION
} from './typedefs'
import { nodeGetType, nodeGetReturnTypes } from './resolve'
import extractTypes from './extraction'
import formatResults from './format'
import luaparse from 'luaparse'
import ModuleCache from './module-cache'
import config from './config'

const __LOG__ = window.__LOG__ || false

export default class Analysis {
  constructor (options, query) {
    this.query = query
    this.queryBase = null
    this.queryType = null
    this.chunk = null
    if (query && query.dot !== ':' && query.dot !== '.') {
      query.dot = null
    }

    const globalScope = options.global
    const context = options.context
    // tableInvalidateDiffs()
    if (tableGet(context, globalScope, '_G') !== globalScope) {
      tableSet(context, globalScope, '_G', globalScope)
    }
    // tableFreeze(globalScope)

    this.currentScope = globalScope
    this.globalScope = globalScope
    this.context = context
    this.options = options
    options.moduleCache = options.moduleCache || new ModuleCache(options)

    this.iteration = []
    this.requires = new Set()
    this.requireCache = {}

    const luaVersion = options.luaVersion || config.luaVersion || '5.2'
    luaparse.parse({
      wait: true,
      comments: false,
      ranges: true,
      scope: true,
      luaVersion: luaVersion === 'luajit-2.0' ? '5.1' : luaVersion,
      onCreateNode: this._onCreateNode,
      onCreateScope: this._onCreateScope,
      onDestroyScope: this._onDestroyScope,
      onScopeIdentifierName: this._onScopeIdentifierName
    })
  }

  _onCreateNode = (node) => {
    this.iteration.push(node)
    node.scope = this.currentScope
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
    const context = this.context
    const oldScope = this.currentScope
    const metatable = tableNew()
    tableSet(context, metatable, '__index', oldScope)
    this.currentScope = tableNew()
    tableSetMetatable(context, this.currentScope, metatable)
  };

  _onDestroyScope = () => {
    __LOG__ && console.log('onDestroyScope')
    const context = this.context
    const parentScope = tableGet(context, tableGetMetatable(context, this.currentScope), '__index')
    this.currentScope = parentScope
  };

  _onScopeIdentifierName = (newName, data) => {
    __LOG__ && console.log('onScopeIdentifierName', newName, data)
    if (newName.indexOf('__prefix_placeholder__') !== -1) { return }
    const context = this.context

    // if (data && data.parameterOf) {
    //   const func = nodeGetType(context, data.parameterOf)
    //   if (func && func.type === 'function' && func.argTypes) {
    //     const argType = func.argTypes[data.parameterIndex]
    //     if (argType) {
    //       tableSet(context, this.currentScope, newName, argType)
    //       return
    //     }
    //   }
    // }

    tableSet(context, this.currentScope, newName, unknownNew())
  };

  write (string) {
    luaparse.write(string)
  }

  end (string) {
    luaparse.end(string)
  }

  _evaluate = async (syncAction) => {
    if (this.requires.size) {
      // const mainDiff = tableDiffShallow(this.globalScope)
      // await Promise.all([...this.requires].map(async moduleName => {
      //   const module = await this.options.moduleCache.get(moduleName, this._analyseModule)
      //   this.requireCache[moduleName] = module
      // }))
      // tableInvalidateDiffs()
      // tableApplyDiff(mainDiff)
    }
    const context = this.context
    this.iteration.forEach(node => extractTypes(context, node))

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
      // const returnTypes = this.chunk ? nodeGetReturnTypes(context, this.chunk.body) : []
      // const globalDiff = tableDiff(this.globalScope)
      // return { returnTypes, globalDiff }
      return {}
    })
  }

  solveQuery = async () => {
    return await this._evaluate(() => {
      const context = this.context

      let queryType = this.queryType
      if (this.queryBase) {
        queryType = nodeGetType(context, this.queryBase)
      }

      if (!queryType) { return [] }

      let results = tableSearch(context, queryType, this.query.prefix)
      const trimSelf = this.query.dot === ':'
      if (trimSelf) {
        results = results.filter(x => x.typeDef && x.typeDef.type === TYPE_FUNCTION)
      }
      results.sort((a, b) => a.key.localeCompare(b.key))
      return formatResults(results, trimSelf)
    })
  }
}
