open Jest;

let _ =
  describe
    "Lua parser and labeler"
    (
      fun () => {
        open Expect;
        open Label;
        open Last;
        let ast_test code ast () => expect (parse code) |> toEqual ast;
        test
          "ignores labels and gotos"
          (
            ast_test
              {|
                ::useless_label1::
                goto useless_label1
              |}
              [Nop, Nop]
          );
        test
          "parses return statements"
          (
            ast_test
              {|
                return 12, 13, 14
              |}
              [
                Return [
                  Literal (Number (Int 12)),
                  Literal (Number (Int 13)),
                  Literal (Number (Int 14))
                ]
              ]
          );
        test
          "parses tables"
          (
            ast_test
              {|
                return { a = "foo", "bar" }
              |}
              [
                Return [
                  Literal (
                    Table [
                      (Literal (String "a"), Literal (String "foo")),
                      (Literal (Number (Int 1)), Literal (String "bar"))
                    ]
                  )
                ]
              ]
          );
        test
          "parses function calls"
          (
            ast_test
              {|
                return f(foo, "bar")
              |}
              [
                Return [
                  Call (
                    FunctionCall
                      (LValue (Name "f"))
                      [LValue (Name "foo"), Literal (String "bar")]
                  )
                ]
              ]
          );
        test
          "parses method calls"
          (
            ast_test
              {|
                return self:f(foo, "bar")
              |}
              [
                Return [
                  Call (
                    MethodCall
                      (LValue (Name "self"))
                      "f"
                      [LValue (Name "foo"), Literal (String "bar")]
                  )
                ]
              ]
          );
        test
          "parses function definitions"
          (
            ast_test
              {|
                return function (a, b) return a + b end
              |}
              [
                Return [
                  Literal (
                    Function
                      ["a", "b"]
                      false
                      [
                        Return [
                          BinOp
                            (Arithmetic Addition)
                            (LValue (Name "a"))
                            (LValue (Name "b"))
                        ]
                      ]
                  )
                ]
              ]
          )
      }
    );
