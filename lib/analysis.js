'use babel'

import { tableNew, tableSet, tableResolve, tableSearch } from './typedefs'

const nodeGetType = (node) => {
  if (node.type === 'Identifier') {
    if (node.isLocal === true) {
      return tableResolve(node.scope, node.name)
    }
    if (node.isLocal === false) {
      return tableResolve(node.globalScope, node.name)
    }
    // if isLocal is undefined, it's not a symbol, but maybe an index
    return
  }
  if (node.type === 'IndexExpression') {
    if (node.index.type !== 'StringLiteral') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return tableResolve(baseType, node.index.value)
  }
  if (node.type === 'MemberExpression') {
    if (node.identifier.type !== 'Identifier') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return tableResolve(baseType, node.identifier.name)
  }
  // TODO: Solve more kinds of expressions
}

export default {
  init (options) {
    const globalScope = tableNew()
    const metatable = tableNew()
    tableSet(metatable, '__index', options.global)
    globalScope.metatable = metatable
    tableSet(globalScope, '_G', globalScope)

    this.currentScope = globalScope
    this.globalScope = globalScope

    this.iteration = []
    this.queryBase = null
  },

  setQuery (query) {
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
    }

    console.log('onCreateNode', node)
  },

  onCreateScope () {
    console.log('onCreateScope')
    const oldScope = this.currentScope
    const metatable = tableNew()
    tableSet(metatable, '__index', oldScope)
    this.currentScope = tableNew()
    this.currentScope.metatable = metatable
  },

  onDestroyScope () {
    console.log('onDestroyScope')
    const parentScope = tableResolve(this.currentScope.metatable, '__index')
    this.currentScope = parentScope
  },

  end () {
  },

  solveQuery () {
    let queryType = this.queryType
    if (this.queryBase) {
      queryType = nodeGetType(this.queryBase)
    }

    if (!queryType) { return [] }

    const results = tableSearch(queryType, this.query.prefix)
    results.sort((a, b) => a.key.length - b.key.length)
    return results.map(results => ({ text: results.key }))
  }
}
