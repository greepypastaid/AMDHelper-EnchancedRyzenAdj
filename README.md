# AMDHelper-EnchancedRyzenadj
AMDHelper is an experimental application designed to help patch unsupported apps on AMD Hackintoshes.
It specifically addresses issues with apps that rely on Dual Source Blend
(previously assumed to be an OpenGL issue) and Intel MKL libraries.
While AMDHelper can resolve some compatibility problems, it may not fix all unsupported apps.

### How this works?
- For apps utilizing Intel MKL libraries, AMDHelper employs [AMDFriend](https://github.com/NyaomiDEV/AMDFriend) to patch these libraries for better compatibility.

- For apps relying on Dual Source Blend, the current solution is to disable GPU features within the app.
Unfortunately, this is a temporary workaround, and we must wait for [NootedRed](https://github.com/ChefKissInc/NootedRed) to provide a more permanent fix.

### RyzenAdj Enhancements (Custom for my HP Aero 13 - Ryzen 7 5825U)

This fork of AMDHelper includes significant modifications to the RyzenAdj integration, specifically tailored for devices like the HP Aero 13 with a Ryzen 7 5825U processor, which can be prone to overheating during sustained workloads. The goal is to provide flexible power management options to improve thermal performance and user experience for daily driving.

**Key Features:**
-   **Multiple Power Presets**: Four distinct power profiles (Balanced, Performance, Silent, Gaming) are available, allowing users to quickly switch between configurations optimized for different scenarios.
-   **Automatic Reapply Logic**: When a new preset is selected, the system automatically unloads any existing RyzenAdj optimization and applies the new one, streamlining the process and ensuring the latest configuration is active.
-   **Custom Launch Daemon**: The RyzenAdj configuration is managed via a custom launch daemon (`org.greepypastaid.customryzenadj.plist`) to ensure persistent application of settings across reboots and proper integration with macOS.

**RyzenAdj Presets Detail:**

Each preset is designed with specific thermal and power limits to cater to various usage patterns, keeping the maximum temperature below 85°C for optimal device longevity and comfort (except for Gaming, which pushes limits for performance).

1.  **Balanced**
    -   **Skenario**: Ideal for everyday use, web browsing, and light productivity tasks where a balance between performance and thermal efficiency is desired.
    -   **Suhu Maksimal**: 75°C
    -   **Batas Daya**: 7W (STAPM), 8W (SLOW), 9W (FAST)

2.  **Performance**
    -   **Skenario**: Suitable for demanding tasks such as video rendering, code compilation, or heavy multitasking, requiring higher CPU performance.
    -   **Suhu Maksimal**: 85°C
    -   **Batas Daya**: 12W (STAPM), 13W (SLOW), 15W (FAST)

3.  **Silent**
    -   **Skenario**: Best for media consumption, reading, or working in quiet environments where minimal fan noise and cooler operation are prioritized.
    -   **Suhu Maksimal**: 60°C
    -   **Batas Daya**: 5W (STAPM), 5.5W (SLOW), 6W (FAST)

4.  **Gaming**
    -   **Skenario**: Designed for gaming sessions where maximum performance is critical. This preset pushes the power limits while still aiming to manage thermals effectively.
    -   **Suhu Maksimal**: 95°C
    -   **Batas Daya**: 20W (STAPM), 21W (SLOW), 25W (FAST)

### How to use?

Install (or update) AMDHelper on your system 
```
ON PROGRESS :D
```

Run AMDHelper (Please run as sudo)
```
sudo amdhelper
```

### Building Manually (Detailed Guide)

If you wish to modify the code and build AMDHelper manually, follow these detailed steps to ensure a successful build process:

1.  **Install Node.js 18.19.0**: This specific version is required due to `nexe` compatibility. We recommend using `nvm` (Node Version Manager).
    ```bash
    # Install nvm (if you haven't already)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    # Load nvm into your current shell (you might need to restart your terminal)
    source ~/.zshrc # or ~/.bashrc, depending on your shell
    # Install and use Node.js 18.19.0
    nvm install 18.19.0
    nvm use 18.19.0
    ```

2.  **Install Bun Runtime**: Bun is used for package management and running scripts.
    ```bash
    curl -fsSL https://bun.sh/install | bash
    # Ensure Bun is in your PATH (you might need to restart your terminal)
    source ~/.zshrc # or ~/.bashrc
    ```

3.  **Clean and Reinstall Project Dependencies**: To prevent any module resolution issues, it's best to perform a clean installation of all dependencies.
    ```bash
    # Navigate to your project directory
    cd /Users/boodyantoes/Downloads/AMDHelper-EnchancedRyzenaAdj/
    # Remove existing node_modules and lock file
    rm -rf node_modules bun.lockb
    # Install all project dependencies
    bun install
    ```

4.  **Run the Build Process**: This command will clean previous builds, bundle the application with Webpack, and compile it into a standalone executable using Nexe.
    ```bash
    bun run build
    ```
    *Expected Output*: The build process should complete without errors, indicating that Webpack and Babel have successfully processed all modules, including `amdfriend`.

5.  **Locate the Built Executable**: After a successful build, your executable will be available in the `build/` directory.
    ```bash
    ls build/
    # You should see 'amdhelper' here
    ```

### Creating Custom RyzenAdj Presets

If you wish to create your own custom RyzenAdj presets beyond the provided options, you can do so by modifying the `src/scripts/ryzenadj.ts` file. This allows for fine-grained control over your processor's power management.

**Steps to Create a Custom Preset:**

1.  **Locate `src/scripts/ryzenadj.ts`**: Open this file in your code editor.

2.  **Modify `ryzenadjPresets` Object**: Inside the `Ryzenadj` class, you will find a `private ryzenadjPresets` object. This object contains the definitions for all available presets.

    ```typescript
    private ryzenadjPresets: { [key: string]: RyzenadjPreset } = {
        "balanced": { /* ... */ },
        "performance": { /* ... */ },
        "silent": { /* ... */ },
        "gaming": { /* ... */ },
        // Add your custom preset here
        "mycustompreset": {
            name: "My Custom Preset",
            args: [
                "--stapm-limit=XXXX", // Adjust as needed (in mW)
                "--slow-limit=XXXX",  // Adjust as needed (in mW)
                "--fast-limit=XXXX",  // Adjust as needed (in mW)
                "--tctl-temp=XX",     // Target temperature (in °C)
                "--apu-skin-temp=XX", // APU skin temperature (in °C)
                // Add any other RyzenAdj arguments you need
            ],
        },
    };
    ```

3.  **Add to `handleRyzenadjPresets` in `src/commandline.ts`**: To make your new preset selectable in the command-line interface, you need to add it to the `presets` array in the `handleRyzenadjPresets` method within `src/commandline.ts`.

    ```typescript
    const presets = [
        { name: "Balanced", value: "balanced" },
        { name: "Performance", value: "performance" },
        { name: "Silent", value: "silent" },
        { name: "Gaming", value: "gaming" },
        { name: "My Custom Preset", value: "mycustompreset" }, // Add your custom preset here
        { name: "Remove Optimization", value: "remove" },
    ];
    ```

4.  **Update Preset Descriptions (Optional)**: If you want your custom preset to have a detailed description in the command-line interface, add a corresponding `console.log` block in `handleRyzenadjPresets` in `src/commandline.ts`.

5.  **Rebuild the Project**: After making these changes, you must rebuild the project for them to take effect. Follow the "Building Manually (Detailed Guide)" section above.

### Running the Enhanced AMDHelper

To run the application and utilize the new RyzenAdj presets:

1.  **Execute the Built Application (with sudo)**:
    ```bash
    sudo ./build/amdhelper
    ```

2.  **Select RyzenAdj Presets**: From the interactive command-line menu, choose option `(O) RyzenAdj Presets`.

3.  **Choose Your Preset**: You will be presented with a detailed description of each preset. Select the one that best suits your current needs. The application will automatically apply the chosen preset, handling the removal of any old configurations and loading the new custom daemon (`org.greepypastaid.customryzenadj.plist`).

### Installing `amdhelper` to System PATH (Optional)

To make `amdhelper` accessible globally from any directory in your terminal (e.g., by simply typing `sudo amdhelper`), you can copy the executable to a directory that is already included in your system's PATH, such as `/usr/local/bin`.

**Steps:**

1.  **Ensure Project is Built**: Make sure you have successfully built the project using `bun run build` as described in the "Building Manually (Detailed Guide)" section.

2.  **Copy Executable to `/usr/local/bin`**:
    You will be prompted for your administrator password. This command copies the `amdhelper` executable to a standard location in your system's PATH.

3.  **Verify Installation**: After copying, you can test if `amdhelper` is globally accessible:
    ```bash
    sudo amdhelper
    ```
    If the application's menu appears, the installation to your system PATH was successful. You can now run `sudo amdhelper` from any directory.

## Credits
-   **Original AMDHelper**: This project is a fork of the original [AMDHelper by alvindimas05](https://github.com/alvindimas05/AMDHelper). Many thanks for the foundational work!
- [VisualEhrmanntraut](https://github.com/VisualEhrmanntraut) for developing [NootedRed](https://github.com/ChefKissInc/NootedRed)
to support Hackintosh on AMD iGPU.
- [tomnic](https://macos86.it/profile/69-tomnic/) for [guide](https://macos86.it/topic/5489-tutorial-for-patching-binaries-for-amd-hackintosh-compatibility/)
to patch apps that uses Intel MKL libraries.
- [NyaomiDEV](https://github.com/NyaomiDEV) for developing [AMDFriend](https://github.com/NyaomiDEV/AMDFriend)
to automatically patch apps that uses Intel MKL libraries.
- [gmatht](https://github.com/gmatht) for script code [gz99](https://github.com/gmatht/joshell/blob/master/scripts/gz99)
script for better compression.
- [FlyGoat](https://github.com/FlyGoat) for developing [RyzenAdj](https://github.com/FlyGoat/RyzenAdj) to add power management feature.
- [ExtremeXT](https://github.com/ExtremeXT) for providing compiled MacOs version of [RyzenAdj](https://github.com/FlyGoat/RyzenAdj).