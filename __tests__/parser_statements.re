open Jest;

let _ =
  describe
    "Parser"
    (
      fun () => {
        open Expect;
        open Syntax;
        open Parser;
        let test_block code ast () =>
          expect (Parser.parse code) |> toEqual ast;
        let real_world_lua_input: string = [%bs.raw
          {| require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'js', '__tests__', 'real_world.lua'), 'utf8') |}
        ];
        test
          "ignores labels, gotos and break"
          (
            test_block
              {|
                ::useless_label1::
                goto useless_label1
                break
              |}
              [Nop, Nop, Nop]
          );
        test
          "parses return statements"
          (
            test_block
              {|
                return 12, 13, 14
              |}
              [
                Return [
                  Literal (Number "12"),
                  Literal (Number "13"),
                  Literal (Number "14")
                ]
              ]
          );
        test
          "parses function call statements"
          (
            test_block
              {|
                f(foo, "bar")
              |}
              [
                CallStatement (
                  FunctionCall
                    (LValue (Name "f"))
                    [LValue (Name "foo"), Literal (String "bar")]
                )
              ]
          );
        test
          "parses method call statements"
          (
            test_block
              {|
                self:f(foo, "bar")
              |}
              [
                CallStatement (
                  MethodCall
                    (LValue (Name "self"))
                    "f"
                    [LValue (Name "foo"), Literal (String "bar")]
                )
              ]
          );
        test
          "parses local statements"
          (
            test_block
              {|
                local a, b
              |}
              [LocalAssign ["a", "b"] []]
          );
        test
          "parses local assignments"
          (
            test_block
              {|
                local a, b, c = "foo", unpack()
              |}
              [
                LocalAssign
                  ["a", "b", "c"]
                  [
                    Literal (String "foo"),
                    Call (FunctionCall (LValue (Name "unpack")) [])
                  ]
              ]
          );
        test
          "parses assignment"
          (
            test_block
              {|
                a, b = c, d
              |}
              [
                Assign
                  [Name "a", Name "b"] [LValue (Name "c"), LValue (Name "d")]
              ]
          );
        test
          "parses if"
          (
            test_block
              {|
                if cond then
                  return "foo"
                end
              |}
              [
                If (LValue (Name "cond")) [Return [Literal (String "foo")]] None
              ]
          );
        test
          "parses if else"
          (
            test_block
              {|
                if cond then
                  return "foo"
                else
                  return "bar"
                end
              |}
              [
                If
                  (LValue (Name "cond"))
                  [Return [Literal (String "foo")]]
                  (Some [Return [Literal (String "bar")]])
              ]
          );
        test
          "parses if elseif else"
          (
            test_block
              {|
                if cond1 then
                  return "foo"
                elseif cond2 then
                  return "bar"
                else
                  return "baz"
                end
              |}
              [
                If
                  (LValue (Name "cond1"))
                  [Return [Literal (String "foo")]]
                  (
                    Some [
                      If
                        (LValue (Name "cond2"))
                        [Return [Literal (String "bar")]]
                        (Some [Return [Literal (String "baz")]])
                    ]
                  )
              ]
          );
        test
          "parses real world lua script with no errors"
          (
            fun () => {
              let ast = parse real_world_lua_input;
              expect (ast === []) |> toBe false
            }
          )
      }
    );
