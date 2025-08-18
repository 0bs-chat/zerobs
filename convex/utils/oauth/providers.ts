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
    tokenAcceptJson?: boolean;
    includeGrantTypeOnAuthCode?: boolean;
    includeGrantTypeOnRefresh?: boolean;
    returnsRefreshToken?: boolean;
    extraAuthParams?: Record<string, string>;
  };
} = {
  convex: {
    title: "Vibz Coding",
    description: "Connect to Convex to enable vibe coding.",
    icon: "https://www.google.com/s2/favicons?sz=32&domain_url=https%3A%2F%2Fwww.convex.dev",
    clientIdKey: "AUTH_CONVEX_ID",
    clientSecretKey: "AUTH_CONVEX_SECRET",
    scope: "team", // Convex uses team-scoped tokens by default
    authUrl: new URL("https://dashboard.convex.dev/oauth/authorize/team"),
    tokenUrl: new URL("https://api.convex.dev/oauth/token"),
    accessKeyKey: "CONVEX_ACCESS_TOKEN",
    refreshKeyKey: "CONVEX_REFRESH_TOKEN",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: true,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: false,
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
    description:
      "Connect to GitHub to access your repositories and manage code.",
    icon: "https://github.com/favicon.ico",
    clientIdKey: "AUTH_GITHUB_ID",
    clientSecretKey: "AUTH_GITHUB_SECRET",
    scope: ["repo", "user"].join(" "),
    authUrl: new URL("https://github.com/login/oauth/authorize"),
    tokenUrl: new URL("https://github.com/login/oauth/access_token"),
    accessKeyKey: "GITHUB_ACCESS_TOKEN",
    refreshKeyKey: "GITHUB_REFRESH_TOKEN",
    tokenAcceptJson: true,
    includeGrantTypeOnAuthCode: false,
    includeGrantTypeOnRefresh: true,
    returnsRefreshToken: false,
  },
};
