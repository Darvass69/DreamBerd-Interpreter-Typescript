import Parser, { ExitBranchError } from "../parser";

export class BranchManager {
  private branches: Parser[] = [];
  private totalBranches = 0;

  public addBranch(p: Parser) {
    this.branches.unshift(p);
  }

  /**
   * Continuously parse branches one by one from the buffer.
   * I don't think we need it to be async or to have a loop, but its future proof.
   */
  public async run() {
    // If we have no references to any branches, it means we are done
    while (this.branches.length > 0 && this.totalBranches < 1000) {
      try {
        console.log("\x1b[35m" + "Processing new branch" + "\x1b[0m"); //!! this.branches[0].log
        const branch = this.branches.shift();
        branch?.parse();
      } catch (error) {
        if (!(error instanceof ExitBranchError)) {
          throw error;
        }
      } finally {
        this.totalBranches++;
      }
    }
    console.log("\x1b[35m" + `Explored ${this.totalBranches} branches.` + "\x1b[0m");
  }

}

