'use babel'

import { getLValue, nodeGetType, unknownNew, tableDiscovered } from './typedefs'

export default function extractTypes (node) {
  if (!node) { return }
  const type = node.type

  if (type === 'AssignmentStatement' || type === 'LocalStatement') {
    node.variables.forEach((variable, i) => {
      const lvalue = getLValue(variable)
      if (!lvalue) { return }

      const initializer = node.init[i]
      const initType = nodeGetType(initializer) || unknownNew()
      debugger
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
}
