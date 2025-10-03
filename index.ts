import dotenv from "dotenv";
import CommandLine from "@src/commandline";
import {isRoot,exec} from "@src/utils";
import {check_update, update} from "@src/update";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import ora from "ora";

dotenv.configDotenv();

const argv = yargs(hideBin(process.argv))
    .scriptName("amdhelper")
    .option("update", {
        alias: "u",
        describe: "Updating the program.",
        demandOption: false,
        type: "boolean",
        default: false,
    }).help()
    .argv as {
        [x: string]: any
    };

async function main(){
    // Platform check
    if(process.platform != "darwin") {
        console.error(chalk.red("Error: AMD Hackintosh only"));
        return;
    }

    // CPU check with spinner
    const cpuSpinner = ora({
        text: "Checking CPU...",
        spinner: "dots"
    }).start();
    
    const cpuname = await exec("sysctl -n machdep.cpu.brand_string");
    if(!cpuname.stdout.trim().includes("AMD")) {
        cpuSpinner.fail("Error: AMD CPU required");
        return;
    }
    
    cpuSpinner.succeed(`CPU: ${cpuname.stdout.trim()}`);

    if(argv.update) return update();

    await check_update();
    
    if(!isRoot()) {
        console.log(chalk.yellow("\nWarning: Not running as sudo"));
        console.log(chalk.dim("Run with: ") + chalk.cyan("sudo amdhelper") + chalk.dim(" for full functionality\n"));
    }

    global.chromiumApps = [];
    
    const cli = new CommandLine();
    await cli.start();
}


main();