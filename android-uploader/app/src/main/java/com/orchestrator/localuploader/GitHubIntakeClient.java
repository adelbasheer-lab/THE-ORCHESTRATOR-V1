package com.orchestrator.localuploader;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.UUID;

public final class GitHubIntakeClient {

    public static final String REPOSITORY =
            "adelbasheer-lab/THE-ORCHESTRATOR-INTAKE";

    private static final String API_BASE = "https://api.github.com";
    private static final String BRANCH = "main";
    private static final long MAX_FILE_BYTES =
            90L * 1024L * 1024L;

    private static final DateTimeFormatter PATH_TIME =
            DateTimeFormatter.ofPattern("yyyy/MM/dd/HH-mm-ss")
                    .withZone(ZoneOffset.UTC);

    private final GitHubTokenStore tokenStore;

    public GitHubIntakeClient(GitHubTokenStore tokenStore) {
        this.tokenStore = tokenStore;
    }

    public String createBatchId() {
        return PATH_TIME.format(Instant.now())
                + "-"
                + UUID.randomUUID().toString().substring(0, 8);
    }

    public void testConnection() throws Exception {
        String token = getTokenOrThrow();

        HttpURLConnection connection = openConnection(
                new URL(API_BASE + "/repos/" + REPOSITORY),
                "GET",
                token
        );

        int status = connection.getResponseCode();
        String body = readResponse(connection, status);

        if (status != HttpURLConnection.HTTP_OK) {
            throw new IOException(formatGitHubError(status, body));
        }

        if (!body.contains(REPOSITORY)) {
            throw new IOException("Unexpected repository response");
        }
    }

    public void uploadFile(
            ContentResolver resolver,
            Uri sourceUri,
            String originalName,
            String batchId
    ) throws Exception {

        String token = getTokenOrThrow();

        long size = getSize(resolver, sourceUri);
        if (size > MAX_FILE_BYTES) {
            throw new IOException("File exceeds 90 MiB limit");
        }

        String safeName = sanitizeFileName(originalName);
        String remotePath =
                "incoming/" + batchId + "/" + safeName;

        URL url = new URL(
                API_BASE
                        + "/repos/"
                        + REPOSITORY
                        + "/contents/"
                        + encodePath(remotePath)
        );

        HttpURLConnection connection =
                openConnection(url, "PUT", token);
        connection.setChunkedStreamingMode(1024 * 1024);

        String commitMessage =
                "ORCHESTRATOR intake: " + safeName;

        String prefix =
                "{\"message\":\""
                        + escapeJson(commitMessage)
                        + "\",\"content\":\"";

        String suffix =
                "\",\"branch\":\""
                        + BRANCH
                        + "\"}";

        try (OutputStream raw = connection.getOutputStream()) {
            raw.write(prefix.getBytes(StandardCharsets.UTF_8));

            try (
                    OutputStream encoded =
                            Base64.getEncoder().wrap(
                                    new NonClosingOutputStream(raw)
                            );
                    InputStream source = new BufferedInputStream(
                            resolver.openInputStream(sourceUri)
                    )
            ) {
                if (source == null) {
                    throw new IOException("Unable to open source file");
                }

                byte[] buffer = new byte[1024 * 1024];
                long total = 0;
                int read;

                while ((read = source.read(buffer)) != -1) {
                    total += read;

                    if (total > MAX_FILE_BYTES) {
                        throw new IOException(
                                "File exceeds 90 MiB limit"
                        );
                    }

                    encoded.write(buffer, 0, read);
                }
            }

            raw.write(suffix.getBytes(StandardCharsets.UTF_8));
            raw.flush();
        }

        int status = connection.getResponseCode();
        String body = readResponse(connection, status);

        if (status != HttpURLConnection.HTTP_CREATED
                && status != HttpURLConnection.HTTP_OK) {
            throw new IOException(formatGitHubError(status, body));
        }
    }

    private String getTokenOrThrow() throws Exception {
        String token = tokenStore.getToken();

        if (token == null || token.isBlank()) {
            throw new IOException(
                    "GitHub access is not configured"
            );
        }

        return token;
    }

    private HttpURLConnection openConnection(
            URL url,
            String method,
            String token
    ) throws IOException {

        HttpURLConnection connection =
                (HttpURLConnection) url.openConnection();

        connection.setRequestMethod(method);
        connection.setDoInput(true);
        connection.setConnectTimeout(20_000);
        connection.setReadTimeout(300_000);

        connection.setRequestProperty(
                "Accept",
                "application/vnd.github+json"
        );
        connection.setRequestProperty(
                "Authorization",
                "Bearer " + token
        );
        connection.setRequestProperty(
                "X-GitHub-Api-Version",
                "2022-11-28"
        );
        connection.setRequestProperty(
                "User-Agent",
                "ORCHESTRATOR-Local-Uploader/1.1"
        );

        if ("PUT".equals(method)) {
            connection.setDoOutput(true);
            connection.setRequestProperty(
                    "Content-Type",
                    "application/json; charset=utf-8"
            );
        }

        return connection;
    }

    private String readResponse(
            HttpURLConnection connection,
            int status
    ) throws IOException {

        InputStream stream = status >= 400
                ? connection.getErrorStream()
                : connection.getInputStream();

        if (stream == null) {
            return "";
        }

        try (InputStream in = stream) {
            byte[] data = in.readAllBytes();
            String response =
                    new String(data, StandardCharsets.UTF_8);

            return response.length() > 4096
                    ? response.substring(0, 4096)
                    : response;
        }
    }

    private String formatGitHubError(
            int status,
            String body
    ) {

        switch (status) {
            case HttpURLConnection.HTTP_UNAUTHORIZED:
                return "GitHub authentication failed (401)."
                        + " Reconfigure the token.";

            case HttpURLConnection.HTTP_FORBIDDEN:
                return "GitHub denied the request (403)."
                        + " Check token repository access and"
                        + " Contents write permission.";

            case HttpURLConnection.HTTP_NOT_FOUND:
                return "Intake repository was not found or"
                        + " the token cannot access it (404).";

            case HttpURLConnection.HTTP_CONFLICT:
                return "GitHub reported a conflict (409).";

            default:
                return "GitHub request failed ("
                        + status + "): " + body;
        }
    }

    private long getSize(
            ContentResolver resolver,
            Uri uri
    ) {

        try (Cursor cursor = resolver.query(
                uri,
                new String[]{OpenableColumns.SIZE},
                null,
                null,
                null
        )) {

            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(
                        OpenableColumns.SIZE
                );

                if (index >= 0 && !cursor.isNull(index)) {
                    return cursor.getLong(index);
                }
            }
        } catch (Exception ignored) {
        }

        return -1;
    }

    private String sanitizeFileName(String name) {
        String value =
                name == null || name.isBlank()
                        ? "file"
                        : name;

        value = value.replaceAll(
                "[\\\\/:*?\"<>|\\p{Cntrl}]",
                "_"
        ).trim();

        while (value.startsWith(".")) {
            value = "_" + value.substring(1);
        }

        return value.isBlank() ? "file" : value;
    }

    private String encodePath(String path) throws IOException {
        String[] segments = path.split("/");
        StringBuilder result = new StringBuilder();

        for (String segment : segments) {
            if (result.length() > 0) {
                result.append('/');
            }

            result.append(
                    URLEncoder.encode(
                            segment,
                            StandardCharsets.UTF_8
                    ).replace("+", "%20")
            );
        }

        return result.toString();
    }

    private String escapeJson(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private static final class NonClosingOutputStream
            extends OutputStream {

        private final OutputStream delegate;

        private NonClosingOutputStream(
                OutputStream delegate
        ) {
            this.delegate = delegate;
        }

        @Override
        public void write(int b) throws IOException {
            delegate.write(b);
        }

        @Override
        public void write(
                byte[] b,
                int off,
                int len
        ) throws IOException {
            delegate.write(b, off, len);
        }

        @Override
        public void flush() throws IOException {
            delegate.flush();
        }

        @Override
        public void close() throws IOException {
            delegate.flush();
        }
    }
}
