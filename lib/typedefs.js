'use babel'

export const tableNew = () => ({
  type: 'table',
  fields: {}
})

export const unparsedNew = () => ({ type: 'unparsed' })
export const numberNew = () => ({ type: 'number' })
export const stringNew = () => ({ type: 'string' })
export const booleanNew = () => ({ type: 'boolean' })
export const nilNew = () => ({ type: 'nil' })
export const functionNew = () => ({ type: 'function' })

export const tableSet = (table, key, type) => {
  table.fields[key] = type
}

export const tableResolve = (table, field) => {
  if (!table || table.type !== 'table') { return }

  const value = table.fields[field]
  if (value) { return value }

  if (table.metatable && table.metatable.type === 'table') {
    return tableResolve(table.metatable.fields.__index, field)
  }
}

export const tableSearch = (table, prefix) => {
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

const discoveryPriority = {
  'unparsed': 0,
  'none': 1,
  'nil': 2,
  'boolean': 2,
  'number': 2,
  'string': 2,
  'userdata': 2,
  'thread': 3,
  'function': 4,
  'table': 5
}

export const tableDiscovered = (table, key, discovery) => {
  if (!table || table.type !== 'table') { return }

  const oldValue = table.fields[key]
  const oldType = oldValue ? oldValue.type : 'none'
  const newType = discovery ? discovery.type : 'none'
  if (discoveryPriority[newType] >= discoveryPriority[oldType]) {
    tableSet(table, key, discovery)
  }
}

export function identifierScope (node) {
  if (node.isLocal === true) {
    return node.scope
  }
  if (node.isLocal === false) {
    return node.globalScope
  }
  // if isLocal is undefined, it's not a symbol, but maybe an index
}

export const nodeGetType = (node) => {
  if (!node) { return }
  const type = node.type

  if (type === 'Identifier') {
    return tableResolve(identifierScope(node), node.name)
  }
  if (type === 'IndexExpression') {
    if (node.index.type !== 'StringLiteral') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return tableResolve(baseType, node.index.value)
  }
  if (type === 'MemberExpression') {
    if (node.identifier.type !== 'Identifier') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return tableResolve(baseType, node.identifier.name)
  }
  if (type === 'NumericLiteral') { return numberNew() }
  if (type === 'StringLiteral') { return stringNew() }
  if (type === 'BooleanLiteral') { return booleanNew() }
  if (type === 'NilLiteral') { return nilNew() }
  if (type === 'NilLiteral') { return nilNew() }
  if (type === 'FunctionDeclaration') { return functionNew() }
  if (type === 'TableConstructorExpression') {
    const table = tableNew()
    return table
  }
}

export function getLValue (node) {
  if (!node) { return }
  const type = node.type

  if (type === 'IndexExpression') {
    if (node.index.type !== 'StringLiteral') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return { table: baseType, key: node.index.value }
  }
  if (type === 'MemberExpression') {
    if (node.identifier.type !== 'Identifier') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    return { table: baseType, key: node.identifier.name }
  }
  if (type === 'Identifier') {
    const table = identifierScope(node)
    if (!table) { return }
    return { table, key: node.name }
  }
}

