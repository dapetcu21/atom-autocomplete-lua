/* This is a major hack */
open Lexing;

open Syntax;

let print_position fmt lexbuf => {
  let pos = lexbuf.lex_curr_p;
  Format.fprintf
    fmt "%s:%d:%d" pos.pos_fname pos.pos_lnum (pos.pos_cnum - pos.pos_bol + 1)
};

type printable_node = {
  header: string,
  items: list printable_node
};

let printable_node (header: string) (items: list printable_node) => {
  header,
  items
};

let concat_block_lines lines :string =>
  String.concat "" (List.map (fun x => x ^ "\n") lines);

let rec print_statement =
  fun
  | FunctionCall fcall => print_fcall fcall
  | Label name => printable_node "Label" [printable_node name []]
  | Goto name => printable_node "Goto" [printable_node name []]
  | Break => printable_node "Break" []
  | DoEnd block => printable_node "DoEnd" [print_block block]
  | WhileDoEnd cond block =>
    printable_node "WhileDoEnd" [print_expression cond, print_block block]
  | RepeatUntil block cond =>
    printable_node "RepeatUntil" [print_block block, print_expression cond]
  | _ => printable_node "UnimplementedStatement" []
and print_fcall =
  fun
  | Function lvalue args =>
    printable_node
      "FunctionCall"
      [print_prefixexp lvalue, ...List.map print_expression args]
  | Method lvalue name args =>
    printable_node
      "MethodCall"
      [
        print_prefixexp lvalue,
        printable_node name [],
        ...List.map print_expression args
      ]
and print_var =
  fun
  | Name name => printable_node "Var" [printable_node name []]
  | IndexTable lvalue rvalue =>
    printable_node
      "IndexTable" [print_prefixexp lvalue, print_expression rvalue]
and print_prefixexp =
  fun
  | Var name => print_var name
  | Exp exp => print_expression exp
  | FunctionCallExp exp => print_fcall exp
and print_expression =
  fun
  | Nil => printable_node "Nil" []
  | False => printable_node "False" []
  | True => printable_node "True" []
  | Integer x => printable_node "Integer" [printable_node (string_of_int x) []]
  | Float x => printable_node "Float" [printable_node (string_of_float x) []]
  | PrefixExp exp => print_prefixexp exp
  | _ => printable_node "UnimplementedExpression" []
and print_block (statements, return_statements) => {
  let statement_prt =
    printable_node "Statements" (List.map print_statement statements);
  printable_node
    "Block"
    (
      switch return_statements {
      | None => [statement_prt]
      | Some expressions => [
          statement_prt,
          printable_node "Returns" (List.map print_expression expressions)
        ]
      }
    )
};

let pprint: printable_node => unit = [%bs.raw
  {|
    function (x) {
      function fix(v) {
        if (!Array.isArray(v) || v.length !== 2) { return v; }
        if (v[1] === 0) { return [fix(v[0])] }
        return [fix(v[0]), ...fix(v[1])];
      }
      console.log(require('util').inspect(fix(x, true), { depth: null }))
    }
  |}
];
