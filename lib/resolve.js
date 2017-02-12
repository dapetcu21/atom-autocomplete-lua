'use babel'

/*
 * Functions for resolving the types of AST nodes
 */

import {
  tableNew, functionNew, stringNew, numberNew, booleanNew, nilNew, unknownNew,
  tableResolve, tableSet, mergeTypeKnowledge
} from './typedefs'

export function nodeGetReturnTypes (nodes, returnTypes = []) {
  nodes.forEach(node => {
    switch (node.type) {
      case 'ReturnStatement':
        node.arguments.forEach((arg, index) => {
          returnTypes[index] = mergeTypeKnowledge(returnTypes[index], nodeGetType(arg))
        })
        break
      case 'IfStatement':
        node.clauses.forEach(clause => {
          nodeGetReturnTypes(clause.body, returnTypes)
        })
        break
      case 'ForNumericStatement':
      case 'ForGenericStatement':
      case 'WhileStatement':
      case 'RepeatStatement':
        nodeGetReturnTypes(node.body, returnTypes)
        break
    }
  })
  return returnTypes
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

export function nodeGetType (node, multipleTypes) {
  if (!node || node.isPlaceholder) { return }
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
    if (
      node.identifier &&
      node.identifier.type === 'MemberExpression' &&
      node.identifier.indexer === ':'
    ) {
      args.push({ name: 'self' })
    }
    node.parameters.forEach(param => {
      args.push({
        name: param.type === 'Identifier' ? param.name : `arg${args.length + 1}`
      })
    })
    func.args = args
    func.returnTypes = nodeGetReturnTypes(node.body)
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
  if (node.requireCache) {
    const entry = node.requireCache[node.requireValue]
    if (!entry) { return }
    const { returnTypes } = entry
    return multipleTypes ? returnTypes : returnTypes[0]
  }
  if (
    type === 'CallExpression' ||
    type === 'StringCallExpression'
  ) {
    const funcType = nodeGetType(node.base)
    if (!funcType) { return }
    const returnTypes = funcType.returnTypes
    if (!returnTypes) { return }
    return multipleTypes ? returnTypes : returnTypes[0]
  }
}

// Returns dictionary {table, key} where table is the the resolved node value
export function getLValue (node) {
  if (!node) { return }
  const type = node.type

  if (type === 'IndexExpression') {
    if (node.index.type !== 'StringLiteral') { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    const key = node.index.value
    const table = tableResolve(baseType, key, true) || baseType
    return { table, key }
  }
  if (type === 'MemberExpression') {
    if (node.identifier.type !== 'Identifier') { return }
    if (node.identifier.isPlaceholder) { return }
    const baseType = nodeGetType(node.base)
    if (!baseType) { return }
    const key = node.identifier.name
    const table = tableResolve(baseType, key, true) || baseType
    return { table, key }
  }
  if (type === 'Identifier') {
    if (node.isPlaceholder) { return }
    const scope = identifierScope(node)
    const table = tableResolve(scope, node.name, true) || scope
    return { table, key: node.name }
  }
}
