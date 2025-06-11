import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { execSync } from "child_process";
import readline from "readline";

function runCommand(command, message, ignoreError = false) {
  console.log(message);
  try {
    execSync(command, { stdio: "inherit" });
    console.log("✔️ Command executed successfully.");
  } catch (error) {
    if (!ignoreError) {
      console.error(`❌ Error executing command: ${command}`);
      console.error(error.message);
      process.exit(1);
    } else {
      console.warn(`⚠️ Command failed, but continuing: ${command}`);
      console.warn(error.message);
    }
  }
}

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
      resolve(answer.trim() === "" ? defaultValue : answer.trim());
    });
  });
}

async function collectEnvironmentVariables() {
  console.log("\n--- Please provide the following environment variables ---");

  /** @type {RequiredEnvVar[]} */
  const requiredVars = [
    { name: "FLY_API_TOKEN", prompt: "Enter FLY_API_TOKEN" },
    { name: "AUTH_GITHUB_REPO_ID", prompt: "Enter AUTH_GITHUB_REPO_ID" },
    { name: "AUTH_GITHUB_REPO_SECRET", prompt: "Enter AUTH_GITHUB_REPO_SECRET" },
  ];

  /** @type {OptionalEnvVar[]} */
  const optionalVars = [
    { name: "AUTH_GITHUB_ID", prompt: "Enter AUTH_GITHUB_ID" },
    { name: "AUTH_GITHUB_SECRET", prompt: "Enter AUTH_GITHUB_SECRET" },
    { name: "OPENAI_API_KEY", prompt: "Enter OPENAI_API_KEY" },
    { name: "GOOGLE_API_KEY", prompt: "Enter GOOGLE_API_KEY" },
    { name: "ANTHROPIC_API_KEY", prompt: "Enter ANTHROPIC_API_KEY" },
    { name: "TAVILY_API_KEY", prompt: "Enter TAVILY_API_KEY" },
    { name: "LANGSMITH_API_KEY", prompt: "Enter LANGSMITH_API_KEY" },
    { name: "LANGSMITH_ENDPOINT", prompt: "Enter LANGSMITH_ENDPOINT" },
    { name: "LANGSMITH_PROJECT", prompt: "Enter LANGSMITH_PROJECT" },
    { name: "LANGSMITH_TRACING", prompt: "Enter LANGSMITH_TRACING" },
    {
      name: "SITE_URL",
      prompt: "Enter SITE_URL for your application",
      defaultValue: "http://localhost:3000",
    },
    { name: "SERVICE_PASSWORD", prompt: "Enter SERVICE_PASSWORD" },
    { name: "CRAWLER_URL", prompt: "Enter CRAWLER_URL", defaultValue: "http://127.0.0.1:7860" },
    { name: "DOC_PROCESSOR_URL", prompt: "Enter DOC_PROCESSOR_URL", defaultValue: "http://127.0.0.1:7861" },
  ];

  const envVars = {};

  for (const { name, prompt } of requiredVars) {
    const value = await askQuestion(prompt);
    if (!value) {
      console.error(`Error: ${name} is a required environment variable.`);
      process.exit(1);
    }
    envVars[name] = value;
  }

  for (const { name, prompt, defaultValue } of optionalVars) {
    const value = await askQuestion(prompt, true, defaultValue);
    if (value) {
      envVars[name] = value;
    }
  }

  return envVars;
}

function setConvexEnvironmentVariables(envVars, jwtPrivateKey, jwks) {
  console.log("\n--- Setting Convex environment variables ---");

  const baseConvexCommands = [
    `bunx convex env set JWT_PRIVATE_KEY="${jwtPrivateKey}"`,
    `bunx convex env set JWKS='${jwks}'`,
  ];

  const dynamicConvexCommands = Object.entries(envVars).map(([key, value]) => {
    // Escape single quotes for JWKS if it contains them (though JSON.stringify handles this usually)
    const formattedValue =
      key === "JWKS" ? `'${value.replace(/'/g, "\\'")}'` : `"${value}"`;
    return `bunx convex env set ${key}=${formattedValue}`;
  });

  const allConvexCommands = [...baseConvexCommands, ...dynamicConvexCommands];

  for (const command of allConvexCommands) {
    const varNameMatch = command.match(/env set ([A-Z_]+)=/);
    const varName = varNameMatch ? varNameMatch[1] : "an environment variable";
    runCommand(command, `Setting ${varName}...`);
  }

  console.log("✅ Convex environment variables set successfully.");
}

async function setupConvex() {
  console.log("🚀 Starting Convex environment setup...");

  const keys = await generateKeyPair("RS256", {
    extractable: true,
  });
  // The private key needs to be trimmed and newlines replaced for shell command compatibility.
  const privateKey = (await exportPKCS8(keys.privateKey))
    .trimEnd()
    .replace(/\n/g, " ");
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  const collectedEnvVars = await collectEnvironmentVariables();

  // Add the internally generated keys to the collected variables for setting
  const allEnvVarsToSet = {
    ...collectedEnvVars,
    JWT_PRIVATE_KEY: privateKey,
    JWKS: jwks,
  };

  setConvexEnvironmentVariables(
    allEnvVarsToSet,
    allEnvVarsToSet.JWT_PRIVATE_KEY, // Pass specific values for clarity if needed, though they are in allEnvVarsToSet
    allEnvVarsToSet.JWKS,
  );

  console.log("\n🎉 Convex setup complete!");
}

async function main() {
  await setupConvex();

  console.log("\nAll setup tasks finished!");
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});