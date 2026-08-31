import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const phase = process.argv[2] || "baseline-authorized";
const projects = ["mobile-small", "mobile", "mobile-large", "tablet", "tablet-landscape", "notebook", "desktop", "desktop-large"];
const dimensions = ["320×568", "375×667", "430×932", "768×1024", "1024×768", "1280×720", "1440×900", "1920×1080"];
const patterns = [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "/*");
const rows = projects.map((project) => {
  const path = `tmp/responsive/${phase}/${project}/routes.json`;
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
});
const isUnavailable = (r) => !r || (r.actualPath !== r.path && r.pattern !== "/") || (r.pattern !== "*" && /não encontrad[oa]/i.test(r.text || ""));
const status = (r) => isUnavailable(r) ? "NÃO VALIDADA" : r.errors.length ? "FAIL erro" : r.overflow || r.outside.length ? "FAIL P0/P1" : "DOM OK¹";
const lines = ["# Auditoria de responsividade — Joia Labs", "", `Coleta: ${phase}. ${new Date().toISOString()}. ${patterns.length} rotas (inclui redirect / e fallback *).`, "", "Ambiente local, navegador Chromium/Chrome com backend sintético interceptado; IA desligada. Nenhum acesso/mutação ao banco real. Coleta anterior às correções de UI quando phase=baseline-authorized.", "", "¹ DOM OK não é aprovação visual ou funcional completa. Mede geometria e erros de página na tela inicial. Abas/dialogs, estados extremos, teclado físico e zoom exigem evidências separadas. NÃO VALIDADA indica ausência, redirect indevido ou fixture de detalhe indisponível. O recorte overflow-x-clip existente foi detectado pela posição dos controles, não apenas pelo scrollWidth do body.", "", "| Rota | " + dimensions.join(" | ") + " | Problemas |", "|---|" + projects.map(() => "---|").join("") + "---|" ];
for (const pattern of patterns) {
  const selected = rows.map((row) => row.find((r) => r.pattern === pattern));
  const problems = [...new Set(selected.flatMap((r) => r ? [...r.outside.map((o) => `${o.tag} ${o.text}`), ...r.errors] : []))].slice(0, 5).join("; ").replaceAll("|", "/");
  lines.push(`| ${pattern} | ${selected.map(status).join(" | ")} | ${problems || "Sem achado geométrico nesta amostra; revisão visual separada"} |`);
}
lines.push("", "## Prioridades identificadas antes das correções", "", "- P0: conteúdo de Meu Dia com nomes longos excede 1000px e é cortado pelo shell em 320/375; ações inacessíveis apesar de scrollWidth global normal.", "- P0: dialogs base sem limite de altura; formulários longos podem ultrapassar viewport curta.", "- P1: ações do projeto sem wrap, cabeçalhos comprimidos, tabs e selects com mínimos incompatíveis com telas pequenas.", "- P1: card de tarefa inteiro touch-none; scroll touch conflita com drag; sidebar móvel não fecha explicitamente ao navegar.", "- P2: ações importantes menores que 44px; espaçamento e grids fixos de formulários; notificações com altura fixa.", "- P3: refinamentos serão feitos somente após corrigir utilização/interação.", "", "## Evidência e limites", "", `JSON e screenshots: tmp/responsive/${phase}/<viewport>/. Screenshots completos nas larguras 375, 768, 1440.`, "", "A primeira coleta baseline usou papel insuficiente nos mocks e redirecionou rotas administrativas; não é evidência dessas telas. baseline-authorized corrige o papel sintético admin_joia e usa fixture diagnostic_templates. Nenhuma regra de autorização da aplicação foi alterada.", "", "Consulte RESPONSIVE_FINAL_REPORT.md para alterações, testes de interação, comparação e pendências. Produção, teclado nativo iOS/Android e zoom nativo não são inferidos de emulação." );
mkdirSync("docs/relatorios", { recursive: true });
writeFileSync(phase.startsWith("baseline") ? "docs/relatorios/RESPONSIVE_AUDIT.md" : "docs/relatorios/RESPONSIVE_GEOMETRY_RESULTS.md", lines.join("\n") + "\n");
const inventory = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(tsx|css)$/.test(entry.name)) readFileSync(path, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (/\b(?:w|min-w|max-w|h|min-h|max-h)-\[|100vh|(?:width|height):|overflow-(?:hidden|x-clip)|grid-cols-\d/.test(line)) inventory.push({ path, line: i + 1, code: line.trim() });
    });
  }
}
walk("src");
writeFileSync(`tmp/responsive/${phase}/source-inventory.json`, JSON.stringify(inventory, null, 2));
console.log(JSON.stringify({ phase, routes: patterns.length, collected: rows.map((row, i) => ({ viewport: dimensions[i], count: row.length, failures: row.filter((r) => status(r).startsWith("FAIL")).length, unavailable: row.filter(isUnavailable).length })), fixedDimensionOccurrences: inventory.length }, null, 2));

if (!phase.startsWith("baseline") && existsSync("tmp/responsive/expanded/states.json")) {
  const states = JSON.parse(readFileSync("tmp/responsive/expanded/states.json", "utf8"));
  const groups = new Map();
  for (const item of states) {
    const key = `${item.pattern} / ${item.state}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const coverage = ["# Cobertura geométrica de rotas e estados", "", `${states.length} medições; ${groups.size} combinações rota/estado. A coleta inclui estado inicial e abas visíveis, não todas as mutações de negócio. DOM OK não equivale a aprovação visual.`, "", "| Rota / estado | " + dimensions.join(" | ") + " |", "|---|" + projects.map(() => "---|").join("")];
  for (const [key, items] of groups) coverage.push(`| ${key.replaceAll("|", "/")} | ${projects.map((project) => {
    const item = items.find((row) => row.viewport === project);
    return !item ? "NÃO VALIDADA" : item.errors.length || item.overflow || item.outside.length ? "FAIL" : "DOM OK";
  }).join(" | ")} |`);
  coverage.push("", "Fonte: tmp/responsive/expanded/states.json. Dados sintéticos; sem operações no backend real. Consulte RESPONSIVE_FINAL_REPORT.md para interações, evidência visual e limites.");
  writeFileSync("docs/relatorios/RESPONSIVE_STATE_COVERAGE.md", coverage.join("\n") + "\n");
  console.log(JSON.stringify({ stateMeasurements: states.length, routeStates: groups.size, stateFailures: states.filter((item) => item.errors.length || item.overflow || item.outside.length).length }));
}
