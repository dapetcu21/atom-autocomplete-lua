{
open Lexing
open Syntax
open Parser

let reserved_keywords =
  [ "and",      Parser.AND
  ; "break",    Parser.BREAK
  ; "do",       Parser.DO
  ; "else",     Parser.ELSE
  ; "elseif",   Parser.ELSEIF
  ; "end",      Parser.END
  ; "false",    Parser.FALSE
  ; "for",      Parser.FOR
  ; "function", Parser.FUNCTION
  ; "goto",     Parser.GOTO
  ; "if",       Parser.IF
  ; "in",       Parser.IN
  ; "local",    Parser.LOCAL
  ; "nil",      Parser.NIL
  ; "not",      Parser.NOT
  ; "or",       Parser.OR
  ; "repeat",   Parser.REPEAT
  ; "return",   Parser.RETURN
  ; "then",     Parser.THEN
  ; "true",     Parser.TRUE
  ; "until",    Parser.UNTIL
  ; "while",    Parser.WHILE
  ]

let next_line lexbuf =
  let pos = lexbuf.lex_curr_p in
  lexbuf.lex_curr_p <-
    { pos with pos_bol = lexbuf.lex_curr_pos;
               pos_lnum = pos.pos_lnum + 1
    }
}

let white = [' ' '\t']+
let newline = '\r' | '\n' | '\r' '\n'
let name = ['_' 'a'-'z' 'A'-'Z'] ['_' 'a'-'z' 'A'-'Z' '0'-'9']*
let hex = '0' ['x' 'X']

rule read = parse
  | '-' '-' '[' '[' { comment_long lexbuf }
  | '-' '-' { comment lexbuf }
  | white { read lexbuf }
  | newline { next_line lexbuf; read lexbuf }
  | name { let name = lexeme lexbuf in
           try
             List.assoc name reserved_keywords
           with
             Not_found -> Parser.NAME name }
  | ['0'-'9']+ '.' ['0'-'9']+
      { Parser.FLOAT (float_of_string (lexeme lexbuf)) }
  | ['0'-'9']+ ['e' 'E'] ['0'-'9']+
      { Parser.FLOAT (float_of_string (lexeme lexbuf)) }
  | ['0'-'9']+ '.' ['0'-'9']* ['e' 'E'] ['0'-'9']+
      { Parser.FLOAT (float_of_string (lexeme lexbuf)) }
  | ['0'-'9']+
      { Parser.INTEGER (int_of_string (lexeme lexbuf)) }
  | hex ['0'-'9' 'A'-'F' 'a'-'f']+
      { Parser.INTEGER (int_of_string (lexeme lexbuf)) }
  | ('\'' | '"') as delimiter
      { Parser.LITERALSTRING
          (literal_string delimiter lexbuf) }
  | '[' '['
      { Parser.LITERALSTRING
          (literal_string_long lexbuf) }
  | '=' { EQUAL }
  | ':' ':' { DOUBLECOLON }
  | ':' { COLON }
  | ';' { SEMICOLON }
  | ',' { COMMA }
  | '.' '.' '.' { TRIPLEDOT }
  | '.' '.' { DOUBLEDOT }
  | '.' { DOT }
  | '(' { LPAREN }
  | ')' { RPAREN }
  | '+' { PLUS }
  | '-' { HYPHEN }
  | '*' { ASTERISK }
  | '/' '/' { DOUBLESLASH }
  | '/' { SLASH }
  | '^' { HAT }
  | '%' { PERCENT }
  | '&' { AMPERSAND }
  | '~' { TILDA }
  | '|' { VERTICALBAR }
  | '>' '>' { DOUBLELT }
  | '<' '<' { DOUBLEGT }
  | '<' { GT }
  | '<' '=' { GTEQ }
  | '>' { LT }
  | '>' '=' { LTEQ }
  | '=' '=' { DOUBLEEQUAL }
  | '~' '=' { TILDAEQUAL }
  | '#' { SHARP }
  | '{' { LBRACE }
  | '}' { RBRACE }
  | '[' { LBRACKET }
  | ']' { RBRACKET }
  | eof { EOF }

and comment_long = parse
  | newline { next_line lexbuf; comment_long lexbuf }
  | ']' ']' { read lexbuf }
  | _ { comment_long lexbuf }

and comment = parse
  | newline { next_line lexbuf; read lexbuf }
  | _ { comment lexbuf }

and literal_string open_delimiter = parse
  | '\\' '\\'
      { "\\\\" ^ (literal_string open_delimiter lexbuf) }
  | '\\' '\''
      { "'" ^ (literal_string open_delimiter lexbuf) }
  | '\\' '"'
      { "\"" ^ (literal_string open_delimiter lexbuf) }
  | newline
      { next_line lexbuf; literal_string open_delimiter lexbuf }
  | _ as ch
      { if ch = open_delimiter
        then ""
        else (Char.escaped ch) ^ (literal_string open_delimiter lexbuf) }

and literal_string_long = parse
  | ']' ']' { "" }
  | newline { next_line lexbuf; literal_string_long lexbuf }
  | _ as ch { (Char.escaped ch) ^ (literal_string_long lexbuf) }
