'use babel'

import core from './presets/core'
import cloneDeep from 'lodash.clonedeep'

const presets = [ core ]

const tableNew = () => ({
  type: 'table',
  fields: {}
})

const tableSet = (table, key, type) => {
  table.fields[key] = type
}

const tableResolve = (table, field) => {
  if (!table || table.type !== 'table') { return }

  const value = table.fields[field]
  if (value) { return value }

  if (table.metatable && table.metatable.type === 'table') {
    return tableResolve(table.metatable.fields.__index, field)
  }
}

const tableSearch = (table, prefix) => {
  const results = []
  const search = (table) => {
    if (!table || table.type !== 'table') {
      return
    }
    for (let key in table.fields) {
      if (key.indexOf(prefix) !== 0) { continue }
      results.push({ key, type: table.fields[key] })
    }
    if (table.metatable && table.metatable.type === 'table') {
      search(table.metatable.fields.__index)
    }
  }
  search(table)
  return results
}

const nodeGetType = (node) => {
  if (node.type === 'Identifier') {
    return tableResolve(node.scope, node.name)
  }
  // TODO: Solve more kinds of expressions
}

export default {
  reset () {
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
    node.scope = this.currentScope

    this.iteration.push(node)

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
    if (this.queryBase) {
      const results = tableSearch(nodeGetType(this.queryBase), this.query.prefix)
      results.sort((a, b) => a.key.length - b.key.length)
      return results.map(results => ({ text: results.key }))
    }
    return []
  }
}
