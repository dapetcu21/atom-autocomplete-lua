'use babel'

import { getLValue, nodeGetType, unknownNew, tableNew, functionNew, tableDiscovered } from './typedefs'
import config from './config'

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
    if (isMember && !node.isPlaceholder) {
      const lvalue = getLValue(node)
      if (lvalue) {
        tableDiscovered(lvalue.table, lvalue.key, unknownNew(), true)
      }
    }
    if (isFunctionCall || isMember) {
      const lvalue = getLValue(node.base)
      if (!lvalue) { return }
      const newType = isFunctionCall ? functionNew() : tableNew()
      tableDiscovered(lvalue.table, lvalue.key, newType, true)
    }
  }
}
