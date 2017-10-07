open Jest;

let _ =
  describe
    "Parser"
    (
      fun () => {
        open Expect;
        let real_world_lua_input: string = [%bs.raw
          {| require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'js', '__tests__', 'real_world.lua'), 'utf8') |}
        ];
        test
          "parses real world lua script with no errors"
          (
            fun () => {
              let ast = Parser.parse real_world_lua_input;
              expect (ast === []) |> toBe false
            }
          )
      }
    );
