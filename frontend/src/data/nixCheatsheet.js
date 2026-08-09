// Nix cheat sheet. Runnable entries have an `example` (a pure Nix expression
// evaluated in the browser); reference entries (commands) omit it, so they
// render without a Run button.

export const NIX_CHEATSHEET = [
  {
    group: "Values & Types",
    items: [
      { name: "int / float / bool", desc: "Numbers and booleans.", example: "42" },
      { name: "string", desc: "Text in double quotes.", example: "\"hello nix\"" },
      { name: "null", desc: "The absence of a value.", example: "null" },
      { name: "list", desc: "Ordered collection (spaces, not commas).", example: "[ 1 2 3 ]" },
      { name: "attribute set", desc: "Name = value pairs in braces.", example: "{ a = 1; b = 2; }" },
      { name: "attribute access", desc: "Get a value with a dot.", example: "{ a = 1; b = 2; }.b" },
    ],
  },
  {
    group: "let, Strings & Operators",
    items: [
      { name: "let … in", desc: "Bind names, then evaluate.", example: "let x = 2; in x * 3" },
      { name: "interpolation", desc: "Embed expressions in strings.", example: "let n = 7; in \"${builtins.toString n} × 6 = ${builtins.toString (n * 6)}\"" },
      { name: "indented strings", desc: "Multi-line strings with '' … ''.", example: "let who = \"Nix\"; in ''\nHello, ${who}!\n''" },
      { name: "string concat", desc: "+ joins strings.", example: "\"nix\" + \"os\"" },
      { name: "list concat", desc: "++ joins lists.", example: "[ 1 2 ] ++ [ 3 4 ]" },
      { name: "merge", desc: "// merges attrsets (right wins).", example: "{ a = 1; } // { b = 2; }" },
      { name: "equality", desc: "== compares values.", example: "[ 1 2 ] == [ 1 2 ]" },
      { name: "inherit", desc: "Pull names into a set.", example: "let x = 1; in { inherit x; }" },
    ],
  },
  {
    group: "Functions",
    items: [
      { name: "lambda", desc: "arg: body — every function takes one argument.", example: "(x: x + 1) 41" },
      { name: "currying", desc: "N-arg functions are nested lambdas.", example: "(x: y: x + y) 3 4" },
      { name: "destructuring", desc: "Unpack an attrset argument in the signature.", example: "({ name, age }: \"${name} / ${toString age}\") { name = \"Ada\"; age = 36; }" },
      { name: "defaults", desc: "? gives optional arguments a default.", example: "({ name ? \"anon\" }: name) { }" },
      { name: "@-pattern", desc: "Bind the whole arg set while destructuring.", example: "(args@{ name, ... }: args.name) { name = \"Nix\"; }" },
      { name: "if then else", desc: "Conditional expression (else is required).", example: "if 5 > 3 then \"yes\" else \"no\"" },
    ],
  },
  {
    group: "builtins — Collections",
    items: [
      { name: "map", desc: "Apply a function to every element.", example: "builtins.map (x: x * 2) [ 1 2 3 ]" },
      { name: "filter", desc: "Keep elements matching a predicate.", example: "builtins.filter (x: x > 2) [ 1 2 3 4 ]" },
      { name: "foldl'", desc: "Reduce a list to one value.", example: "builtins.foldl' (acc: x: acc + x) 0 [ 1 2 3 ]" },
      { name: "head / tail", desc: "First element / everything after.", example: "builtins.head [ 10 20 30 ]" },
      { name: "length", desc: "Size of a list.", example: "builtins.length [ 1 2 3 ]" },
      { name: "elem", desc: "Membership test.", example: "builtins.elem 2 [ 1 2 3 ]" },
      { name: "attrNames / attrValues", desc: "A set's keys / values.", example: "builtins.attrNames { a = 1; b = 2; }" },
      { name: "concatStringsSep", desc: "Join strings with a separator.", example: "builtins.concatStringsSep \",\" [ \"a\" \"b\" \"c\" ]" },
    ],
  },
  {
    group: "builtins — Inspection",
    items: [
      { name: "typeOf", desc: "The type name of a value.", example: "builtins.typeOf [ 1 2 ]" },
      { name: "isList / isInt / isAttrs", desc: "Type predicates.", example: "builtins.isList [ 1 2 ]" },
      { name: "toString", desc: "Convert a value to a string.", example: "builtins.toString 42" },
      { name: "substring", desc: "Slice a string.", example: "builtins.substring 0 3 \"nixos\"" },
      { name: "assert", desc: "Fail evaluation unless a condition holds.", example: "assert 1 == 1; \"ok\"" },
    ],
  },
  {
    group: "Commands — Flakes",
    items: [
      { name: "nix build", desc: "Build packages.default (or .#foo)." },
      { name: "nix run", desc: "Run apps.default (or .#foo)." },
      { name: "nix develop", desc: "Enter devShells.default (or .#name)." },
      { name: "nix flake show / check", desc: "Inspect outputs / validate the flake." },
      { name: "nix flake update", desc: "Update flake.lock inputs." },
      { name: "nix fmt", desc: "Format all .nix files with the formatter output." },
      { name: "nix shell nixpkgs#pkg", desc: "Enter an ad-hoc shell with a package." },
      { name: "nix store gc", desc: "Garbage-collect unreachable store paths." },
    ],
  },
  {
    group: "Commands — Traditional",
    items: [
      { name: "nix-build", desc: "Build default.nix, result symlinked at ./result." },
      { name: "nix-shell", desc: "Enter shell.nix (or -p for ad-hoc packages)." },
      { name: "nix-channel --update", desc: "Update channels (legacy; prefer flake inputs)." },
      { name: "nix-env -iA nixpkgs.pkg", desc: "Imperatively install into your profile (deprecated)." },
      { name: "nix-collect-garbage", desc: "Classic garbage collection (nix store gc is the modern form)." },
      { name: "nix-store -q --tree ./result", desc: "Show the dependency tree of a build result." },
    ],
  },
];
