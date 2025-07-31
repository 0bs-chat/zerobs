import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import clipboardy from "clipboardy";

async function generateJWTKeys() {
  console.log("🔑 Generating JWT keys...");

  try {
    // Generate RSA key pair
    const keys = await generateKeyPair("RS256", {
      extractable: true,
    });

    // Export private key in PKCS8 format
    const privateKeyPem = await exportPKCS8(keys.privateKey);

    // Format private key for environment variable (single line)
    const privateKeyFormatted = privateKeyPem.trimEnd().replace(/\n/g, " ");

    // Export public key as JWK
    const publicKeyJwk = await exportJWK(keys.publicKey);

    // Create JWKS (JSON Web Key Set)
    const jwks = JSON.stringify({
      keys: [
        {
          use: "sig",
          ...publicKeyJwk,
        },
      ],
    });

    // Print the keys
    console.log("\n" + "=".repeat(80));
    console.log("🔐 GENERATED JWT KEYS");
    console.log("=".repeat(80));

    console.log("\n📋 JWT_PRIVATE_KEY:");
    console.log("-".repeat(50));
    console.log(privateKeyFormatted);

    console.log("\n📋 JWKS:");
    console.log("-".repeat(50));
    console.log(jwks);

    console.log("\n📋 JWKS (Pretty formatted):");
    console.log("-".repeat(50));
    console.log(JSON.stringify(JSON.parse(jwks), null, 2));

    // Copy to clipboard
    const clipboardContent = `JWT_PRIVATE_KEY="${privateKeyFormatted}"\n\nJWKS='${jwks}'`;

    try {
      await clipboardy.write(clipboardContent);
      console.log("\n✅ Keys copied to clipboard!");
      console.log(
        "📋 Clipboard contains both JWT_PRIVATE_KEY and JWKS ready for use",
      );
    } catch (clipboardError) {
      console.log("\n⚠️  Could not copy to clipboard automatically.");
      console.log("💡 You can manually copy the keys above.");
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 Key generation complete!");
    console.log("=".repeat(80));

    return {
      privateKey: privateKeyFormatted,
      jwks: jwks,
      publicKey: publicKeyJwk,
    };
  } catch (error) {
    console.error("❌ Error generating JWT keys:", error);
    throw error;
  }
}

async function main() {
  try {
    const keys = await generateJWTKeys();

    // Optional: Show usage instructions
    console.log("\n📖 Usage Instructions:");
    console.log("• Use JWT_PRIVATE_KEY in your environment variables");
    console.log("• Use JWKS for your JSON Web Key Set endpoint");
    console.log("• The keys are now in your clipboard for easy pasting");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Run the script
main();
