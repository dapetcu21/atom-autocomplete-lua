'use babel'

/*
 * Everything related to extracting type info and adding it to
 * the type database
 */

import config from './config'
import { getLValue, nodeGetType } from './resolve'
import {
  tableSet, tableGet,
  unknownNew, tableNew, functionNew,
  mergeTypeKnowledge, tableApplyDiff,
  KEY_METATABLE, TYPE_TABLE
} from './typedefs'

const discoveredType = (context, table, key, newType, allowOverwrite) => {
  if (!table || table.type !== TYPE_TABLE) { return }

  const oldType = tableGet(context, table, key)

  const mergedType = mergeTypeKnowledge(context, oldType, newType)
  if (mergedType !== oldType) {
    tableSet(context, table, key, mergedType)
  }
}

export default function extractTypes (context, node) {
  if (!node || node.isPlaceholder) { return }
  const type = node.type

  if (node.requireCache) {
    const entry = node.requireCache[node.requireValue]
    if (!entry) { return }
    tableApplyDiff(node.globalScope, entry.globalDiff)
    return
  }
  if (type === 'AssignmentStatement' || type === 'LocalStatement') {
    node.variables.forEach((variable, i) => {
      const lvalue = getLValue(context, variable)
      if (!lvalue) { return }

      const initializer = node.init[i]
      const initType = nodeGetType(context, initializer) || unknownNew()
      discoveredType(context, lvalue.table, lvalue.key, initType)
    })
    return
  }
  if (type === 'FunctionDeclaration') {
    const lvalue = getLValue(context, node.identifier)
    if (!lvalue) { return }

    const funcType = nodeGetType(context, node) || unknownNew()
    discoveredType(context, lvalue.table, lvalue.key, funcType)
    return
  }
  // An indexing expression comes with the assumption that the base is a table
  // Similarilly, a function call usually means that function exists
  if (config.suggestUsedMembers) {
    const isFunctionCall = type === 'CallExpression'
    const isMember = type === 'MemberExpression' || type === 'IndexExpression'
    if (isFunctionCall || isMember) {
      const lvalue = getLValue(context, node.base)
      if (lvalue) {
        const newType = isFunctionCall ? functionNew() : tableNew()
        discoveredType(context, lvalue.table, lvalue.key, newType)
      }
    }
    if (isMember) {
      const lvalue = getLValue(context, node)
      if (lvalue) {
        discoveredType(context, lvalue.table, lvalue.key, unknownNew())
      }
    }
  }
  if (type === 'CallExpression' && node.base.type === 'Identifier' && node.base.name === 'setmetatable') {
    if (node.arguments.length < 2) { return }
    const tableType = nodeGetType(context, node.arguments[0])
    if (!tableType || tableType.type !== TYPE_TABLE) { return }
    const metatableType = nodeGetType(context, node.arguments[1])
    discoveredType(context, tableType, KEY_METATABLE, metatableType)
  }
}
