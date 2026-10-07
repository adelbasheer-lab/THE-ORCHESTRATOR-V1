package com.orchestrator.localuploader;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.text.InputType;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends android.app.Activity {

    private static final int PICK_FILES = 1001;
    private static final int PICK_FOLDER = 1002;
    private static final String PREFS = "local_uploader";
    private static final String PREF_TREE_URI = "tree_uri";

    private final ArrayList<Uri> selectedUris = new ArrayList<>();
    private final ArrayList<String> selectedNames = new ArrayList<>();

    private SharedPreferences prefs;
    private TextView destinationView;
    private TextView githubView;
    private TextView filesView;
    private Uri destinationTreeUri;

    private GitHubTokenStore tokenStore;
    private GitHubIntakeClient githubClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String savedTree = prefs.getString(PREF_TREE_URI, null);
        if (savedTree != null) {
            destinationTreeUri = Uri.parse(savedTree);
        }

        tokenStore = new GitHubTokenStore(this);
        githubClient = new GitHubIntakeClient(tokenStore);

        buildUi();
        refreshUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 32);

        TextView title = new TextView(this);
        title.setText("ORCHESTRATOR Local Uploader");
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        destinationView = new TextView(this);
        destinationView.setPadding(0, 24, 0, 12);
        root.addView(destinationView);

        Button chooseFolder = new Button(this);
        chooseFolder.setText("Choose workspace folder");
        chooseFolder.setOnClickListener(v -> chooseFolder());
        root.addView(chooseFolder);

        Button selectFiles = new Button(this);
        selectFiles.setText("Select files");
        selectFiles.setOnClickListener(v -> selectFiles());
        root.addView(selectFiles);

        Button copyFiles = new Button(this);
        copyFiles.setText("Copy selected files to workspace");
        copyFiles.setOnClickListener(v -> copySelectedFiles());
        root.addView(copyFiles);

        githubView = new TextView(this);
        githubView.setPadding(0, 24, 0, 8);
        root.addView(githubView);

        Button configureGitHub = new Button(this);
        configureGitHub.setText("Configure GitHub intake session");
        configureGitHub.setOnClickListener(v -> configureGitHub());
        root.addView(configureGitHub);

        Button testGitHub = new Button(this);
        testGitHub.setText("Test GitHub intake access");
        testGitHub.setOnClickListener(v -> testGitHub());
        root.addView(testGitHub);

        Button sendToGitHub = new Button(this);
        sendToGitHub.setText("Send selected files to GitHub intake");
        sendToGitHub.setOnClickListener(v -> sendSelectedToGitHub());
        root.addView(sendToGitHub);

        Button disconnectGitHub = new Button(this);
        disconnectGitHub.setText("Clear GitHub session access");
        disconnectGitHub.setOnClickListener(v -> disconnectGitHub());
        root.addView(disconnectGitHub);

        Button openIntake = new Button(this);
        openIntake.setText("Open GitHub intake repository");
        openIntake.setOnClickListener(v -> openIntakeRepository());
        root.addView(openIntake);

        Button clearFiles = new Button(this);
        clearFiles.setText("Clear selection");
        clearFiles.setOnClickListener(v -> {
            selectedUris.clear();
            selectedNames.clear();
            refreshUi();
        });
        root.addView(clearFiles);

        Button openFolder = new Button(this);
        openFolder.setText("Open workspace folder");
        openFolder.setOnClickListener(v -> openFolder());
        root.addView(openFolder);

        filesView = new TextView(this);
        filesView.setPadding(0, 24, 0, 0);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(filesView);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);
    }

    private void configureGitHub() {
        final EditText input = new EditText(this);
        input.setHint("Paste fine-grained GitHub token (session only)");
        input.setSingleLine(true);
        input.setInputType(
                InputType.TYPE_CLASS_TEXT
                        | InputType.TYPE_TEXT_VARIATION_PASSWORD
        );

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(32, 8, 32, 0);
        panel.addView(input);

        TextView help = new TextView(this);
        help.setText(
                "Use a fine-grained token restricted to "
                        + "THE-ORCHESTRATOR-INTAKE with "
                        + "Contents: Read and write. "
                        + "The token is kept only in memory for this app session "
                        + "and is never stored on the device."
        );
        help.setPadding(0, 8, 0, 0);
        panel.addView(help);

        new AlertDialog.Builder(this)
                .setTitle("GitHub intake session")
                .setView(panel)
                .setNeutralButton(
                        "Open token settings",
                        (dialog, which) -> openTokenSettings()
                )
                .setNegativeButton("Cancel", null)
                .setPositiveButton(
                        "Use for this session",
                        (dialog, which) ->
                                saveGitHubToken(input.getText().toString())
                )
                .show();
    }

    private void saveGitHubToken(String token) {
        try {
            tokenStore.saveToken(token);
            refreshUi();
            toast("GitHub token loaded for this session. Test it before uploading.");
        } catch (Exception e) {
            toast("Could not save GitHub access: " + safeError(e));
        }
    }

    private void testGitHub() {
        if (!tokenStore.hasToken()) {
            toast("Configure GitHub access first.");
            return;
        }

        toast("Testing GitHub intake access...");

        new Thread(() -> {
            try {
                githubClient.testConnection();
                runOnUiThread(() ->
                        toast("GitHub intake access is working."));
            } catch (Exception e) {
                String message = safeError(e);
                runOnUiThread(() ->
                        toast("GitHub test failed: " + message));
            }
        }).start();
    }

    private void sendSelectedToGitHub() {
        if (!tokenStore.hasToken()) {
            toast("Configure GitHub access first.");
            return;
        }

        if (selectedUris.isEmpty()) {
            toast("Select at least one file.");
            return;
        }

        new Thread(() -> {
            String batchId = githubClient.createBatchId();
            int uploaded = 0;
            int failed = 0;
            ArrayList<String> failures = new ArrayList<>();

            for (int i = 0; i < selectedUris.size(); i++) {
                String name = selectedNames.get(i);
                int current = i + 1;
                int total = selectedUris.size();

                runOnUiThread(() ->
                        toast("Uploading " + current + "/" + total + ": " + name));

                try {
                    githubClient.uploadFile(
                            getContentResolver(),
                            selectedUris.get(i),
                            name,
                            batchId
                    );
                    uploaded++;
                } catch (Exception e) {
                    failed++;
                    failures.add(name + ": " + safeError(e));
                }
            }

            final int done = uploaded;
            final int errors = failed;
            final String details = String.join("\n", failures);

            runOnUiThread(() -> {
                if (errors == 0) {
                    toast("Uploaded " + done + " file(s) to GitHub intake.");
                } else {
                    toast("Uploaded: " + done + " | Failed: " + errors
                            + "\n" + details);
                }
            });
        }).start();
    }

    private void openTokenSettings() {
        Intent intent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse(
                        "https://github.com/settings/personal-access-tokens/fine-grained/new"
                )
        );
        startActivity(intent);
    }

    private void disconnectGitHub() {
        tokenStore.clear();
        refreshUi();
        toast("GitHub session access cleared.");
    }

    private void openIntakeRepository() {
        Intent intent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse(
                        "https://github.com/" + GitHubIntakeClient.REPOSITORY
                )
        );
        startActivity(intent);
    }

    private String safeError(Exception e) {
        String message = e.getMessage();
        return message == null || message.isBlank()
                ? e.getClass().getSimpleName()
                : message;
    }

    private void chooseFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        startActivityForResult(intent, PICK_FOLDER);
    }

    private void selectFiles() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(intent, PICK_FILES);
    }

    private void openFolder() {
        if (destinationTreeUri == null) {
            toast("Choose a workspace folder first.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.putExtra(
                DocumentsContract.EXTRA_INITIAL_URI,
                destinationTreeUri
        );
        intent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        startActivity(intent);
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {
        super.onActivityResult(requestCode, resultCode, data);

        if (resultCode != RESULT_OK || data == null) {
            return;
        }

        if (requestCode == PICK_FOLDER) {
            Uri tree = data.getData();
            if (tree == null) {
                return;
            }

            int flags = data.getFlags()
                    & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            try {
                getContentResolver().takePersistableUriPermission(tree, flags);
            } catch (SecurityException ignored) {
            }

            destinationTreeUri = tree;
            prefs.edit().putString(PREF_TREE_URI, tree.toString()).apply();
            refreshUi();
            return;
        }

        if (requestCode == PICK_FILES) {
            selectedUris.clear();
            selectedNames.clear();

            if (data.getClipData() != null) {
                for (int i = 0;
                     i < data.getClipData().getItemCount();
                     i++) {
                    addSelection(
                            data.getClipData().getItemAt(i).getUri()
                    );
                }
            } else if (data.getData() != null) {
                addSelection(data.getData());
            }

            refreshUi();
        }
    }

    private void addSelection(Uri uri) {
        try {
            getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (SecurityException ignored) {
        }

        selectedUris.add(uri);
        selectedNames.add(getDisplayName(uri));
    }

    private void copySelectedFiles() {
        if (destinationTreeUri == null) {
            toast("Choose a workspace folder first.");
            return;
        }

        if (selectedUris.isEmpty()) {
            toast("Select at least one file.");
            return;
        }

        new Thread(() -> {
            int copied = 0;
            int failed = 0;
            ArrayList<String> failures = new ArrayList<>();

            for (int i = 0; i < selectedUris.size(); i++) {
                String name = selectedNames.get(i);

                try {
                    copyOne(selectedUris.get(i), name);
                    copied++;
                } catch (Exception e) {
                    failed++;
                    failures.add(name + ": " + safeError(e));
                }
            }

            final int done = copied;
            final int errors = failed;
            final String failureDetails = String.join("\n", failures);

            runOnUiThread(() -> {
                if (errors == 0) {
                    toast("Copied: " + done);
                } else {
                    toast("Copied: " + done + " | Failed: " + errors
                            + "\n" + failureDetails);
                }
            });
        }).start();
    }

    private void copyOne(
            Uri sourceUri,
            String originalName
    ) throws IOException {

        String safeName = nextAvailableName(originalName);
        String mime = getContentResolver().getType(sourceUri);

        if (mime == null) {
            mime = "application/octet-stream";
        }

        String destinationDocumentId =
                DocumentsContract.getTreeDocumentId(destinationTreeUri);

        Uri destinationDocumentUri =
                DocumentsContract.buildDocumentUriUsingTree(
                        destinationTreeUri,
                        destinationDocumentId
                );

        Uri targetUri = DocumentsContract.createDocument(
                getContentResolver(),
                destinationDocumentUri,
                mime,
                safeName
        );

        if (targetUri == null) {
            throw new IOException("Unable to create target document");
        }

        try (
                InputStream in =
                        getContentResolver().openInputStream(sourceUri);
                OutputStream out =
                        getContentResolver().openOutputStream(
                                targetUri, "w")
        ) {
            if (in == null || out == null) {
                throw new IOException("Unable to open source or target");
            }

            byte[] buffer = new byte[1024 * 1024];
            int read;

            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }

            out.flush();
        }
    }

    private String nextAvailableName(String requested) {
        Set<String> existing = listChildrenNames();

        if (!existing.contains(requested)) {
            return requested;
        }

        int dot = requested.lastIndexOf('.');
        String base = dot > 0
                ? requested.substring(0, dot)
                : requested;
        String ext = dot > 0
                ? requested.substring(dot)
                : "";

        for (int n = 1; n < 100000; n++) {
            String candidate = base + "_" + n + ext;
            if (!existing.contains(candidate)) {
                return candidate;
            }
        }

        return base + "_" + System.currentTimeMillis() + ext;
    }

    private Set<String> listChildrenNames() {
        HashSet<String> names = new HashSet<>();

        Uri childrenUri =
                DocumentsContract.buildChildDocumentsUriUsingTree(
                        destinationTreeUri,
                        DocumentsContract.getTreeDocumentId(
                                destinationTreeUri
                        )
                );

        String[] projection = new String[]{
                DocumentsContract.Document.COLUMN_DISPLAY_NAME
        };

        try (Cursor c = getContentResolver().query(
                childrenUri, projection, null, null, null)) {

            if (c != null) {
                int nameIndex = c.getColumnIndex(
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME
                );

                while (c.moveToNext() && nameIndex >= 0) {
                    names.add(c.getString(nameIndex));
                }
            }
        } catch (Exception ignored) {
        }

        return names;
    }

    private String getDisplayName(Uri uri) {
        String fallback = uri.getLastPathSegment();

        try (Cursor c = getContentResolver().query(
                uri,
                new String[]{OpenableColumns.DISPLAY_NAME},
                null,
                null,
                null
        )) {
            if (c != null && c.moveToFirst()) {
                int index = c.getColumnIndex(
                        OpenableColumns.DISPLAY_NAME
                );

                if (index >= 0) {
                    String name = c.getString(index);
                    if (name != null && !name.isBlank()) {
                        return name;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return fallback == null ? "file" : fallback;
    }

    private void refreshUi() {
        if (destinationView == null
                || filesView == null
                || githubView == null) {
            return;
        }

        destinationView.setText(
                destinationTreeUri == null
                        ? "Workspace: not selected"
                        : "Workspace: selected"
        );

        githubView.setText(
                "GitHub intake: " + GitHubIntakeClient.REPOSITORY
                        + "\nAccess: "
                        + (tokenStore.hasToken()
                        ? "configured for this session"
                        : "not configured")
                        + "\nCredential storage: session-only"
        );

        if (selectedNames.isEmpty()) {
            filesView.setText("No files selected.");
            return;
        }

        StringBuilder sb =
                new StringBuilder("Selected files:\n");

        for (String name : selectedNames) {
            sb.append("• ").append(name).append('\n');
        }

        filesView.setText(sb.toString());
    }

    private void toast(String message) {
        Toast.makeText(
                MainActivity.this,
                message,
                Toast.LENGTH_SHORT
        ).show();
    }
}
