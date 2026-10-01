import "server-only";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { SESSION_COOKIE, signSession, type SessionPayload } from "./session";

const CANDIDATOS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function chromePath() {
  const p = process.env.CHROME_PATH || CANDIDATOS.find((c) => fs.existsSync(c));
  if (!p) throw new Error("Chrome/Chromium não encontrado. Configure CHROME_PATH no .env.");
  return p;
}

/** Abre a página de impressão com uma sessão temporária do próprio usuário e gera o PDF. */
export async function gerarPdf(baseUrl: string, laudoId: string, session: SessionPayload) {
  const token = await signSession(session, 120);
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setCookie({ name: SESSION_COOKIE, value: token, url: baseUrl, httpOnly: true });
    const res = await page.goto(`${baseUrl}/imprimir/${laudoId}`, { waitUntil: "networkidle0", timeout: 60_000 });
    if (!res?.ok()) throw new Error(`Falha ao abrir a página do laudo (${res?.status()})`);
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}
