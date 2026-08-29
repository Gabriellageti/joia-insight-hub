import { access, readFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const requiredIcons = [
  ["icons/icon-192.png", 192],
  ["icons/icon-512.png", 512],
  ["icons/icon-maskable-512.png", 512],
  ["icons/apple-touch-icon.png", 180],
  ["icons/favicon-32.png", 32],
  ["icons/badge-96.png", 96],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngDimensions(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  assert(buffer.subarray(0, 8).toString("hex") === pngSignature, "Arquivo de ícone não é um PNG válido");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifest = JSON.parse(await readFile(path.join(dist, "manifest.webmanifest"), "utf8"));
assert(manifest.name === "JoIA Ops", "Nome do PWA ausente ou incorreto");
assert(manifest.display === "standalone", "PWA não está configurado para abrir como aplicativo");
assert(manifest.start_url.startsWith("/meu-dia"), "Rota inicial do PWA incorreta");
assert(manifest.icons?.some((icon) => icon.sizes === "192x192"), "Ícone 192x192 ausente no manifesto");
assert(manifest.icons?.some((icon) => icon.sizes === "512x512"), "Ícone 512x512 ausente no manifesto");
assert(manifest.icons?.some((icon) => icon.purpose === "maskable"), "Ícone maskable ausente no manifesto");

for (const [relativePath, expectedSize] of requiredIcons) {
  const iconPath = path.join(dist, relativePath);
  await access(iconPath);
  const dimensions = pngDimensions(await readFile(iconPath));
  assert(dimensions.width === expectedSize && dimensions.height === expectedSize, `${relativePath} possui dimensões incorretas`);
}

const html = await readFile(path.join(dist, "index.html"), "utf8");
assert(html.includes('rel="manifest"'), "Manifesto não foi associado ao HTML");
assert(html.includes('rel="apple-touch-icon"'), "Ícone de instalação do iPhone ausente");

const serviceWorker = await readFile(path.join(dist, "sw.js"), "utf8");
assert(serviceWorker.length > 1_000, "Service worker não foi gerado corretamente");
assert(!serviceWorker.includes("/rest/v1"), "Service worker não deve armazenar respostas do Supabase REST");
assert(!serviceWorker.includes("/auth/v1"), "Service worker não deve armazenar respostas de autenticação");

console.log(`PWA verificado: ${manifest.name}, ${manifest.icons.length} ícones no manifesto e service worker gerado.`);
