package com.orchestrator.localuploader;

/**
 * Session-only GitHub credential holder.
 *
 * The token is deliberately kept only in process memory. It is never written
 * to SharedPreferences, files, logs, or the Android Keystore.
 *
 * The credential disappears when the app process is terminated.
 */
public final class GitHubTokenStore {

    private volatile String token;

    public GitHubTokenStore() {\n    }\n\n    public boolean hasToken() {
        return token != null && !token.isBlank();
    }

    public void saveToken(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Token is empty");
        }
        token = value.trim();
    }

    public String getToken() {
        String value = token;
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    public void clear() {
        token = null;
    }
}
