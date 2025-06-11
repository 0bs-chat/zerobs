import { httpAction } from "../../_generated/server";
import { requireAuth } from "../helpers";

const GITHUB_CLIENT_ID = process.env.AUTH_GITHUB_REPO_ID;
const GITHUB_CLIENT_SECRET = process.env.AUTH_GITHUB_REPO_SECRET;

export const handleCallback = httpAction(async (_ctx, request) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return new Response("GitHub credentials not configured", { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state parameter", { status: 400 });
    }

    // Fetch the user's github token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.CONVEX_SITE_URL}/github_repo/callback`,
        }),
      },
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from GitHub");
    }

    // Use the access token to get user information from GitHub
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!githubUserResponse.ok) {
      throw new Error("Failed to get GitHub user information");
    }

    await fetch(`${process.env.CONVEX_SITE_URL}/apiKeys/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state}`,
      },
      body: JSON.stringify({
        name: "github_access_token",
        key: accessToken,
      }),
    });

    const redirectUrl = new URL(`${process.env.SITE_URL || "/"}`);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

export const handleRedirect = httpAction(async (ctx, _request) => {
  const { user } = await requireAuth(ctx);
  const token = user.subject.split("|")[1]

  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", process.env.AUTH_GITHUB_REPO_ID || "");
  oauthUrl.searchParams.set("redirect_uri", `${process.env.CONVEX_SITE_URL}/github_repo/callback`);
  oauthUrl.searchParams.set("state", token);
  oauthUrl.searchParams.set("scope", "repo read:org");

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl.toString(),
    },
  });
});