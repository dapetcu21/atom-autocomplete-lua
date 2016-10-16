'use babel'

/*
 * Functions for resolving the types of AST nodes
 */

import {
  tableNew, functionNew, stringNew, numberNew, booleanNew, nilNew, unknownNew,
  tableResolve, tableSet
} from './typedefs'

const typePriority = {
  'nil': 0,
  'unknown': 1,
  'boolean': 2,
  'number': 2,
  'string': 2,
  'userdata': 2,
  'thread': 3,
  'function': 4,
  'table': 5
}

export const mergeTypeKnowledge = (oldType, newType) => {
  const oldPriority = typePriority[oldType ? oldType.type : 'nil']
  const newPriority = typePriority[newType ? newType.type : 'nil']
  return newPriority > oldPriority ? newType : oldType
}

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

export function nodeGetType (node) {
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
  if (type === 'CallExpression') {
    const funcType = nodeGetType(node.base)
    if (!funcType) { return }
    const returnTypes = funcType.returnTypes
    if (!returnTypes) { return }
    return returnTypes[0]
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
