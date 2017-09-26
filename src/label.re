module L = Last;

module S = Syntax;

let label_binop =
  L.(
    fun
    | S.Addition => Arithmetic Addition
    | S.Subtraction => Arithmetic Subtraction
    | S.Multiplication => Arithmetic Multiplication
    | S.FloatDivision => Arithmetic FloatDivision
    | S.FloorDivision => Arithmetic FloorDivision
    | S.Modulo => Arithmetic Modulo
    | S.Exponentiation => Arithmetic Exponentiation
    | S.BitwiseAnd => Arithmetic BitwiseAnd
    | S.BitwiseOr => Arithmetic BitwiseOr
    | S.BitwiseXor => Arithmetic BitwiseXor
    | S.ShiftRight => Arithmetic ShiftRight
    | S.ShiftLeft => Arithmetic ShiftLeft
    | S.Equality => Relational Equality
    | S.Inequality => Relational Inequality
    | S.Less => Relational Less
    | S.Greater => Relational Greater
    | S.LessEq => Relational LessEq
    | S.GreaterEq => Relational GreaterEq
    | S.LogicalAnd => And
    | S.LogicalOr => Or
    | S.Concat => Concat
  );

let label_unop =
  fun
  | S.UnaryMinus => L.UnaryMinus
  | S.BitwiseNot => L.BitwiseNot
  | S.Length => L.Length
  | S.LogicalNot => L.LogicalNot;

let rec label_fcall =
  fun
  | S.Function calee args =>
    Last.FunctionCall (label_prefixexp calee) (List.map label_expression args)
  | S.Method calee name args =>
    Last.MethodCall
      (label_prefixexp calee) name (List.map label_expression args)
and label_prefixexp =
  fun
  | S.Var x => L.LValue (label_var x)
  | S.FunctionCallExp call => L.Call (label_fcall call)
  | S.Exp x => label_expression x
and label_var =
  fun
  | S.Name var_name => L.Name var_name
  | S.IndexTable a b => L.DynIndex (label_prefixexp a) (label_expression b)
and label_expression =
  L.(
    fun
    | S.Nil => Literal Nil
    | S.True => Literal True
    | S.False => Literal False
    | S.Integer x => Literal (Number (Int x))
    | S.Float x => Literal (Number (Float x))
    | S.LiteralString x => Literal (String x)
    | S.Vararg => Literal Vararg
    | S.PrefixExp x => label_prefixexp x
    | S.BinOp op a b =>
      BinOp (label_binop op) (label_expression a) (label_expression b)
    | S.UnOp op a => UnOp (label_unop op) (label_expression a)
    | S.FunctionDef (args, vararg, block) => {
        let has_vararg =
          switch vararg {
          | Some () => true
          | None => false
          };
        Literal (Function args has_vararg (label_block block))
      }
    | S.Table entries => {
        let count = ref 0;
        let mapper (key_exp, value_exp) => {
          let key =
            switch key_exp {
            | None =>
              count := !count + 1;
              Literal (Number (Int !count))
            | Some exp => label_expression exp
            };
          let value = label_expression value_exp;
          (key, value)
        };
        let new_entries = List.map mapper entries;
        Literal (Table new_entries)
      }
  )
and label_if =
  L.(
    fun a b =>
      switch (a, b) {
      | ([], _) => Nop
      | ([(exp, block)], None) =>
        If (label_expression exp) (label_block block) None
      | ([(exp, block)], Some else_branch) =>
        If
          (label_expression exp)
          (label_block block)
          (Some (label_block else_branch))
      | ([(exp, block), ...branches], else_branch) =>
        If
          (label_expression exp)
          (label_block block)
          (Some [label_if branches else_branch])
      }
  )
and label_statement =
  L.(
    fun
    | S.Assign lvalues expressions =>
      Assign
        (List.map label_var lvalues) (List.map label_expression expressions)
    | S.LocalAssign names expressions => {
        let expr_list =
          switch expressions {
          | None => []
          | Some l => List.map label_expression l
          };
        LocalAssign names expr_list
      }
    | S.FunctionCall x => CallStatement (label_fcall x)
    | S.If branches else_branch => label_if branches else_branch
    | S.ForStep name exp1 exp2 exp3 block =>
      ForStep
        name
        (label_expression exp1)
        (label_expression exp2)
        (
          switch exp3 {
          | None => None
          | Some exp => Some (label_expression exp)
          }
        )
        (label_block block)
    | S.ForIn names expressions block =>
      ForIn names (List.map label_expression expressions) (label_block block)
    | S.WhileDoEnd cond block =>
      WhileDoEnd (label_expression cond) (label_block block)
    | S.RepeatUntil block cond =>
      RepeatUntil (label_block block) (label_expression cond)
    | S.DoEnd b => DoEnd (label_block b)
    | S.Break => Nop
    | S.Goto _ => Nop
    | S.Label _ => Nop
  )
and label_block (statements, return_statements) => {
  let labeled_statements = List.map label_statement statements;
  switch return_statements {
  | None => labeled_statements
  | Some expressions =>
    labeled_statements @ [L.Return (List.map label_expression expressions)]
  }
};

let parse: string => L.block =
  fun code =>
    label_block {
      let lexbuf = Lexing.from_string code;
      try (Parser.chunk Lexer.read lexbuf) {
      | Parser.Error =>
        Format.eprintf "%a: syntax error\n" Printer.print_position lexbuf;
        ([], None)
      }
    };
