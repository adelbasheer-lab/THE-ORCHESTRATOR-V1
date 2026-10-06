package com.orchestrator.localuploader;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public final class SecureTokenStore {
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "orchestrator_github_intake_token";
    private static final String PREFS = "local_uploader";
    private static final String TOKEN_KEY = "github_token_encrypted";

    private SecureTokenStore() {
    }

    public static void save(Context context, String token) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);

        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));

        ByteBuffer buffer = ByteBuffer.allocate(4 + iv.length + encrypted.length);
        buffer.putInt(iv.length);
        buffer.put(iv);
        buffer.put(encrypted);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(TOKEN_KEY, Base64.encodeToString(buffer.array(), Base64.NO_WRAP))
                .apply();
    }

    public static String load(Context context) throws Exception {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String encoded = prefs.getString(TOKEN_KEY, null);
        if (encoded == null || encoded.isBlank()) {
            return null;
        }

        byte[] combined = Base64.decode(encoded, Base64.DEFAULT);
        ByteBuffer buffer = ByteBuffer.wrap(combined);

        int ivLength = buffer.getInt();
        if (ivLength <= 0 || ivLength > 32 || buffer.remaining() <= ivLength) {
            throw new IllegalStateException("Stored token data is invalid");
        }

        byte[] iv = new byte[ivLength];
        buffer.get(iv);

        byte[] encrypted = new byte[buffer.remaining()];
        buffer.get(encrypted);

        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));

        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(TOKEN_KEY)
                .apply();
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                KEYSTORE
        );

        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());

        return generator.generateKey();
    }
}
