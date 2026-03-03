import { expect, type Page } from "@playwright/test";

const DEMO_ACCOUNTS = [
  { email: "admin@demo.dev", password: "password" },
  { email: "ic@demo.dev", password: "password" },
  { email: "engineer@demo.dev", password: "password" },
  { email: "viewer@demo.dev", password: "password" },
] as const;

let accountIndex = 0;

function nextDemoAccount() {
  const account = DEMO_ACCOUNTS[accountIndex % DEMO_ACCOUNTS.length]!;
  accountIndex += 1;
  return account;
}

export async function signInAsDemoAdmin(page: Page) {
  const attempts: string[] = [];
  let authenticated = false;

  for (let attempt = 0; attempt < DEMO_ACCOUNTS.length; attempt += 1) {
    const account = nextDemoAccount();
    const response = await page.request.post("/api/auth/signin", {
      data: {
        email: account.email,
        password: account.password,
      },
    });

    attempts.push(`${account.email}:${response.status()}`);
    if (response.ok()) {
      authenticated = true;
      break;
    }
  }

  expect(authenticated, `Unable to sign in demo users (${attempts.join(", ")})`).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("GreenLine Systems")).toBeVisible();
}
