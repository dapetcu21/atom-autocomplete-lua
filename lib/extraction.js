'use babel'

/*
 * Everything related to extracting type info and adding it to
 * the type database
 */

import config from './config'
import { getLValue, nodeGetType } from './resolve'
import {
  tableSet, tableSetMetatable, tableGet, tableGetMetatable,
  unknownNew, tableNew, functionNew, exactTableSearch,
  mergeTypeKnowledge, tableApplyDiff
} from './typedefs'

// Describe the algorithm to use to suggest members of unknown tables
// NOTE: It seems that having to import into index.js this structure adds
// a lot of time to the startup of Atom
export const CompletionStrategy = {
  VANILLA: 0,
  ALREADY_USED_ONLY: 1,
  TYPE_ASSUMPTION: 2
}

const __metatable__ = Symbol()
const discoveredType = (table, key, newType, allowOverwrite) => {
  if (!table || table.type !== 'table') {
    return
  } else {
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
}

// Interpolates identifier types (ie: their table members) based on the syntaxic
// tree of the file.
// namedTypes is specified if you want the extraction process to provide
// types on unknown type variables. It is the namedTypes of the option object
export default function extractTypes (node, namedTypes) {
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
  const isMember = type === 'MemberExpression' || type === 'IndexExpression'
  const isFunctionCall = type === 'CallExpression'
  const scopeValues = getLValue(node.base) // holds identifiers defined within the file
  if (scopeValues) {
    if (config.suggestUsedMembers === CompletionStrategy.ALREADY_USED_ONLY) {
      if (isFunctionCall) {
        discoveredType(scopeValues.table, scopeValues.key, functionNew())
      } else if (isMember) {
        discoveredType(scopeValues.table, scopeValues.key, tableNew())
        const lvalue = getLValue(node)
        if (lvalue) {
          discoveredType(lvalue.table, lvalue.key, unknownNew())
        }
      }
    } else if (namedTypes) { // This is true only if CompletionStrategy.TYPE_ASSUMPTION
      if (isFunctionCall) {
        discoveredType(scopeValues.table, scopeValues.key, functionNew())
      } else if (isMember) {
        const wasUnknown = getLValue(node).table.type === 'unknown'
        discoveredType(scopeValues.table, scopeValues.key, tableNew())
        if (wasUnknown) {
          const lvalue = getLValue(node)
          var likelyType = getTypeWithMember(namedTypes, lvalue.key)
          Object.assign(
            lvalue.table.fields, lvalue.table.fields, likelyType.fields)
        }
      }
    }
  }

  if (type === 'CallExpression' &&
    node.base.type === 'Identifier' &&
    node.base.name === 'setmetatable'
  ) {
    if (node.arguments.length < 2) { return }
    const tableType = nodeGetType(node.arguments[0])
    if (!tableType || tableType.type !== 'table') { return }
    const metatableType = nodeGetType(node.arguments[1])
    discoveredType(tableType, __metatable__, metatableType)
  }
}

// Returns the type in scope which has member with the given member
function getTypeWithMember (scopeNamedTypes, member) {
  // let candidate = null // the namedType containing memberPrefix which is the
  for (let namedTypeName in scopeNamedTypes) {
    if (scopeNamedTypes.hasOwnProperty(namedTypeName)) {
      let namedTypeMembers = scopeNamedTypes[namedTypeName]
      if (exactTableSearch(namedTypeMembers, member)) {
        return namedTypeMembers
      }
    }
  }
  // TODO: Apply an heuristic over all discovered types to
  // provide more pertinent results
}
