'use babel'

import path from 'path'
import fs from 'fs'

export default class LuaCompleteRcProvider {
  priority = 10;

  getOptions = async function (request, getPreviousOptions) {
    const previousOptions = getPreviousOptions()
    try {
      let filePath = request.editor.getBuffer().getPath()
      let rcPath = null
      let stat = null

      while (true) {
        const dirName = path.dirname(filePath)
        if (dirName === filePath) { break }
        filePath = dirName

        const _rcPath = path.join(dirName, '.luacompleterc')
        stat = await (new Promise((resolve, reject) => {
          fs.stat(_rcPath, (err, stats) => {
            if (err) { reject(err) } else { resolve(stats) }
          })
        }).catch(err => {
          if (err.code === 'ENOENT') { return null }
          throw err
        }))

        if (stat && stat.isFile()) {
          rcPath = _rcPath
          break
        }
      }

      if (!rcPath) {
        return { options: (await previousOptions) }
      }

      const data = await (new Promise((resolve, reject) => {
        fs.readFile(rcPath, (err, stats) => {
          if (err) { reject(err) } else { resolve(stats) }
        })
      }))

      const options = JSON.parse(data)

      // TODO: Merge options
      return { options }

      console.log(request)
    } catch (ex) {
      console.error(ex)
      return { options: (await previousOptions) }
    }
  };
}
