import fs from "fs";
import chalk from "chalk";
import App from "@src/app";
import inquirer from "inquirer";
import clear from "console-clear";
import path from "path";
import {PatchType} from "@src/types";
import Chromium, { bashPath, patchChromiumApps, removePatchChromiumApps } from "./patches/chromium";
import { exec } from "./utils";
import child_process from "child_process";
import Ryzenadj from "./scripts/ryzenadj";
import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";
import boxen from "boxen";

export default class CommandLine {
    basePath = "/Applications/";
    supportedApps: App[];
    
    async showBanner() {
        clear();
        const banner = figlet.textSync("AMDHelper", {
            font: "Slant",
            horizontalLayout: "default",
            verticalLayout: "default"
        });
        
        console.log("\n" + gradient('cyan', 'blue')(banner));
        console.log(boxen(
            chalk.white("Enhanced RyzenAdj Edition") + "\n" +
            chalk.dim("Patch apps & Manage CPU Power on AMD Hackintosh"),
            {
                padding: { left: 2, right: 2, top: 0, bottom: 0 },
                margin: { top: 1, bottom: 1, left: 0, right: 0 },
                borderStyle: "round",
                borderColor: "cyan",
                dimBorder: true
            }
        ));
    }
    
    async start(){
        await this.showBanner();
        
        const spinner = ora({
            text: "Scanning applications...",
            spinner: "dots"
        }).start();
        
        this.getSupportedApplication();
        
        spinner.succeed(`Found ${this.supportedApps.length} patchable applications`);
        console.log("");

        console.log(boxen(
            chalk.bold.white("Applications"),
            {
                padding: { left: 1, right: 1, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "white",
                dimBorder: true
            }
        ));
        this.logSupportedApps();
        console.log("");
        
        console.log(boxen(
            chalk.bold.white("Options"),
            {
                padding: { left: 1, right: 1, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "white",
                dimBorder: true
            }
        ));
        
        if(global.commandlineChromiumMode){
            if (global.disableGpuMode) {
                console.log("  " + chalk.cyan("G") + chalk.dim(" │ ") + "Use disableBlendFuncExtended patch")  
            } else {
                console.log("  " + chalk.cyan("G") + chalk.dim(" │ ") + "Use disable-gpu-rasterization patch")
            }
            if(global.chromiumApps.length > 0) console.log("  " + chalk.cyan("P") + chalk.dim(" │ ") + "Patch selected chromium apps")
            console.log("  " + chalk.cyan("R") + chalk.dim(" │ ") + "Remove chromium apps patch")
        } else {
            console.log("  " + chalk.cyan("A") + chalk.dim(" │ ") + "Patch all apps")
        }
        console.log("  " + chalk.cyan("C") + chalk.dim(" │ ") + `${global.commandlineChromiumMode ? "Exit" : "Enter"} Chromium mode ` + chalk.dim.yellow("[exp]"))
        
        const ryzenadj = new Ryzenadj();
        console.log("  " + chalk.cyan("O") + chalk.dim(" │ ") + "RyzenAdj Presets " + chalk.dim.yellow("[exp]"))
        
        console.log("  " + chalk.cyan("Q") + chalk.dim(" │ ") + "Quit")
        console.log("");

        // @ts-ignore
        const answers = await inquirer.prompt([{ type: "input", name: "option", message: "Select option: " }]);

        await this.selectOption(answers.option);
    }
    
    async selectOption(value: string){
        clear();
        value = value.toLowerCase();
        switch(value) {
            case "q":
                console.log("\n" + boxen(
                    chalk.cyan("Thanks for using AMDHelper!"),
                    {
                        padding: { left: 2, right: 2, top: 0, bottom: 0 },
                        borderStyle: "round",
                        borderColor: "cyan",
                        dimBorder: true
                    }
                ) + "\n");
                process.exit();
                break;
            case "c":
                global.commandlineChromiumMode = !global.commandlineChromiumMode;
                break;
            case "g":
                global.disableGpuMode = !global.disableGpuMode;
                break;
            case "a":
                if(!global.commandlineChromiumMode){
                    await this.patchAllApps();
                    break;
                }
                // fallthrough
            case "p":
                if(global.chromiumApps.length > 0){
                    const patchSpinner = ora({
                        text: "Applying chromium patch...",
                        spinner: "dots"
                    }).start();

                    const macosVersion = (await exec("sw_vers -productVersion")).stdout;
                    const majorVersion = parseInt(macosVersion.split(".")[0]);
                    const minorVersion = parseInt(macosVersion.split(".")[1]);
                    if(majorVersion > 13 && minorVersion > 3){
                        patchSpinner.warn("MacOS 14.4+: Restart may be required");
                    } else {
                        patchSpinner.succeed("Chromium patch applied");
                    }
                        
                    await patchChromiumApps();
                    child_process.spawn("bash", [bashPath], { stdio: "ignore", detached: true }).unref();
                    break;
                }
                // fallthrough
            case "o":
                await this.handleRyzenadjPresets();
                break;
            case "r":
                if(global.commandlineChromiumMode){
                    const removeSpinner = ora({
                        text: "Removing chromium patch...",
                        spinner: "dots"
                    }).start();
                    removePatchChromiumApps();
                    removeSpinner.succeed("Chromium patch removed");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    break;
                }
                // fallthrough
            default:
                const val = parseInt(value);
                if (isNaN(val) || val < 1 || val > this.supportedApps.length + 1) break;
                const app = this.supportedApps[val - 1];
                
                if (global.commandlineChromiumMode) {
                    // @ts-ignore
                    const appPatch: Chromium = app.getAppPatch();
                    if(appPatch.selected()) break;
                    global.chromiumApps.push(app);
                    console.log("\n" + boxen(
                        chalk.cyan("✓") + " " + chalk.white(app.name) + " selected",
                        {
                            padding: { left: 1, right: 1, top: 0, bottom: 0 },
                            borderStyle: "round",
                            borderColor: "cyan",
                            dimBorder: true
                        }
                    ));
                    await new Promise(resolve => setTimeout(resolve, 800));
                } else {
                    const appSpinner = ora({
                        text: `Patching ${app.name}...`,
                        spinner: "dots"
                    }).start();
                    
                    try {
                        await app.patch();
                        appSpinner.succeed(chalk.white(app.name) + " " + chalk.green("patched"));
                    } catch (error) {
                        appSpinner.fail(chalk.white(app.name) + " " + chalk.red("failed"));
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
        }

        const cli = new CommandLine();
        await cli.start();
    }

    async handleRyzenadjPresets() {
        clear();
        console.log("\n" + boxen(
            chalk.bold.white("RyzenAdj Power Presets"),
            {
                padding: { left: 1, right: 1, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "cyan",
                dimBorder: true,
                margin: { bottom: 1 }
            }
        ));
        
        const presets = [
            {
                num: "1",
                name: "Balanced",
                desc: "Daily use, browsing, light work",
                temp: "75°C",
                power: "8W/10W/12W",
                color: "cyan"
            },
            {
                num: "2",
                name: "Performance",
                desc: "Heavy tasks, rendering, compilation",
                temp: "85°C",
                power: "13W/15W/15W",
                color: "blue"
            },
            {
                num: "3",
                name: "Silent",
                desc: "Media, reading, quiet environment",
                temp: "64°C",
                power: "7W/8.2W/10W",
                color: "green"
            },
            {
                num: "4",
                name: "Gaming",
                desc: "Maximum performance for gaming",
                temp: "95°C",
                power: "20W/23W/25W",
                color: "magenta"
            }
        ];
        
        presets.forEach(preset => {
            console.log(boxen(
                chalk.bold[preset.color](preset.num + ". " + preset.name) + "\n" +
                chalk.dim("   " + preset.desc) + "\n" +
                chalk.white("   Temp: ") + chalk.cyan(preset.temp) + chalk.dim(" | ") +
                chalk.white("Power: ") + chalk.cyan(preset.power),
                {
                    padding: { left: 1, right: 1, top: 0, bottom: 0 },
                    borderStyle: "round",
                    borderColor: preset.color,
                    dimBorder: true
                }
            ));
        });
        console.log("");

        const ryzenadj = new Ryzenadj();
        const presetChoices = [
            { name: "Balanced", value: "balanced" },
            { name: "Performance", value: "performance" },
            { name: "Silent", value: "silent" },
            { name: "Gaming", value: "gaming" },
            { name: chalk.dim("Remove Optimization"), value: "remove" },
        ];

        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "preset",
                message: "Select preset:",
                choices: presetChoices.map(p => p.name),
            },
        ]);

        const selectedPreset = presetChoices.find(p => p.name === answers.preset || p.name === chalk.dim(answers.preset));

        if (selectedPreset) {
            const presetSpinner = ora({
                text: `Applying ${selectedPreset.value === "remove" ? "removal" : selectedPreset.value}...`,
                spinner: "dots"
            }).start();
            
            try {
                if (selectedPreset.value === "remove") {
                    await ryzenadj.remove();
                    presetSpinner.succeed(chalk.white("Optimization ") + chalk.green("removed"));
                } else {
                    await ryzenadj.apply(selectedPreset.value);
                    presetSpinner.succeed(chalk.white(selectedPreset.value.charAt(0).toUpperCase() + selectedPreset.value.slice(1) + " preset ") + chalk.green("applied"));
                }
            } catch (error) {
                presetSpinner.fail(chalk.white("Failed: ") + chalk.red(error));
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    async patchAllApps(){
        const totalApps = this.supportedApps.length;
        console.log("\n" + boxen(
            chalk.white(`Patching ${totalApps} applications`),
            {
                padding: { left: 2, right: 2, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "cyan",
                dimBorder: true
            }
        ) + "\n");
        
        for(let i = 0; i < this.supportedApps.length; i++){
            const app = this.supportedApps[i];
            const spinner = ora({
                text: chalk.dim(`[${i+1}/${totalApps}]`) + " " + app.name,
                spinner: "dots"
            }).start();
            
            try {
                await app.patch();
                spinner.succeed(chalk.dim(`[${i+1}/${totalApps}]`) + " " + chalk.white(app.name) + " " + chalk.green("patched"));
            } catch (error) {
                spinner.fail(chalk.dim(`[${i+1}/${totalApps}]`) + " " + chalk.white(app.name) + " " + chalk.red("failed"));
            }
        }
        
        console.log("\n" + boxen(
            chalk.green("✓") + " " + chalk.white(`Completed ${totalApps} applications`),
            {
                padding: { left: 2, right: 2, top: 0, bottom: 0 },
                borderStyle: "round",
                borderColor: "green",
                dimBorder: true
            }
        ) + "\n");
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    logSupportedApps(){
        this.supportedApps.forEach((app, i) => {
            let status: string;
            let icon: string;

            switch(app.patched()){
                case PatchType.PATCHED:
                    status = chalk.green("patched");
                    icon = chalk.green("✓");
                    break;
                case PatchType.UNPATCHED:
                    status = chalk.dim("not patched");
                    icon = chalk.dim("○");
                    break;
                case PatchType.OLD_PATCH:
                    status = chalk.cyan("update available");
                    icon = chalk.cyan("●");
                    break;
                case PatchType.EXPERIMENTAL:
                    status = chalk.yellow("experimental");
                    icon = chalk.yellow("▲");
                    break;
                case PatchType.SELECTED:
                    status = chalk.cyan("selected");
                    icon = chalk.cyan("◆");
                    break;
                default: 
                    status = chalk.dim("undetected");
                    icon = chalk.dim("○");
            }

            const number = chalk.dim(`${(i + 1).toString().padStart(2, ' ')}.`);
            console.log(`  ${number} ${icon} ${chalk.white(app.name)} ${chalk.dim("│")} ${status}`);
        })
    }
    
    getSupportedApplication(){
        this.supportedApps = [];
        this.getApps(this.basePath);
        this.supportedApps.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    getApps(dir: string){
        const files = fs.readdirSync(dir);

        for (const file of files) {
            try {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
    
                if (stats.isDirectory() && !filePath.endsWith('.app')) {
                    this.getApps(filePath);
                } else if (filePath.endsWith('.app')) {
                    const app = new App(filePath);
                    if(!app.supported()) continue;
                    this.supportedApps.push(new App(filePath));
                }
            } catch {}
        }
    }
}
