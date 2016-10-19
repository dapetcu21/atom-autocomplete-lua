'use babel'

import path from 'path'
import fs from 'fs'

const promisify = f => (...args) =>
  new Promise((resolve, reject) => {
    f(...args, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })

const open = promisify(fs.open.bind(fs))
const readFile = promisify(fs.readFile.bind(fs))
const fstat = promisify(fs.fstat.bind(fs))

export default class ModuleCache {
  fileCache = {}
  constructor (options) {
    const cwd = options.cwd
    this.paths = (options.packagePath || path.join('.', '?.lua'))
      .split(';')
      .filter(p => p) // Remove potentially empty entries caused by a dangling ;
      .map(p => path.resolve(cwd, p))
  }

  _getFile = async (moduleName) => {
    const modulePathName = moduleName.replace(/\./g, path.sep)
    for (let i = 0, n = this.paths.length; i < n; i++) {
      let fd
      try {
        const fileName = this.paths[i].replace(/\?/g, modulePathName)
        fd = await open(fileName, 'r')
        const stat = await fstat(fd)
        const data = await readFile(fd)
        return { data, stat }
      } catch (ex) {
      } finally {
        if (fd !== undefined) { fs.close(fd) }
      }
    }
  }

  get = async (moduleName, analyse) => {
    const fileObj = await this._getFile(moduleName)
    if (!fileObj) { return }
    return await analyse(fileObj.data)
  }
}
