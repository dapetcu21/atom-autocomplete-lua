'use babel'

export default class ModuleCache {
  get (filePath, analyse) {
    return analyse(`
      shameless_global = 12
      return { meow = function () end, ham = 12 }
    `)
  }
}
