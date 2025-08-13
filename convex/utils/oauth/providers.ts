export const providers: {
  [key: string]: {
    title: string;
    description: string;
    icon: string;
    clientIdKey: string;
    clientSecretKey: string;
    scope: string;
    authUrl: URL;
    tokenUrl: URL;
    accessKeyKey: string;
    refreshKeyKey: string;
    // OAuth token exchange behavior
    tokenRequestFormat?: "json" | "form";
    tokenAcceptJson?: boolean;
    includeGrantTypeOnAuthCode?: boolean;
    includeGrantTypeOnRefresh?: boolean;
    returnsRefreshToken?: boolean;
    // Extra params to append to auth URL
    extraAuthParams?: Record<string, string>;
  };
} = {
  convex: {
    title: "Convex",
    description: "Connect to Convex to manage your projects and deployments.",
    icon: "https://www.google.com/s2/favicons?sz=32&domain_url=https%3A%2F%2Fwww.convex.dev",
    clientIdKey: "AUTH_CONVEX_ID",
    clientSecretKey: "AUTH_CONVEX_SECRET",
    scope: "team", // Convex uses team-scoped tokens by default
    authUrl: new URL("https://dashboard.convex.dev/oauth/authorize/team"),
    tokenUrl: new URL("https://api.convex.dev/oauth/token"),
    accessKeyKey: "CONVEX_ACCESS_TOKEN",
    refreshKeyKey: "CONVEX_REFRESH_TOKEN",
    tokenRequestFormat: "json",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: true,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: true,
  },
  google: {
    title: "Google",
    description: "Connect to Google to access your calendar and email.",
    icon: "https://www.google.com/favicon.ico",
    clientIdKey: "AUTH_GOOGLE_ID",
    clientSecretKey: "AUTH_GOOGLE_SECRET",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://mail.google.com/",
    ].join(" "),
    authUrl: new URL("https://accounts.google.com/o/oauth2/v2/auth"),
    tokenUrl: new URL("https://oauth2.googleapis.com/token"),
    accessKeyKey: "GOOGLE_ACCESS_TOKEN",
    refreshKeyKey: "GOOGLE_REFRESH_TOKEN",
    tokenRequestFormat: "form",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: true,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: true,
    extraAuthParams: {
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
    },
  },
  github: {
    title: "GitHub",
    description: "Connect to GitHub to access your repositories and manage code.",
    icon: "https://github.com/favicon.ico",
    clientIdKey: "AUTH_GITHUB_ID",
    clientSecretKey: "AUTH_GITHUB_SECRET",
    scope: [
      "repo",
      "user",
    ].join(" "),
    authUrl: new URL("https://github.com/login/oauth/authorize"),
    tokenUrl: new URL("https://github.com/login/oauth/access_token"),
    accessKeyKey: "GITHUB_ACCESS_TOKEN",
    refreshKeyKey: "GITHUB_REFRESH_TOKEN",
    tokenRequestFormat: "form",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: false,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: false,
  },
  notion: {
    title: "Notion",
    description: "Connect to Notion to access your notes and documents.",
    icon: "https://www.google.com/s2/favicons?sz=32&domain_url=https%3A%2F%2Fwww.notion.so",
    clientIdKey: "AUTH_NOTION_ID",
    clientSecretKey: "AUTH_NOTION_SECRET",
    scope: [
      "user:read",
      "user:write",
    ].join(" "),
    authUrl: new URL("https://api.notion.com/v1/oauth/authorize"),
    tokenUrl: new URL("https://api.notion.com/v1/oauth/token"),
    accessKeyKey: "NOTION_ACCESS_TOKEN",
    refreshKeyKey: "NOTION_REFRESH_TOKEN",
    tokenRequestFormat: "json",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: true,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: true,
  },
  twitter: {
    title: "Twitter",
    description: "Connect to Twitter to access your tweets and manage your account.",
    icon: "https://twitter.com/favicon.ico",
    clientIdKey: "AUTH_TWITTER_ID",
    clientSecretKey: "AUTH_TWITTER_SECRET",
    scope: [
      "tweet.read",
      "tweet.write",
    ].join(" "),
    authUrl: new URL("https://twitter.com/i/oauth2/authorize"),
    tokenUrl: new URL("https://api.x.com/2/oauth2/token"),
    accessKeyKey: "TWITTER_ACCESS_TOKEN",
    refreshKeyKey: "TWITTER_REFRESH_TOKEN",
    tokenRequestFormat: "form",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: true,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: true,
  },
};
