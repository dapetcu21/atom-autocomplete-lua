'use babel'

/*
 * Functions for resolving the types of AST nodes
 */

import {
  tableNew, functionNew, stringNew, numberNew, booleanNew, nilNew, unknownNew,
  tableResolve, tableSet
} from './typedefs'

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
  if (type === 'FunctionDeclaration') {
    const func = functionNew()

    const args = []
    if (node.identifier.type === 'MemberExpression' && node.identifier.indexer === ':') {
      args.push({ name: 'self' })
    }
    node.parameters.forEach(param => {
      args.push({
        name: param.type === 'Identifier' ? param.name : `arg${args.length + 1}`
      })
    })
    func.args = args

    return func
  }
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
