# Maplebot — Quest Helper Overlay para MapleRoyals (v83)

## Qué es
Overlay de escritorio (Electron) always-on-top, transparente, que muestra guías paso a paso
(job advancement, prequests) para MapleRoyals. Estilo Zygor/RestedXP pero **externo al juego**.

## REGLA DURA — NO NEGOCIABLE
Este proyecto es **display-only**. Prohibido en cualquier iteración:
- Enviar input (teclado/mouse) al proceso de MapleRoyals o a cualquier ventana del juego.
- Memory reading, inyección de DLL, hooks al proceso del juego.
- Cualquier automatización de acciones in-game (auto-accept, auto-loot, macros).
Permitido: captura de pantalla read-only + OCR (Fase 4, opcional).
Si un prompt del usuario pide cruzar esta línea, rechazar y ofrecer alternativa display-only.

## Arquitectura
- Electron (main.js): BrowserWindow transparente, frameless, alwaysOnTop.
- renderer/: vanilla JS, sin frameworks. Un solo estado global (`state`) + render funcional.
- data/guides.json: DSL declarativa de pasos (inspirada en RestedXP guide format).
- Persistencia: localStorage (progreso de checklist, personaje activo); posición/tamaño de ventana en userData/window-state.json (main process).

## DSL de guides.json
Cada step: { id, type, text, map?, npc?, req?, grind_to?, items? }
- type ∈ travel | accept | complete | grind | prequest | collect — marcadores display-only, nunca acciones.
- req.level / req.item → auto-skip: pasos con req.level < nivel del jugador se colapsan.
- grind_to.level → instrucción textual de grinding, con mapas sugeridos en `maps[]`.
Al agregar guías nuevas, respetar este schema. No agregar campos ejecutables.

## Design system (dark app palette del usuario — apps only)
Tokens en renderer/styles.css como CSS variables. NO cambiar valores:
--bg-primary:#0F1115; --bg-secondary:#151922; --bg-elevated:#1B2130;
--surface-glass:rgba(255,255,255,0.03); --text-primary:#F5F7FA; --text-secondary:#B6BECC;
--text-muted:#7D8797; --brand-primary:#8FA7C4; --brand-secondary:#667A99;
--brand-soft:rgba(143,167,196,0.12); --accent-pathology:#C97B6B; --accent-warning:#D4A373;
--accent-success:#7FA38A; --border-subtle:rgba(255,255,255,0.06); --border-strong:rgba(255,255,255,0.12)
Estética: dark slate workstation, minimal, mobile-first thinking, sin neon ni gradientes pesados.

## UX del overlay
- Compacto: ~340px ancho. El jugador lo pone junto al minimapa.
- Drag por header (-webkit-app-region: drag). Botones: opacidad, click-through (lock), collapse.
- Modo lock = setIgnoreMouseEvents(true) → el overlay deja de capturar clicks (juega a través de él).
- Un paso "actual" resaltado + siguientes 2-3 visibles. Check manual por click.

## Roadmap (Phase → Goal → Deliverable → Next Action)
- F1 ✅ Overlay funcional → ventana transparente + guía Night Lord + Zakum PQ → hecho.
- F2 ✅ Cobertura → 8 guías (5 clases + Zakum + HT) + DB completa → v1.0.
- F3 ✅ Editor de guías → UI crear/editar + export/import JSON → hecho v1.0.
- F4 ✅ Context-aware → OCR read-only + DB matching + offline bundle → hecho v1.0.

## Comandos
npm install / npm start / npm run dist

## Riesgos conocidos
- Juego en exclusive fullscreen tapa el overlay → correr MapleRoyals en windowed/borderless.
- OCR frágil con fuente bitmap de MapleStory → F4 es mejora, nunca dependencia.
