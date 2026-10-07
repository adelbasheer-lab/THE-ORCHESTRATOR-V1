# ORCHESTRATOR Local Uploader (Android)

Android-native local file uploader for use with ChatGPT and the ORCHESTRATOR workspace.

## Build APK with GitHub Actions

Open the repository's **Actions** tab and run **Build Android Local Uploader** with **Run workflow**.

Download the workflow artifact:

    orchestrator-local-uploader-debug-apk

The artifact contains:

    app-debug.apk

## Android behavior

1. Choose a local workspace folder using Android's system folder picker.
2. Select one or more files using Android's system file picker.
3. Copy the files into the selected workspace.
4. Open the workspace folder when needed.
5. Attach the copied files manually to the ChatGPT conversation.

No storage permission is required because the app uses Android's Storage Access Framework.


Build validation marker: session-only GitHub intake credential path.
