import { execFileSync } from "node:child_process";

function run(command, args) {
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

run("npm", ["run", "test:catalog"]);
run("npm", ["run", "test:e2e"]);
