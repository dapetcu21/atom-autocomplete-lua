'use babel'

import { getLValue, nodeGetType, tableDiscovered } from './typedefs'

export default function extractTypes (node) {
  if (!node) { return }
  const type = node.type

  if (type === 'AssignmentStatement') {
    node.variables.forEach((variable, i) => {
      const lvalue = getLValue(variable)
      if (!lvalue) { return }

      const initializer = node.init[i]
      const initType = nodeGetType(initializer)
      if (!initType) { return }

      tableDiscovered(lvalue.table, lvalue.key, initType)
    })
    return
  }
}
