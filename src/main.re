let parse code => {
  let lexbuf = Lexing.from_string code;
  try (Parser.chunk Lexer.read lexbuf) {
  | Parser.Error =>
    print_endline "error";
    Format.(
      fprintf std_formatter "%a: syntax error\n" Printer.print_position lexbuf
    );
    exit (-1)
  }
};

let () = {
  let code: string = [%bs.raw
    {| require('fs').readFileSync('test.lua', 'utf8') |}
  ];
  let chunk = parse code;
  Printer.pprint (Printer.print_block chunk)
};
