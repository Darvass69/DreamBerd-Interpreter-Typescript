# Dreamberd Interpreter Typescript

This is a work in progress of an interpreter for [Dreamberd](https://github.com/TodePond/DreamBerd) made in Typescript. I have spent about 2 weeks making it, so its far from complete. Right now it runs with Node in as a CLI, but I plan to change it to a browser environment.

The project is based on this [guide to parsers](https://youtube.com/playlist?list=PL_2VhOvlMk4XDeq2eOOSDQMrbZj9zIU_b&si=2F4jFltpkbobRTFs) ([github](https://github.com/tlaceby/parser-series)) and this [guide to interpreters](https://www.youtube.com/playlist?list=PL_2VhOvlMk4UHGqYCLWc6GO8FaPl8fQTh) ([github](https://github.com/tlaceby/guide-to-interpreters-series)).

The project is a bit of a mess right now. The parser will need to be changed to handle harder syntax, the runtime is barely functional and there are still some AST nodes that don't have an implementation yet.

### How to use
In `main.ts`, change the `path` variable to the desired file before main is called, and you will see the result in the console. You need to have node installed, run `npm i` to install the required packages and then `npm run main` to run the program.

#### VS Code
If you use VS Code, you can install the recommended extensions. If you want the DreamBerd icon on your DreamBerd files, add `dreamberd.svg` to `.vscode/extensions/icons` (on windows, its in the user's folder).

## Features
Some features are missing, most features are somewhat there, some features are functional, but nothing is done. I will update this later with more details on what features are supported and which one are being worked on.

## File Structure
In the `src` folder, we have:

- `/lexer` : `lexer.ts` parses the raw file into tokens defined in `token.ts`.

- `/parser` : Parses the tokens into an Abstract Syntax Tree (AST).

- `/runtime` : Evaluates the AST made by the parser.

- `/examples` : Examples of DreamBerd code. `samples.dbx` doesn't work because it contains features not yet supported. `lexerTests.db` create an AST that isn't valid at runtime.

- `main.ts` : Entry point for the program.