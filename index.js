'use babel'

const luaparse = require('luaparse')

const provider = {
  selector: '.source.lua',
  disableForSelector: '.source.lua .comment',
  inclusionPriority: 1,
  excludeLowerPriority: true,

  getSuggestions (request) {
    // console.log('suggestions', request)
    const source = request.editor.getBuffer().getText()

    try {
      const ast = luaparse.parse(source, {
        comments: false,
        ranges: true,
        scope: true,
        onCreateNode () {
          console.log('onCreateNode', [...arguments])
        },
        onCreateScope () {
          // console.log('onCreateScope', [...arguments])
        },
        onDestroyScope () {
          // console.log('onDestroyScope', [...arguments])
        }
      })

      // console.log(JSON.stringify(ast, null, 2))
    } catch (ex) {
      // console.error(ex)
    }

    return Promise.resolve([])
  }
}

export default {
  getProvider: () => {
    console.log('getProvider')
    return provider
  }
}
