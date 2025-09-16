import { escapePathSpaces, exec } from "@src/utils";
import fs from "fs";
import path from "path";

const localBinPath = escapePathSpaces("/usr/local/bin");
const ryzenadjPath = escapePathSpaces(`${localBinPath}/ryzenadj`);
const plistPath = escapePathSpaces(
    "/Library/LaunchDaemons/org.greepypastaid.customryzenadj.plist"
);

interface RyzenadjPreset {
    name: string;
    args: string[];
}

export default class Ryzenadj {
    enabled() {
        return fs.existsSync(ryzenadjPath) || fs.existsSync(plistPath);
    }
    private selectedPreset: string = "balanced"; // Default preset

    private ryzenadjPresets: { [key: string]: RyzenadjPreset } = {
        "balanced": {
            name: "Balanced",
            args: [
                "--stapm-limit=7000",
                "--slow-limit=8000",
                "--fast-limit=9000",
                "--tctl-temp=75",
                "--apu-skin-temp=75",
            ],
        },
        "performance": {
            name: "Performance",
            args: [
                "--stapm-limit=12000",
                "--slow-limit=13000",
                "--fast-limit=15000",
                "--tctl-temp=85",
                "--apu-skin-temp=85",
            ],
        },
        "silent": {
            name: "Silent",
            args: [
                "--stapm-limit=5000",
                "--slow-limit=5500",
                "--fast-limit=6000",
                "--tctl-temp=60",
                "--apu-skin-temp=60",
            ],
        },
        "gaming": {
            name: "Gaming",
            args: [
                "--stapm-limit=20000",
                "--slow-limit=21000",
                "--fast-limit=25000",
                "--tctl-temp=95",
                "--apu-skin-temp=95",
            ],
        },
    };

    getPresetArgs(presetName: string): string[] {
        const preset = this.ryzenadjPresets[presetName];
        if (!preset) {
            console.warn(`Preset '${presetName}' not found. Using 'balanced' preset.`);
            return this.ryzenadjPresets["balanced"].args;
        }
        return preset.args;
    }

    private generatePlist(args: string[]): string {
        const argsString = args.map(arg => `\t\t<string>${arg}</string>`).join('\n');
        return `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>EnablePressuredExit</key>
	<true/>
	<key>KeepAlive</key>
	<false/>
	<key>Label</key>
	<string>org.greepypastaid.customryzenadj</string>
	<key>OnDemand</key>
	<false/>
	<key>ProcessType</key>
	<string>App</string>
	<key>ProgramArguments</key>
	<array>
		<string>/usr/local/bin/ryzenadj</string>
${argsString}
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardErrorPath</key>
	<string>/tmp/ryzenadj.err.log</string>
	<key>StandardOutPath</key>
	<string>/tmp/ryzenadj.log</string>
	<key>ThrottleInterval</key>
	<integer>1</integer>
	<key>UserName</key>
	<string>root</string>
</dict>
</plist>
`;
    }

    async apply(presetName?: string) {
        // Hapus optimasi yang ada sebelum menerapkan yang baru
        if (this.enabled()) {
            await this.remove();
        }

        if (presetName) {
            this.selectedPreset = presetName;
        }

        console.log(`Applying ${this.ryzenadjPresets[this.selectedPreset].name} optimization...`);

        // Pastikan direktori bin lokal ada
        await exec(`mkdir -p ${localBinPath}`);
        // Unduh atau perbarui binary ryzenadj
        await exec(
            `curl -sL https://github.com/alvindimas05/AMDHelper/raw/refs/heads/main/ryzenadj -o ${ryzenadjPath}`
        );
        await exec(`xattr -c ${ryzenadjPath}`);
        await exec(`chmod 755 ${ryzenadjPath}`);
        await exec(`chown 0:0 ${ryzenadjPath}`);

        const currentPresetArgs = this.getPresetArgs(this.selectedPreset);
        const plistContent = this.generatePlist(currentPresetArgs);

        fs.writeFileSync(plistPath, plistContent);
        await exec(`xattr -c ${plistPath}`);
        await exec(`chmod 644 ${plistPath}`);
        await exec(`chown 0:0 ${plistPath}`);
        await exec(`launchctl load ${plistPath}`);
    }
    async remove() {
        console.log("Removing battery optimization...");

        await exec(`launchctl unload ${plistPath}`);
        try {
            fs.rmSync(ryzenadjPath);
        } catch {}
        try {
            fs.rmSync(plistPath);
        } catch {}
    }
}
