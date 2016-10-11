'use babel'

export const tableNew = () => ({
  type: 'table',
  fields: {}
})

export const unknownNew = () => ({ type: 'unknown' })
export const numberNew = () => ({ type: 'number' })
export const stringNew = () => ({ type: 'string' })
export const booleanNew = () => ({ type: 'boolean' })
export const nilNew = () => ({ type: 'nil' })
export const functionNew = () => ({ type: 'function' })

export const tableSet = (table, key, type) => {
  table.fields[key] = type
}

export const tableResolve = (table, field, returnParent) => {
  if (!table || table.type !== 'table') { return }

  const value = table.fields[field]
  if (value) { return returnParent ? table : value }

  if (table.metatable && table.metatable.type === 'table') {
    return tableResolve(table.metatable.fields.__index, field, returnParent)
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
      results.push({ key, typeDef: table.fields[key] })
    }
    if (table.metatable && table.metatable.type === 'table') {
      search(table.metatable.fields.__index)
    }
  }
  search(table)
  return results
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
  if (type === 'FunctionDeclaration') { return functionNew() }
  if (type === 'TableConstructorExpression') {
    const table = tableNew()
    node.fields.forEach(field => {
      if (field.type === 'TableKeyString' || field.type === 'TableKey') {
        let key = null
        if (field.key.type === 'Identifier') { key = field.key.name }
        if (field.key.type === 'StringLiteral') { key = field.key.value }
        if (!key) { return }
        tableSet(table, key, nodeGetType(field.value) || unknownNew())
      }
    })
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
    const scope = identifierScope(node)
    const table = tableResolve(scope, node.name, true) || scope
    return { table, key: node.name }
  }
}

