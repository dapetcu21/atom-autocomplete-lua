'use babel'

/*
 * Everything related to extracting type info and adding it to
 * the type database
 */

import config from './config'
import { getLValue, nodeGetType } from './resolve'
import {
  tableSet, tableSetMetatable, tableGet, tableGetMetatable,
  unknownNew, tableNew, functionNew,
  mergeTypeKnowledge, tableApplyDiff
} from './typedefs'

const __metatable__ = Symbol()
const discoveredType = (table, key, newType, allowOverwrite) => {
  if (!table || table.type !== 'table') { return }

  const isMeta = key === __metatable__
  const oldType = isMeta ? tableGetMetatable(table) : tableGet(table, key)

  const mergedType = mergeTypeKnowledge(oldType, newType)
  if (mergedType !== oldType) {
    if (isMeta) {
      tableSetMetatable(table, mergedType)
    } else {
      tableSet(table, key, mergedType)
    }
  }
}

export default function extractTypes (node) {
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
      const lvalue = getLValue(variable)
      if (!lvalue) { return }

      const initializer = node.init[i]
      const initType = nodeGetType(initializer) || unknownNew()
      discoveredType(lvalue.table, lvalue.key, initType)
    })
    return
  }
  if (type === 'FunctionDeclaration') {
    const lvalue = getLValue(node.identifier)
    if (!lvalue) { return }

    const funcType = nodeGetType(node) || unknownNew()
    discoveredType(lvalue.table, lvalue.key, funcType)
    return
  }
  // An indexing expression comes with the assumption that the base is a table
  // Similarilly, a function call usually means that function exists
  if (config.suggestUsedMembers) {
    const isFunctionCall = type === 'CallExpression'
    const isMember = type === 'MemberExpression' || type === 'IndexExpression'
    if (isFunctionCall || isMember) {
      const lvalue = getLValue(node.base)
      if (lvalue) {
        const newType = isFunctionCall ? functionNew() : tableNew()
        discoveredType(lvalue.table, lvalue.key, newType)
      }
    }
    if (isMember) {
      const lvalue = getLValue(node)
      if (lvalue) {
        discoveredType(lvalue.table, lvalue.key, unknownNew())
      }
    }
  }
  if (type === 'CallExpression' && node.base.type === 'Identifier' && node.base.name === 'setmetatable') {
    if (node.arguments.length < 2) { return }
    const tableType = nodeGetType(node.arguments[0])
    if (!tableType || tableType.type !== 'table') { return }
    const metatableType = nodeGetType(node.arguments[1])
    discoveredType(tableType, __metatable__, metatableType)
  }
}
