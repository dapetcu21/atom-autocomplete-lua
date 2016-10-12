'use babel'

import { tableNew, tableSet, tableResolve, tableSearch, unknownNew, nodeGetType } from './typedefs'
import extractTypes from './extraction'
import cloneDeep from 'lodash.clonedeep'
import formatResults from './format'

export default {
  init (options) {
    const globalScope = tableNew()
    const metatable = tableNew()
    tableSet(metatable, '__index', cloneDeep(options.global))
    globalScope.metatable = metatable
    tableSet(globalScope, '_G', globalScope)

    this.currentScope = globalScope
    this.globalScope = globalScope

    this.iteration = []
    this.queryBase = null
  },

  setQuery (query) {
    __LOG__ && console.log('setQuery', query)
    this.query = query
    if (query.dot !== ':' && query.dot !== '.') {
      query.dot = null
    }
  },

  onCreateNode (node) {
    this.iteration.push(node)
    node.scope = this.currentScope
    node.globalScope = this.globalScope

    if (
      this.query && this.query.dot &&
      node.type === 'MemberExpression' &&
      node.identifier.name.indexOf('__prefix_placeholder__') !== -1
    ) {
      this.queryBase = node.base
      node.isPlaceholder = true
    }

    __LOG__ && console.log('onCreateNode', node)
  },

  onCreateScope () {
    __LOG__ && console.log('onCreateScope')
    const oldScope = this.currentScope
    const metatable = tableNew()
    tableSet(metatable, '__index', oldScope)
    this.currentScope = tableNew()
    this.currentScope.metatable = metatable
  },

  onDestroyScope () {
    __LOG__ && console.log('onDestroyScope')
    const parentScope = tableResolve(this.currentScope.metatable, '__index')
    this.currentScope = parentScope
  },

  onScopeIdentifierName (newName) {
    __LOG__ && console.log('onScopeIdentifierName', newName)
    tableSet(this.currentScope, newName, unknownNew())
  },

  end () {
    this.iteration.forEach(extractTypes)
  },

  solveQuery () {
    let queryType = this.queryType
    if (this.queryBase) {
      queryType = nodeGetType(this.queryBase)
    }

    if (!queryType) { return [] }

    let results = tableSearch(queryType, this.query.prefix)
    if (this.query.dot === ':') {
      results = results.filter(x => x.typeDef && x.typeDef.type === 'function')
    }
    results.sort((a, b) => a.key.localeCompare(b.key))
    return formatResults(results, this.query.prefix)
  }
}
