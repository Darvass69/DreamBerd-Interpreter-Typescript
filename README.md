# Dreamberd Interpreter Typescript

This is a work in progress of an interpreter for [Dreamberd](https://github.com/TodePond/DreamBerd) made in Typescript. I have spent about ~~2 weeks~~ 4 months making it, so its far from complete. Right now it runs with Node as a CLI, but I plan to change it to a browser environment.

The project is based on this [guide to parsers](https://youtube.com/playlist?list=PL_2VhOvlMk4XDeq2eOOSDQMrbZj9zIU_b&si=2F4jFltpkbobRTFs) ([github](https://github.com/tlaceby/parser-series)) and this [guide to interpreters](https://www.youtube.com/playlist?list=PL_2VhOvlMk4UHGqYCLWc6GO8FaPl8fQTh) ([github](https://github.com/tlaceby/guide-to-interpreters-series)).

The project is a bit of a mess right now. The parser will need to be changed to handle harder syntax, the runtime is barely functional and there are still some AST nodes that don't have an implementation yet.

### How to use
In `main.ts`, change the `path` variable to the desired file before main is called, and you will see the result in the console. You need to have node installed, run `npm i` to install the required packages and then `npm run main` to run the program.

#### VS Code
If you use VS Code, you can install the recommended extensions. If you want the DreamBerd icon on your DreamBerd files, add `dreamberd.svg` to `.vscode/extensions/icons` in the user configs (on windows, its in the current user folder).

## Features
I plan on supporting as many features as possible and hopefully create the first complete DreamBerd interpreter. I also want to try to make a language server and/or a VS code extension.

❌: not planned or only once everything else is done
📄: planned but not started
✏️: need to be implemented in the parser
📝: implemented in the parser
💃: need to be implemented in the interpreter
🤖: implemented in the interpreter
🐦: fully implemented.

- ✏️ Significant whitespace

- Standard operators
  - 📝 💃 All standard binary operators (ex: + - * / ...) 
  - ✏️ 💃 unary operators (; ~ -- ++ ...)
  - ✏️ 💃 state operators (`previous`, `current`, `next`)
  
- End of statement
  - ✏️ 💃 Print debug info for statements ending with `?`.

- Variable declaration
  - ✏️ 💃 Combination of `const` and `var` change how the variable can be modified
  - ✏️ 💃 `const const const` for superglobals
  - 📄 signals
  - 📄 Types
  - ❌ Regex. With significant whitespace, this one is a pain in the butt.
  - 📄 Lifetimes
    - Positive time
    - Positive lines
    - Negative lines
    - Infinite lines/time
    - With superglobals
  - ✏️ 💃 Variable overloading with `!` and `¡`
  - ✏️ 💃 Variables and identifiers can have any name using Unicode characters. A few exceptions
    1. A whitespace cannot be part of a name unless its escaped like this `\ ` (be careful with this when using significant whitespace).
    2. No name can have `//`, `/*` or `*/` because it creates a comment, but you can escape them (`\/\/`, `/\/`)
    3. No name can be only composed of `!`, `¡` or `?` because its always considered as an end of statement (this is just to limit the extend we can extend expressions on the next line).

- Conditional statements
  - ✏️ 💃 `if`, `if else` and `else`.
  - ✏️ 💃 `when`.

- Equality
  - 📝 💃 `====` to compare the symbols instead of the values
  - ✏️ 💃 Weak equal `=`. How does it work? (It collides with assignment (but not declaration))

- Booleans
  - ✏️ 💃 `true` `false` `maybe`

- Numbers
  - ✏️ Numeric literals
  - 📄 Numeric names
  - 📄 Fractions?
  - 💃 Dividing by 0 === undefined
  - 'integers are just arrays of digits.' does that mean you can do .push()?

- Strings
  - ✏️ Any number of `'` or `"`
  - ✏️ Implicit strings
  - 📄 String interpolation
  - 💃 Strings are array of chars
  - 💃 Standard lib
    - .pop()
    - .push(char)

- Arrays
  - ✏️ 💃 Arrays can be indexed using `[]` and an expression
  - 💃 Arrays start at -1 and can use floats as indexes.

- Objects
  - ✏️ 💃 Objects can be accessed with `[]` or `.`
- Functions
  - ✏️ 💃 Function declaration. (`function` keyword and its variants + `=>`)
  - ✏️ 💃 async




- classes
  - class definition
  - constructor (with limit of 1)
  - methods
  - fields

- Other
  - 📄 AI
  - Standard lib
    - print()
    - Date.now(): `Date.now() -= 3600000!`
  - Is the `...` operator part of the specification?
  - Parentheses
  - Indents (tabs multiple of +-3)
  - https://github.com/TodePond/DreamBerd?tab=readme-ov-file#types
    ```
      String == Char[]!
      Int == Digit[]!
    ```
    Does that imply that you can check the types like that?
  - files
    - `=====` to separate files
    - file names
  - import/export
  - delete
  - reverse
  - ❌ DBX
  - ❌ rich text: probably not that hard, but its not really a concern right now


## TODO

### Adding features
Non-exhaustive list of what is left to do to add specific language features.

#### Parser

- [ ] Tokenizing all characters
  - [X] All base characters are tokenized properly.
  - [ ] handle things like weird control characters. (I think they work, but I'm not 100% sure)
  - [ ] Make sure all valid identifiers can be tokenized (right now, identifiers only contain alpha and char codes > 128, but they should be able to contain more than that)
- [ ] Handle more than 1 `"` or `'` for string declaration.
- [ ] Verify indent is 3 or -3 spaces. (indent can also be used to give info for AI)
- [ ] Take significant whitespace into account and ditch parentheses.
- [ ] Implicit strings
- [ ] Parse lifetime into an AST node and ignore type definition.

#### Runtime

- [ ] Print debug info when using `?`.
- [ ] Assigning variables
  - [ ] Take number of `!` and `¡` in account when assigning variables (How does it play with objects?).
  - [ ] Take `const` into account when assigning a variable.
  - [ ] Handle lifetime (at declaration and when accessing)
    - [ ] Handle positive lifetime
    - [ ] infinite/greater than the program's duration
    - [ ] negative (only for lines)
  - [ ] Handle super globals (`const const const`)
- [ ] Add a way to listen to changes to variables (for `when` and `next`)
- [ ] Add `maybe` to booleans
- [ ] Handle `====` and `!===` and weak equal.
- [ ] Default methods on objects and arrays:
  - [ ] Number names
  - [ ] Arrays
    - [ ] `.push`
    - [ ] `.pop`
    - [ ] index (int and float)
  - [ ] Objects
    - [ ] get keys?
- [ ] Standard library: we need a standard library that includes at least the bare minimum
  - [ ] `Date.now`
  - [ ] `print()`
  - [ ] `addEventListener`?


### Code
Things I need to do, but that aren't actual features from the language. Mostly cleaning up code and improving current systems.

#### Lexer
~~I think the lexer is done. There might be a thing or two I forgot, but it works pretty well. We could maybe clean up the code a bit, but I think its more than fine for now.~~ Nope, I decided to completely rework how we handle tokens. A token now contain all the possible ways it can be interpreted instead of being limited to a single type. This will allow to easily have tokens that overlap and tokens with multiple meanings at the same time.
- [x] Token rework

- [ ] Using lists of token is annoying. Create a class for it with helper methods.

#### Parser

- [x] Rewrite parser to handle multiple possible results from the same tokens . How it works is that each time we hit a token that can be interpreted more than 1 way, we create a new branch with each possibility. This will also prepare us to drop parentheses and use significant whitespace (it will fix some ambiguity problems with the syntax).
  - [x] Branch for every different way to parse each token
  - [x] Branch for every different stmt, nud, led handler for each tokens
  - [x] Memoize the results with checkpoints
- [ ] Add line number and character in the AST so we can make better errors
- [ ] More descriptive and accurate error messages.


#### Runtime

- [ ] More descriptive and accurate error messages.

#### General
- [ ] Make sure we are consistent with parsing and executing. There might be some places where we do it one way and another place that does it a different way. We should make sure that the behavior is consistent and somewhat predictable (as predictable as possible with this language). (The problems are going to be where we have spaces, tabs or end of line/end of statement and EOF)
- [~] Some of the types are so messy and complicated. I'm sure there is a better way of doing it.

#### Extra
- [ ] AST visualiser as a tree. This way we can better understand what is happening and make sure everything works properly.

## File Structure
In the `src` folder, we have:

- `/lexer` : `lexer.ts` parses the raw file into tokens defined in `token.ts`.

- `/parser` : Parses the tokens into an Abstract Syntax Tree (AST).

- `/runtime` : Evaluates the AST made by the parser.

- `/examples` : Examples of DreamBerd code. `samples.dbx` doesn't work because it contains features not yet supported. `lexerTests.db` create an AST that isn't valid at runtime.

- `main.ts` : Entry point for the program.
