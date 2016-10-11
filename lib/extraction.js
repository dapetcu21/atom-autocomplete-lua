'use babel'

import { getLValue, nodeGetType, unknownNew, tableNew, tableDiscovered } from './typedefs'

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
  if (type === 'MemberExpression' || type === 'IndexExpression') {
    const lvalue = getLValue(node.base)
    if (!lvalue) { return }

    const nodeType = lvalue.table.fields[lvalue.key]
    if (nodeType && nodeType.type === 'table') { return } // We don't overwrite stuff
    tableDiscovered(lvalue.table, lvalue.key, tableNew())
    return
  }
}
