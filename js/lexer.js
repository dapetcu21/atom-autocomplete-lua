'use strict'

const chevrotain = require('chevrotain')
const Lexer = chevrotain.Lexer

const tokenVocabulary = {}
const allTokens = []
const createToken = (options) => {
  let newTokenType = chevrotain.createToken(options)
  allTokens.push(newTokenType)
  tokenVocabulary[options.name] = newTokenType
  return newTokenType
}

function _matchBlock (input, offset) {
  if (input.charCodeAt(offset++) !== 91) { return -1 } // '['
  let c
  let level = 0
  while ((c = input.charCodeAt(offset++)) === 61) { // '='
    level++
  }
  if (c !== 91) { return -1 } // '['

  let state = 0
  while (!isNaN(c = input.charCodeAt(offset++))) {
    if (state) {
      if (state > 1) {
        if (c !== 61) { state = 0; continue } // '='
        state--
      } else {
        if (c !== 93) { state = 0; continue } // ']'
        return offset
      }
    } else {
      if (c === 93) { // ']'
        state = 1 + level
      }
    }
  }

  return -1
}

function matchBlock (input, startOffset) {
  const endOffset = _matchBlock(input, startOffset)
  if (endOffset === -1) { return null }
  return [input.substring(startOffset, endOffset)]
}

function matchBlockComment (input, startOffset) {
  if (input.charCodeAt(startOffset) !== 45) { return null } // '-'
  if (input.charCodeAt(startOffset + 1) !== 45) { return null } // '-'
  const endOffset = _matchBlock(input, startOffset + 2)
  if (endOffset === -1) { return null }
  return [input.substring(startOffset, endOffset)]
}

createToken({
  name: 'BlockComment',
  pattern: { exec: matchBlockComment },
  group: Lexer.SKIPPED
})

createToken({
  name: 'LineComment',
  pattern: /--.*/,
  group: Lexer.SKIPPED
})

const Name = chevrotain.createToken({ name: 'Name', pattern: /[a-zA-Z_][0-9a-zA-Z_]*/ })
const Keyword = createToken({
  name: 'Keyword',
  pattern: Lexer.NA,
  longer_alt: Name
})

createToken({ name: 'And', pattern: /and/, parent: Keyword })
createToken({ name: 'Break', pattern: /break/, parent: Keyword })
createToken({ name: 'Do', pattern: /do/, parent: Keyword })
createToken({ name: 'Else', pattern: /else/, parent: Keyword })
createToken({ name: 'Elseif', pattern: /elseif/, parent: Keyword })
createToken({ name: 'End', pattern: /end/, parent: Keyword })
createToken({ name: 'False', pattern: /false/, parent: Keyword })
createToken({ name: 'For', pattern: /for/, parent: Keyword })
createToken({ name: 'Function', pattern: /function/, parent: Keyword })
createToken({ name: 'Goto', pattern: /goto/, parent: Keyword })
createToken({ name: 'If', pattern: /if/, parent: Keyword })
createToken({ name: 'In', pattern: /in/, parent: Keyword })
createToken({ name: 'Local', pattern: /local/, parent: Keyword })
createToken({ name: 'Nil', pattern: /nil/, parent: Keyword })
createToken({ name: 'Not', pattern: /not/, parent: Keyword })
createToken({ name: 'Or', pattern: /or/, parent: Keyword })
createToken({ name: 'Repeat', pattern: /repeat/, parent: Keyword })
createToken({ name: 'Return', pattern: /return/, parent: Keyword })
createToken({ name: 'Then', pattern: /then/, parent: Keyword })
createToken({ name: 'True', pattern: /true/, parent: Keyword })
createToken({ name: 'Until', pattern: /until/, parent: Keyword })
createToken({ name: 'While', pattern: /while/, parent: Keyword })

allTokens.push(Name)
tokenVocabulary.Name = Name

createToken({
  name: 'BlockString',
  pattern: { exec: matchBlock }
})

createToken({ name: 'Plus', pattern: /\+/ })
createToken({ name: 'Minus', pattern: /-/ })
createToken({ name: 'Times', pattern: /\*/ })
createToken({ name: 'Div', pattern: /\// })
createToken({ name: 'Mod', pattern: /%/ })
createToken({ name: 'Pow', pattern: /\^/ })
createToken({ name: 'Length', pattern: /#/ })
createToken({ name: 'Equal', pattern: /==/ })
createToken({ name: 'NotEqual', pattern: /~=/ })
createToken({ name: 'LessThanEqual', pattern: /<=/ })
createToken({ name: 'GreaterThanEqual', pattern: />=/ })
createToken({ name: 'LessThan', pattern: /</ })
createToken({ name: 'GreaterThan', pattern: />/ })
createToken({ name: 'Assign', pattern: /=/ })
createToken({ name: 'LeftParen', pattern: /\(/ })
createToken({ name: 'RightParen', pattern: /\)/ })
createToken({ name: 'LeftBrace', pattern: /\{/ })
createToken({ name: 'RightBrace', pattern: /\}/ })
createToken({ name: 'LeftBracket', pattern: /\[/ })
createToken({ name: 'RightBracket', pattern: /\]/ })
createToken({ name: 'Label', pattern: /::/ })
createToken({ name: 'Semicolon', pattern: /;/ })
createToken({ name: 'Colon', pattern: /:/ })
createToken({ name: 'Comma', pattern: /,/ })
createToken({ name: 'Vararg', pattern: /\.\.\./ })
createToken({ name: 'Concat', pattern: /\.\./ })
createToken({ name: 'Period', pattern: /\./ })

createToken({
  name: 'Number',
  pattern: /-?(0[xX]([0-9a-fA-F]+(\.[0-9a-fA-F]*)?|\.[0-9a-fA-F]+)([pP][+-]?[0-9]+)?|([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?)/
})

createToken({
  name: 'String',
  pattern: /'([^'\\]|\\([abfnrtvz\\'"]|x[0-9A-Fa-f][0-9A-Fa-f]|[0-9][0-9]?[0-9]?))*'|"([^"\\]|\\([abfnrtvz\\'"]|x[0-9A-Fa-f][0-9A-Fa-f]|[0-9][0-9]?[0-9]?))*"/
})

createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
  line_breaks: true
})

const LuaLexer = new Lexer(allTokens)

module.exports = {
  tokenVocabulary: tokenVocabulary,

  lex (inputText) {
    let lexingResult = LuaLexer.tokenize(inputText)

    if (lexingResult.errors.length > 0) {
      throw Error('Sad Sad Panda, lexing errors detected')
    }

    return lexingResult
  }
}
