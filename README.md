# Dreamberd Interpreter Typescript

This is a work in progress of an interpreter for [Dreamberd](https://github.com/TodePond/DreamBerd) made in Typescript. I have spent about 2 weeks making it, so its far from complete. Right now it runs with Node in as a CLI, but I plan to change it to a browser environment.

The project is based on this [guide to parsers](https://youtube.com/playlist?list=PL_2VhOvlMk4XDeq2eOOSDQMrbZj9zIU_b&si=2F4jFltpkbobRTFs) ([github](https://github.com/tlaceby/parser-series)) and this [guide to interpreters](https://www.youtube.com/playlist?list=PL_2VhOvlMk4UHGqYCLWc6GO8FaPl8fQTh) ([github](https://github.com/tlaceby/guide-to-interpreters-series)).

The project is a bit of a mess right now. The parser will need to be changed to handle harder syntax, the runtime is barely functional and there are still some AST nodes that don't have an implementation yet.

### How to use
In `main.ts`, change the `path` variable to the desired file before main is called, and you will see the result in the console. You need to have node installed, run `npm i` to install the required packages and then `npm run main` to run the program.

#### VS Code
If you use VS Code, you can install the recommended extensions. If you want the DreamBerd icon on your DreamBerd files, add `dreamberd.svg` to `.vscode/extensions/icons` (on windows, its in the current user folder).

## Features
Some features are missing, most features are somewhat there, some features are functional, but nothing is done. I will update this later with more details on what features are supported and which one are being worked on.

### Parser

- [ ] Tokenizing all characters
  - [X] All base characters are tokenized properly.
  - [ ] handle things like weird control characters.
  - [ ] Make sure all valid identifiers can be tokenized (right now, identifiers only contain alpha and char codes > 128, but they should be able to contain more than that)
- [ ] Handle more than 1 `"` or `'`.
- [ ] Verify indent is 3 or -3 spaces. (indent can also be used to give info for AI)
- [ ] Take significant whitespace into account and ditch parentheses.
- [ ] Implicit strings
- [ ] Parse lifetime into an AST node and ignore type definition.

### Runtime

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


## TODO
Things I need to do, but that aren't actual features from the language. Mostly cleaning up code and improving current systems.

### Lexer
I think the lexer is done. There might be a thing or two I forgot, but it works pretty well. We could maybe clean up the code a bit, but I think its more than fine for now.

### Parser

- [ ] Rewrite parser to handle multiple possible results from the same tokens (there is some ambiguity in the syntax that needs to be fixed). This will also prepare us to drop parentheses and use significant whitespace. We do this by, each time we get to a token that can be interpreted more than 1 way, we create a new branch with each possibility that then parse, all the way until we parsed all the possibilities.
- [ ] Add line number and character in the AST so we can make better errors
- [ ] More descriptive and accurate error messages.


### Runtime

- [ ] More descriptive and accurate error messages.

## File Structure
In the `src` folder, we have:

- `/lexer` : `lexer.ts` parses the raw file into tokens defined in `token.ts`.

- `/parser` : Parses the tokens into an Abstract Syntax Tree (AST).

- `/runtime` : Evaluates the AST made by the parser.

- `/examples` : Examples of DreamBerd code. `samples.dbx` doesn't work because it contains features not yet supported. `lexerTests.db` create an AST that isn't valid at runtime.

- `main.ts` : Entry point for the program.

## Contribution
Contributions and discutions are welcome.