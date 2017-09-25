%{
  open Syntax

  type whose_arg =
    | FunctionArg of args
    | MethodArg of name * args
%}
  
%token EQUAL
%token COLON
%token SEMICOLON
%token COMMA
%token DOT
%token EOF
%token LPAREN
%token RPAREN
%token LBRACE
%token RBRACE
%token LBRACKET
%token RBRACKET

%token PLUS
%token HYPHEN
%token ASTERISK
%token DOUBLESLASH
%token SLASH
%token HAT
%token PERCENT
%token AMPERSAND
%token TILDA
%token VERTICALBAR
%token DOUBLECOLON
%token DOUBLELT
%token DOUBLEGT
%token DOUBLEDOT
%token TRIPLEDOT
%token GT
%token GTEQ
%token LT
%token LTEQ
%token DOUBLEEQUAL
%token TILDAEQUAL
%token SHARP

(* reserved keywords *)
%token AND
%token BREAK
%token DO
%token ELSE
%token ELSEIF
%token END
%token FALSE
%token FOR
%token FUNCTION
%token GOTO
%token IF
%token IN
%token LOCAL
%token NIL
%token NOT
%token OR
%token REPEAT
%token RETURN
%token THEN
%token TRUE
%token UNTIL
%token WHILE

%token <int> INTEGER
%token <float> FLOAT
%token <Syntax.name> NAME
%token <string> LITERALSTRING
%start <Syntax.block> chunk
%%

chunk:
  | b = block; EOF { b }
  ;

block:
  | s = stat*; r = retstat? { s, r }
  ;

stat:
  | s = stat_; SEMICOLON? { s }
  ;

stat_:
  | vs = varlist; EQUAL; es = explist { Assign (vs, es) }
  | fc = functioncall { FunctionCall fc }
  | l = label { l }
  | BREAK { Break }
  | GOTO; n = NAME { Goto n }
  | DO; b = block; END { DoEnd b }
  | WHILE; e = exp; DO; b = block; END { WhileDoEnd (e, b) }
  | REPEAT; b = block; UNTIL; e = exp { RepeatUntil (b, e) }
  | IF; e = exp; THEN; b1 = block;
    br = list(ELSEIF; e = exp; THEN; b = block { (e, b) });
    b2 = option(ELSE; b = block { b }); END
      { If ((e, b1) :: br, b2) }
  | FOR; n = NAME; EQUAL;
    e1 = exp; COMMA; e2 = exp; e3 = option(COMMA; e = exp { e });
    DO; b = block; END
      { ForStep (n, e1, e2, e3, b) }
  | FOR; ns = namelist; IN; es = explist;
    DO; b = block; END
      { ForIn (ns, es, b) }
  | FUNCTION; n = separated_nonempty_list(DOT, NAME);
    l = option(methodcall); fb = funcbody
    { let fb =
        let (params, vararg, body) = fb
        in FunctionDef ("self" :: params, vararg, body)
      in
      (* "a.b.c" -> IndexTable ( ... , LiteralString c) *)
      let rec var_of_names : name list -> var = function
        | [] -> failwith "var_of_names"
        | [n] -> Name n
        | n :: ns -> IndexTable (Var (var_of_names ns), LiteralString n)
      in
      let v = var_of_names (List.rev n) in
      Assign ([v], [fb]) }
  | LOCAL;
    FUNCTION; n = NAME; l = option(COLON; n = NAME { n }); fb = funcbody
    { LocalAssign ([n], Some [FunctionDef fb]) }
  | LOCAL; ns = namelist; es = option(EQUAL; es = explist { es })
    { LocalAssign (ns, es) }
  ;

methodcall:
  | COLON; n = NAME { n }
  ;

retstat:
  | RETURN; es = explist; SEMICOLON? { es }
  | RETURN; SEMICOLON? { [] }
  ;

label:
  | DOUBLECOLON; n = NAME; DOUBLECOLON { Label n }
  ;

var:
  | n = NAME { Name n }
  | pe = prefixexp; LBRACKET; e = exp; RBRACKET { IndexTable (pe, e) }
  | pe = prefixexp; DOT; n = NAME { IndexTable (pe, LiteralString n) }
  ;

exp:
  | e1 = light_exp; b = binop; e2 = exp { BinOp (b, e1, e2) }
  | u = unop; e = exp { UnOp (u, e) }
  | e = light_exp { e }
  ;

namelist:
  | ns = separated_nonempty_list(COMMA, NAME) { ns }
  ;

varlist:
  | vs = separated_nonempty_list(COMMA, var) { vs }
  ;

explist:
  | es = separated_nonempty_list(COMMA, exp) { es }
  ;

light_exp:
  | NIL { Nil }
  | TRUE { True }
  | FALSE { False }
  | p = prefixexp { PrefixExp p }
  | i = INTEGER { Integer i }
  | f = FLOAT { Float f }
  | s = LITERALSTRING { LiteralString s }
  | t = tableconstr { Table t }
  | TRIPLEDOT { Vararg }
  | FUNCTION; fb = funcbody { FunctionDef fb }
  ;

tableconstr:
  | LBRACE; RBRACE { [] }
  | LBRACE; fs = fields; RBRACE { fs }
  ;

field_separator:
  | COMMA     { () }
  | SEMICOLON { () }
  ;

fields:
  | f = field { [f] }
  | f = field; field_separator; fs = fields?
    { match fs with
      | Some fs -> f :: fs
      | None    -> [f]
    }
  ;

field:
  | LBRACKET; k = exp; RBRACKET; EQUAL; v = exp { Some k, v }
  | n = NAME; EQUAL; v = exp { Some (LiteralString n), v }
  | v = exp { None, v }
  ;

binop:
  | PLUS { Addition }
  | HYPHEN { Subtraction }
  | ASTERISK { Multiplication }
  | SLASH { FloatDivision }
  | DOUBLESLASH { FloorDivision }
  | PERCENT { Modulo }
  | HAT { Exponentiation }
  | AMPERSAND { BitwiseAnd }
  | VERTICALBAR { BitwiseOr }
  | TILDA { BitwiseXor }
  | DOUBLELT { ShiftRight }
  | DOUBLEGT { ShiftLeft }
  | DOUBLEEQUAL { Equality }
  | TILDAEQUAL { Inequality }
  | LT { Less }
  | GT { Greater }
  | LTEQ { LessEq }
  | GTEQ { GreaterEq }
  | AND { LogicalAnd }
  | OR { LogicalOr }
  | DOUBLEDOT { Concat }
  ;

unop:
  | HYPHEN { UnaryMinus }
  | NOT { BitwiseNot }
  | SHARP { Length }
  | TILDA { LogicalNot }
  ;

pexp:
  | v = var { Var v }
  | LPAREN; e = exp; RPAREN { Exp e }
  ;

functioncallarg:
  | a = args; { FunctionArg a }
  | COLON; n = NAME; a = args { MethodArg (n, a) }
  ;

functioncall:
  | p = pexp; fca = nonempty_list(functioncallarg)
    { let make_fc (p : functioncall) : whose_arg -> functioncall = function
      | MethodArg (n, a) -> Method (FunctionCallExp p, n, a)
      | FunctionArg a    -> Function (FunctionCallExp p, a)
      in
      List.fold_left
        (fun acc arg -> make_fc acc arg)
        (match List.hd fca with
        | MethodArg (n, a) -> Method (p, n, a)
        | FunctionArg a    -> Function (p, a))
        (List.tl fca)
    }
  ;

prefixexp:
  | fc = functioncall { FunctionCallExp fc }
  | p = pexp { p }
  ;

funcbody:
  | LPAREN; ps = option(parlist); RPAREN; b = block; END
    { let ps, va =
        match ps with
        | Some s -> s
        | None   -> [], None
      in
      ps, va, b }
  ;

parlist:
  | TRIPLEDOT { [], Some () }
  | n = NAME { [n], None }
  | n = NAME; COMMA; ps = parlist
    { match ps with ps, va -> n :: ps, va }
  ;

args:
  | LPAREN; RPAREN { [] }
  | LPAREN; es = explist; RPAREN { es }
  | s = LITERALSTRING { [LiteralString s] }
  | t = tableconstr { [Table t] }
  ;
