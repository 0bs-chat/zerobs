import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { execSync } from "child_process";
import readline from "readline";

// Function to run a shell command
function runCommand(command, message, ignoreError = false) {
  console.log(message);
  try {
    execSync(command, { stdio: "inherit" });
    console.log("✔️ Command executed successfully.");
  } catch (error) {
    if (!ignoreError) {
      console.error(`❌ Error executing command: ${command}`);
      console.error(error.message);
      process.exit(1); // Exit if an essential command fails
    } else {
      console.warn(`⚠️ Command failed, but continuing: ${command}`);
      console.warn(error.message);
    }
  }
}

// Function to prompt the user for input
async function askQuestion(query, optional = false, defaultValue = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let prompt = query;
    if (defaultValue) {
      prompt += ` (default: ${defaultValue})`;
    }
    if (optional) {
      prompt += " (optional)";
    }
    prompt += ": ";

    rl.question(prompt, (answer) => {
      rl.close();
      if (answer.trim() === "" && defaultValue !== "") {
        resolve(defaultValue);
      } else {
        resolve(answer.trim());
      }
    });
  });
}

async function setupConvex() {
  console.log("🚀 Starting Convex environment setup...");

  const keys = await generateKeyPair("RS256", {
    extractable: true,
  });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  // --- Prompt for Environment Variables ---
  console.log("\n--- Please provide the following environment variables ---");

  const openaiApiKey = await askQuestion("Enter OPENAI_API_KEY", true, "");
  const googleApiKey = await askQuestion("Enter GOOGLE_API_KEY", true, "");
  const anthropicApiKey = await askQuestion("Enter ANTHROPIC_API_KEY", true, "");
  const siteUrl = await askQuestion("Enter SITE_URL for your application", true, "http://localhost:3000");
  const runPodKey = await askQuestion("Enter RUN_POD_KEY", false, "");
  const runPodCrawlerId = await askQuestion("Enter RUN_POD_CRAWLER_ID", false, "");
  const runPodDocProcessorId = await askQuestion("Enter RUN_POD_DOC_PROCESSOR_ID", false, "");

  if (!runPodKey) {
    console.error("RUN_POD_KEY is required.");
    process.exit(1);
  }
  if (!runPodCrawlerId) {
    console.error("RUN_POD_CRAWLER_ID is required.");
    process.exit(1);
  }
  if (!runPodDocProcessorId) {
    console.error("RUN_POD_DOC_PROCESSOR_ID is required.");
    process.exit(1);
  }

  console.log("\n--- Setting Convex environment variables ---");

  // --- Dynamic Convex Commands ---
  const convexEnvCommands = [
    `bunx convex env set JWT_PRIVATE_KEY="${privateKey
      .trimEnd()
      .replace(/\n/g, " ")}"`,
    `bunx convex env set JWKS='${jwks}'`,
    `bunx convex env set SITE_URL="${siteUrl}"`,
    `bunx convex env set RUN_POD_KEY="${runPodKey}"`,
  ];

  if (openaiApiKey) {
    convexEnvCommands.push(
      `bunx convex env set OPENAI_API_KEY="${openaiApiKey}"`,
    );
  }
  if (googleApiKey) {
    convexEnvCommands.push(
      `bunx convex env set GOOGLE_API_KEY="${googleApiKey}"`,
    );
  }
  if (anthropicApiKey) {
    convexEnvCommands.push(
      `bunx convex env set ANTHROPIC_API_KEY="${anthropicApiKey}"`,
    );
  }

  for (const command of convexEnvCommands) {
    // Extract variable name for more specific logging
    const varNameMatch = command.match(/env set ([A-Z_]+)="?['"]?/);
    const varName = varNameMatch ? varNameMatch[1] : "an environment variable";
    runCommand(command, `Setting ${varName}...`);
  }

  console.log("✅ Convex environment variables set successfully.");
}

async function main() {
  await setupConvex();

  console.log("\n🎉 Setup script finished!");
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});