package com.orchestrator.localuploader;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

public final class GitHubTokenStore {
    private static final String PREFS = "github_intake";
    private static final String PREF_TOKEN_BLOB = "token_blob";
    private static final String KEY_ALIAS = "orchestrator_github_token";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";

    private final SharedPreferences prefs;
    private final SecureRandom random = new SecureRandom();

    public GitHubTokenStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public boolean hasToken() {
        return prefs.getString(PREF_TOKEN_BLOB, null) != null;
    }

    public void saveToken(String token) throws Exception {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token is empty");
        }

        byte[] iv = new byte[12];
        random.nextBytes(iv);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(),
                new GCMParameterSpec(128, iv));

        byte[] ciphertext = cipher.doFinal(
                token.trim().getBytes(StandardCharsets.UTF_8));

        String blob = Base64.encodeToString(iv, Base64.NO_WRAP)
                + "." + Base64.encodeToString(ciphertext, Base64.NO_WRAP);

        prefs.edit().putString(PREF_TOKEN_BLOB, blob).apply();
    }

    public String getToken() throws Exception {
        String blob = prefs.getString(PREF_TOKEN_BLOB, null);
        if (blob == null || blob.isBlank()) return null;

        String[] parts = blob.split("\\.", 2);
        if (parts.length != 2) {
            throw new IllegalStateException("Stored token data is invalid");
        }

        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(),
                new GCMParameterSpec(128, iv));

        return new String(cipher.doFinal(ciphertext),
                StandardCharsets.UTF_8);
    }

    public void clear() {
        prefs.edit().remove(PREF_TOKEN_BLOB).apply();
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);

        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT
                        | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(
                        KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());

        return generator.generateKey();
    }
}
