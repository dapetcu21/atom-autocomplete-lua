'use babel'

import {
  getLValue, nodeGetType, tableSet,
  unknownNew, tableNew, functionNew
} from './typedefs'
import config from './config'

const discoveryPriority = {
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

const __metatable__ = Symbol()

const tableDiscovered = (table, key, discovery, allowOverwrite) => {
  if (!table || table.type !== 'table') { return }

  const isMeta = key === __metatable__
  const oldValue = isMeta ? table.metatable : table.fields[key]
  const oldPriority = discoveryPriority[oldValue ? oldValue.type : 'nil']
  const newPriority = discoveryPriority[discovery ? discovery.type : 'nil']
  if (allowOverwrite ? newPriority >= oldPriority : newPriority > oldPriority) {
    if (isMeta) {
      table.metatable = discovery
    } else {
      tableSet(table, key, discovery)
    }
  }
}

export default function extractTypes (node) {
  if (!node) { return }
  const type = node.type

  if (type === 'AssignmentStatement' || type === 'LocalStatement') {
    node.variables.forEach((variable, i) => {
      const lvalue = getLValue(variable)
      if (!lvalue) { return }

      const initializer = node.init[i]
      const initType = nodeGetType(initializer) || unknownNew()
      tableDiscovered(lvalue.table, lvalue.key, initType)
    })
    return
  }
  if (type === 'FunctionDeclaration') {
    const lvalue = getLValue(node.identifier)
    if (!lvalue) { return }

    const funcType = nodeGetType(node) || unknownNew()
    tableDiscovered(lvalue.table, lvalue.key, funcType)
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
        tableDiscovered(lvalue.table, lvalue.key, newType)
      }
    }
    if (isMember && !node.isPlaceholder) {
      const lvalue = getLValue(node)
      if (lvalue) {
        tableDiscovered(lvalue.table, lvalue.key, unknownNew())
      }
    }
  }
  if (type === 'CallExpression' && node.base.type === 'Identifier' && node.base.name === 'setmetatable') {
    if (node.arguments.length < 2) { return }
    const tableType = nodeGetType(node.arguments[0])
    if (!tableType || tableType.type !== 'table') { return }
    const metatableType = nodeGetType(node.arguments[1])
    tableDiscovered(tableType, __metatable__, metatableType)
  }
}
