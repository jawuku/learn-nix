# Learn Nix: A Comprehensive Curriculum

> **Audience:** Developers with basic command-line experience. No prior Nix or functional programming knowledge assumed.
> **Duration:** ~12 weeks (part-time, 5–10 hours/week) or ~3–4 weeks (full-time intensive).
> **Philosophy:** Learn by doing. Every module includes hands-on exercises. Flakes are treated as the modern default; traditional (`nix-shell`, channels) approaches are taught for understanding and legacy compatibility.

---

## Table of Contents

1. [Module 0: Setup & Motivation](#module-0-setup--motivation)
2. [Module 1: The Nix Language](#module-1-the-nix-language)
3. [Module 2: Derivations & Packaging Fundamentals](#module-2-derivations--packaging-fundamentals)
4. [Module 3: Traditional Approaches — Channels, nix-shell & shell.nix](#module-3-traditional-approaches--channels-nix-shell--shellnix)
5. [Module 4: Nix Flakes — The Modern Standard](#module-4-nix-flakes--the-modern-standard)
6. [Module 5: Development Shells Deep Dive](#module-5-development-shells-deep-dive)
7. [Module 6: Advanced Packaging & Nixpkgs Idioms](#module-6-advanced-packaging--nixpkgs-idioms)
8. [Module 7: The NixOS Module System](#module-7-the-nixos-module-system)
9. [Module 8: Home Manager — Declarative User Environments](#module-8-home-manager--declarative-user-environments)
10. [Module 9: CI/CD, Caching & Nix in Production](#module-9-cicd-caching--nix-in-production)
11. [Module 10: Capstone Projects](#module-10-capstone-projects)
12. [Appendix: Legacy & Deprecated Features](#appendix-legacy--deprecated-features)
13. [Glossary of Nix Terminology](#glossary-of-nix-terminology)
14. [Resources & Further Reading](#resources--further-reading)
15. [Quick Reference: Command Cheat Sheet](#quick-reference-command-cheat-sheet)

---

## Module 0: Setup & Motivation

### What You'll Learn
- What Nix is and why it matters
- Install Nix (multi-user, Determinate Systems installer)
- Enable flakes
- Run your first Nix commands

### Topics

**0.1 – What is Nix?**
- The Nix ecosystem: Nix (package manager), Nixpkgs (package repository), NixOS (Linux distribution), Nix Language (DSL)
- Core promise: Reproducible, declarative, and reliable builds
- Real-world use cases: consistent dev environments, reproducible research, declarative server config

**0.2 – Installation**
- **Recommended:** [Determinate Systems Nix Installer](https://github.com/DeterminateSystems/nix-installer) — `curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install`
- **Alternative:** Official multi-user install — `sh <(curl -L https://nixos.org/nix/install) --daemon`
- Verify: `nix --version`

**0.3 – Enable Flakes**
- Flakes are an experimental feature that has become the de facto standard
- On NixOS: `nix.settings.experimental-features = [ "nix-command" "flakes" ];`
- On standalone Nix: add to `~/.config/nix/nix.conf` or `/etc/nix/nix.conf`:
  ```
  experimental-features = nix-command flakes
  ```
- Or use the Determinate installer which enables them by default

**0.4 – First Commands**
```bash
nix run nixpkgs#hello          # Run hello without installing
nix shell nixpkgs#cowsay       # Enter a shell with cowsay available
nix eval --expr '1 + 2'        # Evaluate a Nix expression
```

### Exercises
1. Install Nix and enable flakes
2. Run `nix run nixpkgs#cowsay -- "Nix is cool!"`
3. Use `nix search nixpkgs <query>` to find a package and run it

---

## Module 1: The Nix Language

### What You'll Learn
- Core Nix language syntax and semantics
- Work with the REPL (`nix repl`)
- Understand laziness, immutability, and functional patterns

### Topics

**1.1 – Basic Data Types**
```nix
# Primitive types
42                  # integer
3.14                # float
true / false        # boolean
"hello"             # string
/run/current-system # path
null                # null

# Compound types
[ 1 2 3 ]           # list
{ a = 1; b = 2; }  # attribute set
```

**1.2 – The REPL (`nix repl`)**
```bash
nix repl
nix-repl> 1 + 2
3
nix-repl> :t 42
an integer
nix-repl> :t { x = 1; }
a set
```

**1.3 – `let ... in` Expressions**
```nix
let
  name = "World";
  greeting = "Hello, ${name}!";
in
greeting  # => "Hello, World!"
```

**1.4 – Attribute Sets**
```nix
# Basic attribute set
{ x = 1; y = 2; }

# Access: set.x or set."x"
# Nested sets
{ a = { b = 42; }; }    # a.b => 42

# ⚠️ Avoid `rec` — use `let ... in` instead
# BAD (can cause infinite recursion):
rec { x = y; y = x; }
# GOOD:
let
  x = y;
  y = 1;
in { inherit x y; }
```

**1.5 – Strings & Interpolation**
```nix
# Single-line
"hello ${name}"

# Multi-line / indented strings (preserve leading whitespace)
''
  line one
  line two
  Hello, ${name}!
''

# String concatenation
"hello " + "world"
```

**1.6 – Functions (Lambdas)**
```nix
# Single argument (all Nix functions take exactly one argument!)
x: x + 1

# Attribute set destructuring (the standard pattern)
{ name, age }: "Name: ${name}, Age: ${toString age}"

# Default values
{ name ? "Anonymous", age ? 0 }: "..."

# Catch-all with @-pattern
args@{ name, age, ... }: "Name: ${args.name}"
```

**1.7 – `with` Expressions (Use Sparingly)**
```nix
# `with` brings attributes into scope — convenient but can obscure where things come from
with pkgs; [ git vim hello ]
# Prefer explicit: [ pkgs.git pkgs.vim pkgs.hello ]
```

**1.8 – `inherit` Keyword**
```nix
let
  x = 1;
  y = 2;
in {
  inherit x y;          # Equivalent to x = x; y = y;
  inherit (pkgs) git;   # Equivalent to git = pkgs.git;
}
```

**1.9 – `import` and File Organization**
```nix
# Import a .nix file (evaluates it)
import ./some-file.nix

# Import with arguments (the file must be a function)
import ./some-file.nix { arg1 = "value"; }
```

**1.10 – Core `builtins`**
```nix
builtins.toString 42       # "42"
builtins.map (x: x * 2) [1 2 3]  # [2 4 6]
builtins.filter (x: x > 2) [1 2 3 4]  # [3 4]
builtins.attrNames { a = 1; b = 2; }  # ["a" "b"]
builtins.attrValues { a = 1; b = 2; } # [1 2]
builtins.foldl' (acc: x: acc + x) 0 [1 2 3]  # 6
```

**1.11 – `nixpkgs.lib` — Your Swiss Army Knife**
```nix
# The lib functions are essential — browse them with:
# https://nixos.org/manual/nixpkgs/stable/#sec-functions-library

lib.lists.unique [1 2 2 3]        # [1 2 3]
lib.attrsets.recursiveUpdate a b   # Deep merge
lib.strings.concatStringsSep ","   # Like JS Array.join
lib.optional condition value        # Returns [value] or []
lib.optionals condition [a b]       # Returns [a b] or []
```

### Exercises
1. Write a Nix expression that generates a greeting for a list of names
2. Implement `map` using `builtins.foldl'`
3. Create a function that merges two attribute sets, giving priority to the second
4. Use `nix repl` to explore `builtins` interactively
5. Write a `let ... in` block that demonstrates variable shadowing and explain the result

---

## Module 2: Derivations & Packaging Fundamentals

### What You'll Learn
- Understand what a derivation is
- Build your first package with `stdenv.mkDerivation`
- Understand build phases
- Fetch sources with hashes

### Topics

**2.1 – What is a Derivation?**
- A derivation describes *how* to build something: source code, build commands, dependencies
- Nix builds derivations in an isolated sandbox — no network access, no filesystem access beyond declared dependencies
- The output is stored in `/nix/store/<hash>-<name>/`

**2.2 – `stdenv.mkDerivation` — The Standard Builder**
```nix
{ stdenv, fetchurl }:

stdenv.mkDerivation {
  pname = "my-program";
  version = "1.0.0";

  src = fetchurl {
    url = "https://example.com/my-program-1.0.0.tar.gz";
    sha256 = "0000000000000000000000000000000000000000000000000000";
  };

  # Build phases (see Section 2.3)
  buildInputs = [ ];    # Build-time dependencies
  nativeBuildInputs = [ ]; # Build tools (compilers, etc.)

  meta = {
    description = "A short description";
    license = stdenv.lib.licenses.mit;
    platforms = stdenv.lib.platforms.all;
  };
}
```

**2.3 – Build Phases (The Standard Build Lifecycle)**

| Phase | Purpose | Hook Points |
|-------|---------|-------------|
| `unpackPhase` | Extract source archive | `preUnpack`, `postUnpack` |
| `patchPhase` | Apply patches | `prePatch`, `postPatch` |
| `configurePhase` | Run `./configure` or similar | `preConfigure`, `postConfigure` |
| `buildPhase` | Run `make` or equivalent | `preBuild`, `postBuild` |
| `checkPhase` | Run tests | `preCheck`, `postCheck` |
| `installPhase` | Copy to `$out` | `preInstall`, `postInstall` |
| `fixupPhase` | Fix library paths, strip binaries | `preFixup`, `postFixup` |
| `installCheckPhase` | Run install-time tests | (same pattern) |
| `distPhase` | Create source distribution | (same pattern) |

**2.4 – The `$out` Variable**
- `$out` is the derivation's output path in the Nix store
- ALL build artifacts must be placed under `$out`
- Never write outside `$out` (the sandbox won't allow it anyway)

```nix
installPhase = ''
  mkdir -p $out/bin
  cp my-program $out/bin/
'';
```

**2.5 – Fetchers**
```nix
# From URL
fetchurl { url = "..."; sha256 = "..."; }

# From GitHub
fetchFromGitHub {
  owner = "user";
  repo = "repo";
  rev = "v1.0.0";
  sha256 = "...";
}

# From a local path (for development)
src = ./.;  # The current directory

# For getting the hash right:
# Set sha256 to lib.fakeSha256 (or 64 zeros), attempt build,
# copy the actual hash from the error message
```

Or skip the build entirely — fetch the hash directly:
```bash
nix-prefetch-url https://example.com/my-program-1.0.0.tar.gz
# => 0abc123...   (paste into fetchurl's sha256)

# Modern alternative (Nix 2.20+): prints an SRI hash
nix store prefetch-file https://example.com/my-program-1.0.0.tar.gz
# => { "hash": "sha256-0abc123...", ... }   (paste into fetchurl's hash)

# Useful flags: --json prints machine-readable output; --unpack hashes the
# unpacked tarball contents (what unpackPhase builds), not the archive file
nix store prefetch-file --json https://example.com/my-program-1.0.0.tar.gz
nix store prefetch-file --unpack https://example.com/my-program-1.0.0.tar.gz

# nix-prefetch-url ships with Nix; nix-prefetch-git is a separate nixpkgs script:
nix shell nixpkgs#nix-prefetch-git          # temporary install
nix-prefetch-git https://github.com/user/repo v1.0.0
# => { "rev": "...", "sha256": "..." }   (paste into fetchFromGitHub)

# Omitting the rev fetches the current HEAD and prints its resolved rev:
nix-prefetch-git https://github.com/user/repo
# => { "rev": "<current HEAD>", "sha256": "..." }
```

**2.6 – Building & Running Your Package**
```bash
# Traditional approach
nix-build -E 'with import <nixpkgs> {}; callPackage ./package.nix {}'
# Result symlinked at ./result

# Flake approach (preview — covered in Module 4)
nix build .#my-package
```

### Exercises
1. Write a `default.nix` that builds a simple shell script (echo "hello") and places it in `$out/bin`
2. Package a small C program from a tarball using `stdenv.mkDerivation`
3. Customize the `installPhase` to *only* install specific files
4. Use `nix log` to inspect the build log of your derivation
5. Prefetch a real tarball with `nix-prefetch-url` (or `nix store prefetch-file`) and a real GitHub repo with `nix-prefetch-git`, then paste the printed hashes into a `fetchurl` / `fetchFromGitHub` and build it

---

## Module 3: Traditional Approaches — Channels, `nix-shell` & `shell.nix`

> **Note:** This module covers "classic Nix" for understanding and legacy compatibility. In new projects, prefer flakes (Module 4).

### What You'll Learn
- How Nix channels work
- Create ad-hoc and declarative development environments with `nix-shell`
- Understand `shell.nix`, `default.nix`, and `release.nix` conventions
- Use `nix-build` to build packages

### Topics

**3.1 – Nix Channels**
```bash
# Channels are mutable pointers to nixpkgs revisions — like package manager "branches"
nix-channel --list
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

⚠️ **Why channels are problematic for reproducibility:** Two users on different machines may have different channel states, producing different builds. This is why flakes pin exact revisions.

**3.2 – The `<nixpkgs>` Lookup Path**
```nix
# Resolves via $NIX_PATH and channels
import <nixpkgs> {}
# ⚠️ Avoid in production — use explicit pinning instead
```

**3.3 – Ad-hoc Shells with `nix-shell`**
```bash
# Bring tools into your PATH temporarily
nix-shell -p python3 git vim

# With specific packages
nix-shell -p 'python3.withPackages (ps: [ ps.numpy ps.requests ])'

# Run a command in the shell
nix-shell -p cowsay --run 'cowsay "Hello Nix"'
```

**3.4 – Declarative Shells: `shell.nix`**
```nix
# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  # Packages available in the shell
  packages = with pkgs; [
    nodejs_20
    git
    ripgrep
  ];

  # Environment variables
  NODE_ENV = "development";

  # Commands to run when entering the shell
  shellHook = ''
    echo "Welcome to the dev environment!"
    echo "Node.js: $(node --version)"
  '';
}
```
```bash
nix-shell              # Enter the environment
nix-shell --run 'node --version'
```

**3.5 – `mkShell` vs `mkShellNoCC`**
```nix
# mkShell: includes a C compiler toolchain (gcc, binutils, etc.)
pkgs.mkShell { ... }

# mkShellNoCC: lighter, no compiler — use for interpreted languages
pkgs.mkShellNoCC { packages = [ pkgs.python3 ]; }
```

**3.6 – `default.nix` Convention**
```nix
# default.nix — the canonical entry point for a Nix package
{ pkgs ? import <nixpkgs> {} }:

pkgs.callPackage ./package.nix {}
```
- `nix-build` automatically looks for `default.nix` and builds it
- With flakes, `default.nix` can serve as a compatibility shim

**3.7 – `nix-build`**
```bash
nix-build                 # Build default.nix -> ./result symlink
nix-build -A foo          # Build the "foo" attribute
nix-build '<nixpkgs>' -A hello  # Build hello from nixpkgs
```

**3.8 – `nix-env` (Deprecated — Mentioned for Completeness)**
```bash
# ⚠️ DEPRECATED: Do not use for new projects
# nix-env mutates a user's profile imperatively, breaking reproducibility
nix-env -iA nixpkgs.hello     # Install hello
nix-env -e hello              # Uninstall
nix-env -q                    # List installed packages

# Prefer instead:
# - nix shell / nix-shell (temporary)
# - nix profile (imperative but flake-compatible)
# - NixOS / home-manager configuration (declarative)
```
> **This is included for historical awareness only. You should NOT use `nix-env` for package management.** See [Appendix](#appendix-legacy--deprecated-features) for more deprecated features.

### Exercises
1. Create a `shell.nix` for a Python project with `requests` and `pytest`
2. Use `shellHook` to print available tools and their versions
3. Build a package from nixpkgs using `nix-build '<nixpkgs>' -A <pkg>`
4. Convert a `shell.nix` to use explicit `pkgs` import instead of `<nixpkgs>`

---

## Module 4: Nix Flakes — The Modern Standard

### What You'll Learn
- Understand what flakes are and why they exist
- Create a `flake.nix` from scratch
- Use `nix run`, `nix build`, `nix develop`
- Manage flake inputs and `follows`
- Use `flake-utils` for system-agnostic outputs

### Topics

**4.1 – What are Flakes?**
- A standard for composing Nix projects with **locked dependencies** (`flake.lock`)
- Self-contained: the `flake.nix` + git repo = everything needed to build
- Hermetic (pure) evaluation: no `$NIX_PATH`, no channels, no host impurity
- Standard output schema: `packages`, `apps`, `devShells`, `formatter`, etc.

**4.2 – Anatomy of a `flake.nix`**
```nix
{
  description = "My Nix project";

  # Inputs — dependencies
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  # Outputs — what this flake provides
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = {
          default = pkgs.hello;        # nix build
          my-app = pkgs.callPackage ./package.nix {};
        };

        apps.default = {               # nix run
          type = "app";
          program = "${pkgs.hello}/bin/hello";
        };

        devShells.default = pkgs.mkShell {  # nix develop
          packages = with pkgs; [ git nodejs_20 ];
        };

        formatter = pkgs.nixpkgs-fmt;  # nix fmt
      }
    );
}
```

**4.3 – Flake Commands**
```bash
nix flake init           # Create a template flake.nix
nix flake show           # Show all outputs
nix flake metadata       # Show inputs and their revisions
nix flake check          # Validate the flake
nix flake update         # Update flake.lock
nix flake lock           # Create/update flake.lock without building

nix build                # Build packages.default
nix build .#my-app       # Build a specific package
nix run                  # Run apps.default
nix run .#my-app         # Run a specific app

nix develop              # Enter devShells.default
nix develop .#python     # Enter a specific dev shell

nix fmt                  # Format all .nix files
```

**4.4 – `flake.lock` — The Dependency Lockfile**
- Automatically generated, **should be committed to git**
- Pins exact git revisions and nar hashes of all inputs
- Guarantees byte-for-byte identical builds across machines
- Updated with `nix flake update` or `nix flake lock`

**4.5 – Input Management & `follows`**
```nix
inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  home-manager = {
    url = "github:nix-community/home-manager";
    # home-manager also depends on nixpkgs — make it use the same revision:
    inputs.nixpkgs.follows = "nixpkgs";
  };
};
```
This avoids multiple versions of `nixpkgs` being pulled in (wasteful and potentially conflicting).

**4.6 – `flake-utils` — System-Agnostic Outputs**
```nix
# Without flake-utils — you must handle systems manually:
outputs = { self, nixpkgs }: {
  packages.x86_64-linux.default = ...;
  packages.aarch64-linux.default = ...;
  packages.x86_64-darwin.default = ...;
  # ... tedious!
};

# With flake-utils — eachDefaultSystem handles this:
outputs = { self, nixpkgs, flake-utils }:
  flake-utils.lib.eachDefaultSystem (system: {
    packages.default = ...;  # Built for every default system
  });
```

**4.7 – Pure vs Impure Evaluation**
```bash
# Pure (default for flakes): no network, no file access outside repo
nix build

# Impure (when needed): allows reading arbitrary files
nix build --impure
```

**4.8 – Flake Templates**
```bash
nix flake init -t github:some-user/some-flake
nix flake init -t templates#python     # Built-in template
nix flake show templates               # See all built-in templates
```

**4.9 – Handling Non-Flake Dependencies**
- If a flake input is a non-flake repo, use `flake = false`:
```nix
inputs = {
  some-old-thing = {
    url = "github:user/old-repo";
    flake = false;
  };
};
```

**4.10 – Compatibility: Flake + Classic Hybrid**
```nix
# You can maintain a default.nix that calls into your flake:
# This lets non-flake users build your project too
{ system ? builtins.currentSystem }:
let
  flake-compat = builtins.fetchTarball {
    url = "https://github.com/edolstra/flake-compat/archive/master.tar.gz";
    sha256 = "...";
  };
in
  (import flake-compat { src = ./.; }).defaultNix.${system}
```

### Exercises
1. Run `nix flake init` in a new directory and examine the generated `flake.nix`
2. Create a flake that provides a `devShell` with `python3`, `nodejs`, and `git`
3. Add `home-manager` as a flake input with `follows`
4. Build and run a package from your flake using `nix build` and `nix run`
5. Use `nix flake show` to inspect an open-source flake (e.g., `github:nix-community/home-manager`)

---

## Module 5: Development Shells Deep Dive

### What You'll Learn
- Master both flake-based (`devShells`) and traditional (`mkShell`) dev environments
- Integrate with `direnv` for automatic shell activation
- Manage language-specific environments (Python, Node.js, Rust, Go)
- Multi-shell setups for monorepos
- Advanced `shellHook` patterns

### Topics

**5.1 – The `packages` Attribute vs `buildInputs`**
```nix
# In mkShell, `packages` is an alias for `nativeBuildInputs`
# They behave identically — use whichever reads clearer:
pkgs.mkShell {
  packages = with pkgs; [ git nodejs ];      # Preferred (semantic)
  # buildInputs = with pkgs; [ git nodejs ]; # Equivalent
}
```

**5.2 – Language-Specific Development Shells**

**Python:**
```nix
pkgs.mkShell {
  packages = [
    (pkgs.python3.withPackages (ps: with ps; [
      numpy
      pandas
      requests
      pytest
      black
      mypy
    ]))
  ];
}
```

**Node.js:**
```nix
pkgs.mkShell {
  packages = with pkgs; [
    nodejs_22
    yarn        # or pnpm, or just use corepack
  ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
    npm install  # auto-install deps (optional)
  '';
}
```

**Rust:**
```nix
pkgs.mkShell {
  packages = with pkgs; [
    rustc
    cargo
    rust-analyzer
    rustfmt
    clippy
  ];
  # Use fenix for specific Rust toolchains (see advanced section)
}
```

**Go:**
```nix
pkgs.mkShell {
  packages = with pkgs; [
    go_1_23
    gopls
    gotools
    golangci-lint
  ];
}
```

**5.3 – `shellHook` Patterns**
```nix
pkgs.mkShell {
  shellHook = ''
    # Print welcome message
    echo "🔧 Development environment activated!"

    # Set up project-specific aliases
    alias build="nix build"
    alias test="pytest -v"
    alias fmt="nix fmt && black ."

    # Source project-specific env
    source .env 2>/dev/null || true

    # Auto-activate virtual environment (python)
    if [ -d .venv ]; then
      source .venv/bin/activate
    fi
  '';
}
```

**5.4 – `direnv` + `nix-direnv` Integration**
```bash
# Install direnv and nix-direnv
nix profile install nixpkgs#direnv
# Add to ~/.config/direnv/direnvrc (or use home-manager)

# In your project directory:
echo "use flake" > .envrc   # For flake projects
# or:
echo "use nix" > .envrc     # For shell.nix / default.nix projects

direnv allow
# Now the Nix environment auto-loads when you cd into the project!
```
- Benefit: No need to manually run `nix develop` — it's automatic
- Combined with flakes, this is the ideal developer experience

**5.5 – Multiple Dev Shells in One Flake**
```nix
devShells = {
  default = pkgs.mkShell { packages = with pkgs; [ git nodejs_22 ]; };
  python = pkgs.mkShell { packages = with pkgs; [ python3 poetry ]; };
  rust = pkgs.mkShell { packages = with pkgs; [ rustc cargo ]; };
  full = pkgs.mkShell {
    # Combines all tools
    inputsFrom = with self.devShells.${system}; [ default python rust ];
  };
};
```
```bash
nix develop          # default
nix develop .#python # python
nix develop .#rust   # rust
nix develop .#full   # everything
```

**5.6 – `inputsFrom` — Composing Shells**
```nix
# Reuse packages and hooks from another shell
pkgs.mkShell {
  inputsFrom = [
    pkgs.nodejs  # inherit all of nodejs's build inputs
  ];
  packages = [ pkgs.git ]; # additional, project-specific tools
}
```

**5.7 – Using Local Packages in Dev Shells**
```nix
devShells.default = pkgs.mkShell {
  # Your project's own package becomes available
  inputsFrom = [ self.packages.${system}.my-app ];
  packages = with pkgs; [ just entr ];  # task runner, file watcher
};
```

### Exercises
1. Create a flake with `devShells` for three different languages
2. Set up `direnv` with `nix-direnv` and verify auto-activation works
3. Write a `shellHook` that prints available tools, their versions, and sets up project aliases
4. Create a monorepo-style flake with separate shells for `frontend/` and `backend/`
5. Use `inputsFrom` to compose a "full" dev shell from language-specific ones

---

## Module 6: Advanced Packaging & Nixpkgs Idioms

### What You'll Learn
- `callPackage` pattern deep dive
- Overriding and customizing packages (`override`, `overrideAttrs`)
- Overlays — globally modifying package sets
- Cross-compilation
- Language-specific packaging (Python, Node, Rust, Go)
- Build hooks and `setup-hooks`
- FHS environments (`buildFHSEnv` / `buildFHSEnvBubblewrap`) — running binary-only software

### Topics

**6.1 – The `callPackage` Pattern**
```nix
# package.nix
{ stdenv, fetchFromGitHub, cmake, pkg-config, openssl }:

stdenv.mkDerivation {
  pname = "my-app";
  version = "1.0";
  src = fetchFromGitHub { ... };
  nativeBuildInputs = [ cmake pkg-config ];
  buildInputs = [ openssl ];
}

# default.nix or flake output:
# callPackage reads the function arguments and auto-injects matching attributes from pkgs
finalAttrs: pkgs.callPackage ./package.nix {}
# Any arguments NOT in pkgs can be passed in the {} second argument
```

**6.2 – `override` vs `overrideAttrs`**
```nix
# override — change function arguments (before evaluation)
pkgs.hello.override { withPerl = false; }

# overrideAttrs — change derivation attributes (after evaluation)
pkgs.hello.overrideAttrs (oldAttrs: {
  pname = "hello-custom";
  buildInputs = oldAttrs.buildInputs ++ [ pkgs.curl ];
  patches = oldAttrs.patches or [] ++ [ ./my-patch.patch ];
})

# Common pattern: creating a variant of a package
myVim = pkgs.vim.overrideAttrs (old: {
  buildInputs = old.buildInputs or [] ++ [ pkgs.python3 ];
})
```

**6.3 – Overlays — Global Package Modifications**
```nix
# Overlays modify the package set, affecting all consumers
# ~/.config/nixpkgs/overlays/my-overlay.nix
final: prev: {
  # Add a new package
  my-hello = final.callPackage ./my-hello.nix {};

  # Override an existing package globally
  vim = prev.vim.overrideAttrs (old: {
    # customization...
  });

  # Patch all Python packages (advanced)
  python3 = prev.python3.override {
    packageOverrides = pyFinal: pyPrev: {
      requests = pyPrev.requests.overrideAttrs (old: {
        patches = old.patches or [] ++ [ ./requests-fix.patch ];
      });
    };
  };
}
```
```bash
# Apply an overlay:
# Via NixOS: nixpkgs.overlays = [ (import ./my-overlay.nix) ];
# Via flake: overlay = final: prev: { ... };
```

**6.4 – Build Hooks & `setup-hooks`**
```nix
# Common hooks (sourced automatically by mkDerivation):
preConfigure = "echo 'About to configure'";
postInstall = "echo 'Done installing'";

# setup-hook: a script that sets up an environment for a dependency
# Example: pkg-config's setup-hook adds PKG_CONFIG_PATH automatically
# You can create custom setup hooks to propagate env vars, flags, etc.
```

**6.5 – Language-Specific Builders (Beyond `mkDerivation`)**

| Language | Builder | Notes |
|----------|---------|-------|
| Python   | `python3Packages.buildPythonApplication` / `buildPythonPackage` | Handles pip, setuptools, wheels |
| Node.js  | `buildNpmPackage`, `buildYarnPackage` | Fetches deps via `npmDepsHash` / `yarnNix` |
| Rust     | `buildRustPackage` | Uses `cargoSha256` for vendor deps |
| Go       | `buildGoModule` | Uses `vendorHash` for go modules |
| Haskell  | `haskellPackages.callCabal2nix` | Cabal-based builds |
| Emacs    | `emacsPackages.trivialBuild` | Emacs Lisp packages |

**Example — Rust package:**
```nix
{ rustPlatform, fetchFromGitHub }:
rustPlatform.buildRustPackage {
  pname = "my-rust-cli";
  version = "0.1.0";
  src = fetchFromGitHub { ... };
  cargoSha256 = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  # Or use cargoLock.lockFile = ./Cargo.lock; for workspace projects
}
```

**Example — Python package:**
```nix
{ buildPythonPackage, fetchPypi, requests, pytest }:
buildPythonPackage rec {
  pname = "my-python-pkg";
  version = "0.1";
  src = fetchPypi {
    inherit pname version;
    sha256 = "...";
  };
  propagatedBuildInputs = [ requests ];
  nativeCheckInputs = [ pytest ];
}
```

**6.6 – Cross-Compilation**
```nix
# Build for a different architecture
nix build .#packages.aarch64-linux.my-app

# In a flake, declare cross-compilation support:
packages = {
  default = pkgs.callPackage ./package.nix {};
  # pkgsCross provides cross-compilation toolchains
  for-arm = pkgs.pkgsCross.aarch64-multiplatform.callPackage ./package.nix {};
};
```

**6.7 – FHS Environments: `buildFHSEnv` & `buildFHSEnvBubblewrap`**
> Nix has no `/usr`, `/lib` or `/etc` — everything lives in `/nix/store`. Software that assumes a standard Linux layout (npm packages with prebuilt native binaries, installers, hardcoded `/usr` paths) breaks on NixOS. An FHS environment wraps such software in a synthetic, standard filesystem.

```nix
# A synthetic /usr, /lib and /etc populated from your packages
pkgs.buildFHSEnvBubblewrap {
  name = "fhs";
  targetPkgs = p: with p; [ git nodejs_22 cacert ];
  runScript = "bash";
}
```

- `buildFHSEnv` — the modern alias (bubblewrap-based, no root)
- `buildFHSEnvBubblewrap` — bubblewrap + user namespaces, **no root required** (the modern default)
- `buildFHSEnvChroot` — chroot-based, **requires root**
- `buildFHSUserEnv` — the legacy name you'll see in older code
- Expose the environment as `packages.default` so `nix run` enters it; on NixOS, add it to `environment.systemPackages`
- `targetPkgs` (packages for the host arch), `multiPkgs` (multi-arch, e.g. 32-bit libs), `profile` (env vars sourced on entry), `runScript` (entry command)
- **Under the hood:** the derivation's output is a wrapper script plus a **symlink farm** — `/usr/bin/git` is just a symlink into `/nix/store`. At runtime the wrapper launches `bwrap` with `/nix/store` bound read-only and the farm mounted as a real `/usr` (`/bin`, `/sbin`, `/lib`, `/lib64` aliased via `--symlink`), then runs `runScript` inside the private namespace; `buildFHSEnvChroot` does the same with a root-requiring `chroot`
- Real-world example: [freebuff-nix](https://github.com/jawuku/freebuff-nix) — an FHS environment wrapping an npm CLI (`npx freebuff`) for NixOS

### Exercises
1. Write a `callPackage`-compatible package for a small C program
2. Use `overrideAttrs` to create a variant of an existing nixpkgs package
3. Create an overlay that modifies `vim` or `neovim` configuration globally
4. Package a Rust CLI tool using `buildRustPackage`
5. Package a Python library with `buildPythonPackage` and add a test dependency
6. Wrap an npm CLI that ships prebuilt binaries in a `buildFHSEnvBubblewrap` flake output and run it on NixOS (Linux-only — on macOS, follow along on a Linux box/VM)

---

## Module 7: The NixOS Module System

### What You'll Learn
- Understanding the module system (even if you don't run NixOS)
- Options, types, and the merging algorithm
- Writing custom modules with `mkOption` and `mkEnableOption`
- Conditional configuration with `mkIf` and `mkMerge`
- Module composition and imports

### Topics

**7.1 – What is the Module System?**
- A framework for declaring and merging system configuration
- Used by NixOS, Home Manager, nix-darwin, and many projects
- Key features: type-checked options, lazy evaluation, merge strategies

**7.2 – Anatomy of a Module**
```nix
{ config, lib, pkgs, ... }:

let
  cfg = config.services.myService;
in
{
  # 1. Imports — compose other modules
  imports = [
    ./some-other-module.nix
  ];

  # 2. Options — declare what users can configure
  options.services.myService = {
    enable = lib.mkEnableOption "my service";

    port = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      description = "Port to listen on";
    };

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.myService;
    };
  };

  # 3. Config — what gets activated when options are set
  config = lib.mkIf cfg.enable {
    systemd.services.myService = {
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${cfg.package}/bin/my-service --port ${toString cfg.port}";
    };

    environment.systemPackages = [ cfg.package ];
  };
}
```

**7.3 – Common Option Types**
```nix
lib.types.bool
lib.types.int
lib.types.str
lib.types.path
lib.types.package
lib.types.port                      # 0–65535
lib.types.enum [ "a" "b" "c" ]
lib.types.listOf lib.types.str
lib.types.attrsOf lib.types.str
lib.types.nullOr lib.types.str
lib.types.oneOf [ lib.types.str lib.types.int ]
lib.types.submodule { ... }        # Nested module
lib.types.submoduleWith { ... }    # Specializable submodule
```

**7.4 – `mkIf`, `mkMerge`, `mkDefault`, `mkForce`**
```nix
# mkIf — conditional config
config = lib.mkIf cfg.enable { ... };

# mkMerge — combine multiple conditional blocks
config = lib.mkMerge [
  (lib.mkIf cfg.enable { systemd.services.x = ...; })
  (lib.mkIf cfg.advanced { systemd.services.x.extraConfig = ...; })
];

# Priority system (higher numbers = lower priority):
# mkDefault (1000) < normal (100) < mkForce (50) < mkOverride N
# Use mkDefault for sensible defaults users can override easily
```

**7.5 – Module Composition & Imports**
```nix
# Modules can import other modules, building complex configurations
{
  imports = [
    ./hardware-configuration.nix
    ./networking.nix
    ./services/nginx.nix
    ./services/postgresql.nix
    home-manager.nixosModules.home-manager
  ];
}
```

**7.6 – The Module System Without NixOS**
```nix
# You can use the module system for any configuration problem:
{ lib, ... }:
let
  eval = lib.evalModules {
    modules = [
      # Your modules here
      ./my-module.nix
      { services.myService.enable = true; }
    ];
  };
in
  eval.config.services.myService.port  # => 8080 (or whatever was set)
```

### Exercises
1. Write a reusable NixOS-style module for a hypothetical web service
2. Use `lib.evalModules` to test your module without running NixOS
3. Create a module with submodule options (e.g., `users.*.name`)
4. Use `mkMerge` to combine conditional configuration blocks
5. Study the nginx module in nixpkgs (`nixpkgs/nixos/modules/services/web-servers/nginx/`)

---

## Module 8: Home Manager — Declarative User Environments

### What You'll Learn
- Install and configure Home Manager (standalone and as a NixOS module)
- Manage user packages declaratively
- Configure programs (git, shells, editors, terminals)
- Manage dotfiles the Nix way
- User-level systemd services

### Topics

**8.1 – Installation Methods**

**Standalone (non-NixOS, including macOS):**
```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, home-manager, ... }: {
    homeConfigurations."myuser" = home-manager.lib.homeManagerConfiguration {
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      modules = [ ./home.nix ];
    };
  };
}
```
```bash
home-manager switch --flake .#myuser
```

**As a NixOS Module:**
```nix
# In your NixOS configuration.nix:
{
  home-manager.users.myuser = import ./home.nix;
}
```

**8.2 – `home.nix` — Basic Configuration**
```nix
{ config, pkgs, lib, ... }:

{
  home.username = "myuser";
  home.homeDirectory = "/home/myuser";
  home.stateVersion = "24.11";  # Pin for reproducibility

  # User packages
  home.packages = with pkgs; [
    ripgrep
    fd
    jq
    httpie
    bat
    eza
    fzf
  ];

  # Programs that are always in PATH (lightweight)
  home.sessionPath = [ "$HOME/.local/bin" ];

  # Environment variables
  home.sessionVariables = {
    EDITOR = "nvim";
    TERMINAL = "alacritty";
  };
}
```

**8.3 – Program Configuration (Declarative Dotfiles)**
```nix
# Git
programs.git = {
  enable = true;
  userName = "Your Name";
  userEmail = "you@example.com";
  extraConfig = {
    init.defaultBranch = "main";
    push.autoSetupRemote = true;
  };
};

# Shell (zsh)
programs.zsh = {
  enable = true;
  oh-my-zsh = {
    enable = true;
    plugins = [ "git" "docker" "kubectl" ];
  };
  initExtra = ''
    # Custom zsh config
    bindkey '^R' history-incremental-search-backward
  '';
};

# Neovim
programs.neovim = {
  enable = true;
  viAlias = true;
  vimAlias = true;
};

# Starship prompt
programs.starship = {
  enable = true;
  settings = {
    # TOML-like configuration for the prompt
    add_newline = false;
  };
};
```

**8.4 – User-Level Systemd Services**
```nix
systemd.user.services.my-backup = {
  Unit.Description = "My backup service";
  Service.ExecStart = "${pkgs.rsync}/bin/rsync -av /source /dest";
  Install.WantedBy = [ "default.target" ];
};

systemd.user.timers.my-backup = {
  Unit.Description = "Run backup hourly";
  Timer.OnCalendar = "hourly";
  Install.WantedBy = [ "timers.target" ];
};
```

**8.5 – File Management (Dotfiles via Home Manager)**
```nix
home.file = {
  # Symlink a file from config directory
  ".config/alacritty/alacritty.toml".source = ./alacritty.toml;

  # Write content directly
  ".config/git/ignore".text = ''
    .direnv/
    .envrc
    result
  '';

  # Recursive directory linking
  ".config/nvim".source = config.lib.file.mkOutOfStoreSymlink ./nvim;
};
```

**8.6 – `home-manager` CLI**
```bash
home-manager switch    # Build and activate
home-manager build     # Build only
home-manager generations  # List generations
home-manager expire-generations 30d  # Clean old generations
```

### Exercises
1. Install Home Manager standalone and create a `home.nix` with git, zsh, and Starship
2. Configure Neovim entirely through Home Manager
3. Create a user systemd timer service that runs a script daily
4. Migrate 3 existing dotfiles to Home Manager's `home.file` (or program modules)
5. Set up Home Manager as a NixOS module (if running NixOS)

---

## Module 9: CI/CD, Caching & Nix in Production

### What You'll Learn
- Set up GitHub Actions for Nix projects
- Use binary caches (Cachix, FlakeHub Cache) to avoid redundant builds
- Auto-update flake inputs
- Nix in Docker
- Build and deploy Nix-built artifacts

### Topics

**9.1 – GitHub Actions for Nix**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: DeterminateSystems/nix-installer-action@main
      - uses: DeterminateSystems/magic-nix-cache-action@main

      - run: nix flake check
      - run: nix build
      - run: nix develop --command echo "Dev shell works"
```

**9.2 – Binary Caching with Cachix**
```bash
# Install Cachix
nix profile install nixpkgs#cachix

# Authenticate
cachix authtoken <token>

# Create/use a cache
cachix use my-cache

# Push builds to the cache
nix build | cachix push my-cache

# In CI (GitHub Actions):
# - uses: cachix/cachix-action@v14
#   with:
#     name: my-cache
#     authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'
```

**9.3 – Auto-Update Flake Inputs**
```yaml
# .github/workflows/update-flake.yml
name: Update Flake
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: DeterminateSystems/nix-installer-action@main
      - uses: DeterminateSystems/update-flake-lock@main
        with:
          pr-title: "chore: update flake.lock"
```

**9.4 – Nix in Docker**
```nix
# Build a minimal Docker image from a Nix package
{ pkgs, dockerTools, myApp }:

dockerTools.buildLayeredImage {
  name = "my-app";
  tag = "latest";
  contents = [ myApp pkgs.cacert ];
  config = {
    Cmd = [ "${myApp}/bin/my-app" ];
    ExposedPorts = { "8080/tcp" = {}; };
  };
}
```
```bash
nix build .#docker
docker load < result
docker run my-app
```

**9.5 – `nix copy` & Remote Stores**
```bash
# Copy a closure to another machine
nix copy --to ssh://user@host /nix/store/...-my-package

# Copy to a binary cache
nix copy --to s3://my-bucket?region=us-east-1 ./result

# Copy between stores
nix copy --from https://cache.nixos.org /nix/store/...-hello
```

**9.6 – Building Statically Linked Binaries**
```nix
# For fully static Go/Rust binaries (great for Docker FROM scratch):
pkgs.pkgsStatic.callPackage ./my-app.nix {}

# Or for mkDerivation:
stdenv.mkDerivation {
  # ...
  NIX_CFLAGS_COMPILE = "-static";
  configureFlags = [ "--enable-static" "--disable-shared" ];
}
```

### Exercises
1. Set up a GitHub Actions workflow that runs `nix flake check` on every push
2. Create a Cachix cache and push builds to it
3. Build a Docker image from a Nix package using `dockerTools`
4. Write a flake that cross-compiles a Go binary for both `x86_64-linux` and `aarch64-linux`
5. Set up `update-flake-lock` action to automatically PR flake updates

---

## Module 10: Capstone Projects

### What You'll Learn
- Integrate everything into real-world projects

### Project Ideas

**10.1 – Project: Personal Development Environment Flake**
- Create a monorepo-style flake with:
  - `devShells` for Python, Node.js, Rust, and a "full" shell
  - `formatter` (nixpkgs-fmt, alejandra, or nixfmt-rfc-style)
  - `packages` for any custom tools you've built
  - `direnv` integration
  - A companion `home.nix` or NixOS module that installs your preferred tools

**10.2 – Project: Package Something from Source**
- Choose a small open-source tool not yet in nixpkgs
- Package it with `stdenv.mkDerivation` (or the language-specific builder)
- Add patches if needed
- Optionally: contribute it to nixpkgs!

**10.3 – Project: NixOS or Home Manager Configuration**
If running NixOS, nix-darwin, or Home Manager:
- Refactor your configuration into modules
- Use flakes to pin everything
- Set up CI to test your configuration builds
- Share it as a public dotfiles repo

**10.4 – Project: Containerized Application with Nix**
- Build a web service (any language)
- Package it with Nix
- Create a minimal Docker image
- Set up CI that builds, caches, and publishes the image

**10.5 – Project: Nix Library or Overlay**
- Create a flake that provides a useful overlay or library
- Example: a set of `lib` functions, or an overlay that patches common packages
- Publish it on GitHub for others to use as a flake input

---

## Appendix: Legacy & Deprecated Features

> These are included for **historical awareness and reading legacy code only**. Do NOT use them in new projects.

### `nix-env` (Imperative Package Management)
```bash
nix-env -iA nixpkgs.hello    # Install (MUTATES user profile)
nix-env -e hello             # Remove
nix-env -q                   # List
```
**Why deprecated:** Imperative, non-reproducible, no lockfiles. Use `nix profile` (imperative but flake-compatible), `nix shell` (temporary), or declarative config instead.

### `nix-channel` (Mutable Channels)
```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```
**Why deprecated:** Channels are mutable — `nix-channel --update` gives you a different nixpkgs revision depending on when you run it. Flakes and `flake.lock` solve this.

### `<nixpkgs>` Angle-Bracket Paths
```nix
import <nixpkgs> {}
```
**Why deprecated:** Relies on `$NIX_PATH` environment variable, which varies across machines. Use explicit inputs in flakes instead.

### `nix-shell` Shebang (`#!`)
```bash
#! /usr/bin/env nix-shell
#! nix-shell -i bash -p python3
```
**Status:** Still works but consider using `nix run` or a flake-based approach for scripts. The shebang approach is actually one of the few remaining reasonable uses of `nix-shell`.

### `fetchGit` / `fetchTarball` Without Hashes
```nix
builtins.fetchGit { url = "..."; }  # No rev/sha — impure!
```
**Why deprecated:** Without a hash or revision, this fetches the latest commit, breaking reproducibility.

### `builtins.currentSystem`
```nix
if builtins.currentSystem == "x86_64-linux" then ... else ...
```
**Why avoided in flakes:** Flakes require explicit system parameters for cross-compilation support. Use `system` from flake outputs instead.

---

## Glossary of Nix Terminology

> **How to use this glossary:** Nix has a rich vocabulary of domain-specific terms. Refer back here whenever you encounter an unfamiliar term. Terms in **bold** within definitions are themselves defined elsewhere in the glossary.

---

### A

**attribute** — A key-value pair inside an **attribute set**. E.g., `name = "hello";` is an attribute. The key (`name`) and value (`"hello"`).

**attribute set** — The primary composite data structure in the Nix language. A collection of attributes, like a dictionary or JSON object: `{ x = 1; y = 2; }`. Attribute sets are how packages, configurations, and modules are structured.

---

### B

**binary cache** — A remote store (typically HTTP) that serves pre-built **substitutes** (`.nar` archives) for **store paths**. Examples: `cache.nixos.org` (the official global cache), Cachix (user-managed caches), FlakeHub Cache. Using a binary cache avoids compiling packages locally.

**bubblewrap** — A Linux sandboxing tool (its binary is `bwrap`) that uses user namespaces to create isolated filesystems without root. `buildFHSEnvBubblewrap` invokes it at runtime to mount the synthetic FHS. See **FHS environment**.

**builder** — The program executed within the Nix **sandbox** to perform the build. Typically `bash` (via `stdenv`), but can be any executable. Also refers to language-specific wrappers like `buildRustPackage` or `buildPythonPackage`.

**buildInputs** — Runtime dependencies of a **derivation** — libraries and programs that the built package *links against* or needs at runtime. In nixpkgs cross-compilation, these are dependencies for the *target* platform.

**builtins** — Functions built into the Nix language interpreter itself (not implemented in Nix). Accessed via `builtins.` prefix. Examples: `builtins.map`, `builtins.fetchurl`, `builtins.derivation`.

---

### C

**callPackage** — A nixpkgs function (`pkgs.callPackage`) that auto-injects dependencies into a function. It reads a function's argument names and supplies matching values from the `pkgs` attribute set. This is the standard way to compose packages in nixpkgs.

**channel** — A mutable URL pointer to a specific branch of `nixpkgs` (e.g., `nixpkgs-unstable`, `nixos-24.11`). Managed with `nix-channel`. **Deprecated in favour of flakes** (which pin exact revisions via `flake.lock`).

**closure** — The complete, transitive set of **store paths** that a given store path depends on, including itself. "Runtime closure" refers to what's needed to *run* the program; "build closure" refers to what's needed to *build* it. You can inspect a closure with `nix path-info -r ./result`.

**content-addressed** — A storage model where store path names are computed from the cryptographic hash of their *output contents* (as opposed to **input-addressed**, where the hash is computed from the derivation's inputs). Content-addressing enables early cutoff optimisation and better deduplication. Currently experimental.

**cross-compilation** — Building a derivation on one platform (the *build* platform) targeting a different platform (the *host* platform). Nixpkgs supports cross-compilation through `pkgsCross` and explicit system parameters.

---

### D

**default.nix** — Convention: the canonical entry point for a Nix package or project. When you run `nix-build` (classic) or `nix build` (flake) without arguments, it looks for `default.nix`. In flake projects, this often serves as a compatibility shim for non-flake consumers.

**derivation (`.drv` file)** — A low-level build recipe. A `.drv` file (stored in `/nix/store`) specifies: the builder executable, its arguments, environment variables, and all inputs. A derivation is what Nix evaluates from a `mkDerivation` call. The `.drv` file itself can be built ("realised") to produce the actual output.

**devShell** — A flake output attribute (`devShells.<system>.<name>`) that defines a development environment. Enter it with `nix develop`. Equivalent to the classic `mkShell` + `nix-shell` pattern, but integrated into the flake schema.

**direnv** — A shell extension that automatically loads/unloads environment variables when entering/leaving a directory. Combined with `nix-direnv`, it auto-activates Nix development shells. See Module 5.

**drv file** — See **derivation**.

---

### E

**evaluation** — The process of computing a Nix expression's value without building anything. Nix is *lazily evaluated*: expressions are only computed when their value is needed. `nix eval` evaluates and prints the result; `nix build` evaluates, then builds.

**experimental features** — Features of Nix that are not yet considered stable but are widely used. Must be explicitly enabled in `nix.conf` or via CLI flags. Flakes (`"flakes"`) and the new CLI (`"nix-command"`) are the most prominent examples.

---

### F

**fetcher** — A function (built-in or from nixpkgs) that downloads source code and places it in the **Nix store** with a content-verified hash. Examples: `fetchurl`, `fetchFromGitHub`, `fetchgit`, `fetchTarball`.

**fixed-output derivation (FOD)** — A derivation whose output hash is *pre-declared* in advance. Because Nix knows what hash to expect, FODs are allowed network access during the build (unlike normal derivations). Used for source fetchers (`fetchurl`, etc.) to download tarballs.

**FHS environment** — A derivation built by `buildFHSEnv` / `buildFHSEnvBubblewrap` that presents a synthetic standard Linux filesystem (`/usr`, `/lib`, `/etc`) populated from declared packages, so software that assumes the FHS (prebuilt native binaries, installers) runs unmodified. Linux-only; the bubblewrap variant needs no root. See Module 6.

**flake** — A self-contained, standardised Nix project defined by a `flake.nix` file. Flakes have declared `inputs` (with pinned versions in `flake.lock`) and standardised `outputs` (`packages`, `devShells`, `apps`, etc.). They enable hermetic evaluation and reproducible builds across machines.

**flake-compat** — A shim library (`github:edolstra/flake-compat`) that lets non-flake Nix users consume a flake by importing a `default.nix` that wraps the flake. See Module 4.10.

**`flake.lock`** — The auto-generated lockfile for a flake. Pins exact Git revisions and **nar** hashes of all inputs. Should be committed to version control to guarantee reproducible builds.

**flake-utils** — A popular helper library (`github:numtide/flake-utils`) that simplifies writing system-agnostic flake outputs via `eachDefaultSystem` and similar functions.

**`follows`** — A directive in flake `inputs` that tells Nix to use the *same* revision of a dependency as another input. Example: `inputs.nixpkgs.follows = "nixpkgs";` in `home-manager`'s input def — prevents pulling in two different `nixpkgs` revisions.

---

### G

**garbage collection (GC)** — The process of deleting **store paths** that are no longer reachable from any **GC root**. Run with `nix store gc` or `nix-collect-garbage`. Without GC, the Nix store grows indefinitely as builds accumulate.

**garbage collection root (GC root)** — A symlink in `/nix/var/nix/gcroots/` (or a profile or system link) that "pins" a store path, preventing it from being garbage-collected. Every time you use `nix build`, the `./result` symlink acts as a GC root.

**generation** — A numbered, immutable snapshot in a Nix **profile**. Each time a profile is updated (e.g., `home-manager switch`, `nix profile install`), a new generation is created. Old generations enable instant rollback. View with `nix profile history` or `home-manager generations`.

---

### H

**hermetic build** — A build that is isolated from the host system: no network access, no access to files outside declared inputs, no dependency on environment variables or timestamps. Nix enforces hermeticity through its **sandbox**. Flakes extend hermeticity to the evaluation phase as well.

**Home Manager** — A Nix-based tool for declaratively managing a user's home directory: packages, dotfiles, environment variables, and user-level systemd services. Available standalone or as a NixOS module.

**hook** — A shell fragment that runs at a specific point in the standard build lifecycle. Phase hooks like `preBuild`, `postInstall`, etc. See also **setup hook**.

---

### I

**impure** — An expression or build that depends on or accesses state outside its declared inputs (filesystem paths, network, environment variables, time). Nix strives for purity; the **sandbox** blocks most impurities during builds. Flakes default to pure evaluation; use `--impure` to opt out.

**`inherit`** — Nix language keyword that copies attributes. `inherit x y;` inside an attribute set is equivalent to `x = x; y = y;`. `inherit (pkgs) git;` is equivalent to `git = pkgs.git;`.

**input-addressed** — The default Nix storage model where a **store path** hash is computed from the derivation's *inputs* (source hashes, build commands, dependencies), not its outputs. Changing any input changes the store path, even if the output is identical. Contrast with **content-addressed**.

---

### L

**lazy evaluation** — Nix only evaluates expressions when their value is actually needed. This allows Nix to handle very large package sets efficiently and is key to the module system's performance.

**`lib`** — The nixpkgs standard library (`pkgs.lib`), providing pure Nix-language helper functions for lists, strings, attribute sets, option types, and more. The canonical reference: `https://nixos.org/manual/nixpkgs/stable/#sec-functions-library`.

---

### M

**`mkDerivation`** — The primary function for creating derivations in nixpkgs (`stdenv.mkDerivation`). It wraps `builtins.derivation`, adding the standard build environment (`stdenv`), phase hooks, and sensible defaults.

**`mkShell` / `mkShellNoCC`** — Functions that create a derivation whose output is a shell environment (rather than a build artifact). `mkShell` includes a C compiler toolchain; `mkShellNoCC` is lighter. Used for `shell.nix` and `devShells`.

**module (NixOS module system)** — A function that declares configuration **options** and implements **config** logic. Modules are composed and merged by `lib.evalModules`. Used by NixOS, Home Manager, and others. See Module 7.

**`mkOption`** — Declares a typed configuration option in the module system. Options have a type, optional default, and description. See Module 7.

**`mkEnableOption`** — Shorthand for creating a boolean `enable` option with a standard description. Equivalent to `mkOption { type = lib.types.bool; default = false; ... }`.

---

### N

**nar (Nix ARchive)** — A deterministic archive format used internally by Nix. When a derivation is built, its output is serialised as a `.nar` file, hashed, and stored in `/nix/store`. NAR preserves file permissions, symlinks, and directory structure. Binary caches serve `.nar` archives.

**nativeBuildInputs** — Build-time dependencies of a derivation — tools and libraries needed *during* the build itself (compilers, build systems, code generators). In cross-compilation, these are for the *build* platform.

**nix-darwin** — A project (`github:LnL7/nix-darwin`) that brings NixOS-style declarative system configuration to macOS, using the same module system.

**nixpkgs** — The primary Nix package collection, hosted at `github:NixOS/nixpkgs`. Contains tens of thousands of packages, the `stdenv` build environment, `lib` functions, NixOS modules, and more. Different branches (`nixos-unstable`, `nixos-24.11`, etc.) track different nixpkgs revisions.

**Nix store** — The directory `/nix/store/` (or custom location) where all built packages, source archives, and `.drv` files live. Every store entry is at a unique path like `/nix/store/<hash>-<name>-<version>`. The store is conceptually immutable — once written, entries are never modified.

**NixOS** — A Linux distribution built on top of the Nix package manager and module system. Configuration is entirely declarative (a single `configuration.nix` or flake), and the system is built from a single closure in the Nix store.

---

### O

**overlay** — A function (`final: prev: { ... }`) that creates a modified view of `nixpkgs`. Overlays can add new packages or override existing ones globally. They compose cleanly and affect all consumers of the package set. See Module 6.

**`override` / `overrideAttrs`** — Methods for customising a derivation. `override` changes the arguments *before* calling the function; `overrideAttrs` modifies the derivation attributes *after* the function returns. See Module 6.

---

### P

**profile** — A directory of symlinks (usually `~/.nix-profile` or `/nix/var/nix/profiles/...`) pointing to user-selected packages from the Nix store. Each time the profile is updated, a new numbered **generation** is created. Classic: managed by `nix-env`. Modern: managed by `nix profile`.

**pure evaluation** — Evaluation that is forbidden from accessing the host filesystem, network, or environment variables (except explicitly declared inputs). Flakes use pure evaluation by default.

---

### R

**realisation** — The process of executing a derivation's builder to produce its output in the Nix store. A `.drv` file is evaluated; *realisation* (or *building*) is what produces the actual packages.

**reproducible build** — A build that, when performed in equivalent environments, produces bit-for-bit identical output. Nix strives for reproducibility through hermetic sandboxing, content-addressed hashing, and pinned dependencies.

---

### S

**sandbox** — The isolated environment in which Nix runs derivation builders. The sandbox has no network access, a restricted filesystem, and controlled environment variables. This ensures builds don't accidentally depend on host system state. (Sandboxing is platform-dependent; strongest on Linux.)

**setup hook** — A script shipped with a package, automatically sourced by `mkDerivation` during the build. Setup hooks allow packages to propagate environment variables, compiler flags, or other configuration to packages that depend on them. Example: `pkg-config`'s setup hook adds `PKG_CONFIG_PATH` entries.

**`shell.nix`** — The classic convention for defining a development shell using `mkShell`. Enter with `nix-shell`. The flake equivalent is `devShells.<system>.default`.

**`stdenv`** — The "standard environment" in nixpkgs: a set of tools (GCC, GNU Make, bash, coreutils, etc.) and a standard build procedure (configure → make → make install) that `mkDerivation` uses. Most nixpkgs packages are built with `stdenv`.

**store path** — A fully-qualified path inside the Nix store. Example: `/nix/store/4xw8k9r3...-hello-2.12.1`. The prefix is a cryptographic hash; the suffix is a human-readable name. Store paths refer either to `.drv` files (pending builds) or built outputs.

**substitute (substitution)** — A pre-built version of a store path downloaded from a binary cache, used instead of building locally. When you install a package and Nix says "these paths will be fetched", it's using substitution from `cache.nixos.org`.

**symlink farm** — A directory tree of symlinks pointing into the **Nix store**, forming a synthetic `/usr` (e.g. `/usr/bin/git → /nix/store/…/bin/git`). A `buildFHSEnv` output is a wrapper script plus a symlink farm; `bwrap` mounts the farm as a real `/usr` at runtime. See **FHS environment**.

---

### Common Acronyms

| Acronym | Meaning |
|---------|--------|
| **CA** | Content-Addressed (store paths based on output hash) |
| **FOD** | Fixed-Output Derivation |
| **GC** | Garbage Collection |
| **NAR** | Nix ARchive |
| **NUR** | Nix User Repository (community-maintained package overlays, like AUR for Arch) |

---

## Resources & Further Reading

### Official
- [nix.dev](https://nix.dev) — The official learning resource
- [NixOS Manual](https://nixos.org/manual/nixos/stable/) — NixOS reference
- [Nixpkgs Manual](https://nixos.org/manual/nixpkgs/stable/) — Packaging reference
- [Nix Reference Manual](https://nixos.org/manual/nix/stable/) — Nix language and CLI

### Community
- [NixOS Discourse](https://discourse.nixos.org/)
- [NixOS Wiki](https://wiki.nixos.org/)
- [Nix Pills](https://nixos.org/guides/nix-pills/) — Deep dive into Nix internals
- [Zero to Nix](https://zero-to-nix.com/) — Quick-start guide (flake-focused)
- [Determinate Systems Blog](https://determinate.systems/blog/) — Modern Nix practices

### Tools
- [direnv + nix-direnv](https://github.com/nix-community/nix-direnv) — Auto-load Nix environments
- [Cachix](https://www.cachix.org/) — Binary cache hosting
- [devenv](https://devenv.sh/) — Higher-level dev environment abstraction on top of Nix
- [nixpkgs-fmt](https://github.com/nix-community/nixpkgs-fmt) / [Alejandra](https://github.com/kamadorueda/alejandra) — Nix formatters
- [nil](https://github.com/oxalica/nil) / [nixd](https://github.com/nix-community/nixd) — Nix language servers

### Example Configurations to Study
- [nixpkgs](https://github.com/NixOS/nixpkgs) — The package repository itself
- [nixos-hardware](https://github.com/NixOS/nixos-hardware) — Hardware-specific NixOS modules
- [home-manager](https://github.com/nix-community/home-manager) — User environment management
- [nix-darwin](https://github.com/LnL7/nix-darwin) — Nix on macOS
- Community dotfiles: search GitHub for `flake.nix` + `home-manager` / `nixos`

---

## Quick Reference: Command Cheat Sheet

| Command | Traditional | Flake |
|---------|------------|-------|
| Build package | `nix-build` | `nix build` |
| Build specific | `nix-build -A foo` | `nix build .#foo` |
| Enter dev shell | `nix-shell` | `nix develop` |
| Run app | `nix-shell -p pkg --run cmd` | `nix run .#app` |
| Search packages | `nix search nixpkgs query` | `nix search nixpkgs query` |
| Update deps | `nix-channel --update` | `nix flake update` |
| Garbage collect | `nix-collect-garbage` | `nix store gc` |
| Show deps | `nix-store -q --tree ./result` | `nix-store -q --tree ./result` |

---

*Curriculum last updated: August 2026. File issues or suggestions as needed.*
