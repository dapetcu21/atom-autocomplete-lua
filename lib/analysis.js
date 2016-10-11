'use babel'

import core from './presets/core'
import cloneDeep from 'lodash.clonedeep'
import { tableNew, tableSet, tableResolve, tableSearch } from './typedefs'

const presets = [ core ]

const nodeGetType = (node) => {
  if (node.type === 'Identifier') {
    return tableResolve(node.scope, node.name)
  }
  // TODO: Solve more kinds of expressions
}

export default {
  init (options) {
    this.currentScope = tableNew()
    const metatable = tableNew()
    metatable.fields.__index = cloneDeep(presets[0])
    this.currentScope.metatable = metatable
    tableSet(this.currentScope, '_G', this.currentScope)

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
    const parentScope = this.currentScope.metatable.__index
    this.currentScope = parentScope
  },

  end () {
  },

  solveQuery () {
    let queryType = this.queryType
    if (this.queryBase) {
      queryType = nodeGetType(this.queryBase)
    }

    const results = tableSearch(queryType, this.query.prefix)
    results.sort((a, b) => a.key.length - b.key.length)
    return results.map(results => ({ text: results.key }))
  }
}
