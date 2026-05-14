# Capyppuccin

Tema customizado para o tracker **[Capybara BR](https://capybarabr.com)**, sobre o Material Design v3 Dark do UNIT3D. Inspirado em [Catppuccin Mocha](https://catppuccin.com), com cantos arredondados, shadows suaves e duas variantes de paleta.

## Variantes

- **Capyppuccin (padrão)** — amarelo pastel sobre charcoal quente. Escala `soft → cream → yellow → honey` em torno de `#f9e2af`.
- **Teal** — Tailwind teal sobre charcoal frio. Escala em torno de `#2dd4bf`.

Estrutura, regras e comportamento são idênticos; só o `:root` muda. Green/red/blue/mauve dos seeders, leechers, links e accents são comuns.

## O que muda

- **Hierarquia de accent em 4 tons** — botões, links e active states no accent forte; hover sobe pro cream; honey nos contadores e dropdowns; soft em estados muito leves.
- **Superfícies charcoal** — sem o roxo do Mocha original.
- **Hover / focus consistentes** — honey no hover, accent no focus, em todos os inputs.
- **Cards mais pronunciados** — `border-radius` 10/14/20px; posts do fórum, comentários e mensagens de chat ficam como cards distintos.
- **Hierarquia tipográfica nos fóruns** — section heads em small-caps, títulos de tópicos destacados, contadores honey.
- **Ícones de torrent pastel** — FREE / INTERNAL / sticky / hr / freeleech remapeados para tons da paleta.
- **Padrão único de tabs** — secondary nav, panel tabs, chat tabs e bbcode editor compartilham hover (surface-1 lift) e active (accent + bold).

## Instalação

No tracker, vai em **Minhas Configurações → Style → Tema: Material Design 3 Dark →  External css stylesheet** e cola uma das URLs:

```
# Padrão (~25 KB)
https://gfrcr.github.io/UNIT3D_custom/capyppuccin.min.css

# Padrão + background de capivara repetido no body
https://gfrcr.github.io/UNIT3D_custom/capyppuccin-bg.min.css

# Variante teal
https://gfrcr.github.io/UNIT3D_custom/capyppuccin-teal.min.css

# Variante teal + background de capivara
https://gfrcr.github.io/UNIT3D_custom/capyppuccin-teal-bg.min.css
```

Hard-refresh (`Ctrl+Shift+R`) na primeira vez. Pra desativar, apaga a URL do campo.

## Paleta

### Capyppuccin (padrão)

| Papel | Hex |
|------|-----|
| Yellow scale | `#fff8c5` soft · `#fce087` cream · `#f9e2af` **yellow** · `#e8c573` honey |
| Warm complement | `#fab387` peach · `#f5e0dc` rosewater |
| Surfaces | `#161412` base · `#0e0d0c` mantle · `#221f1c` surface-0 · `#2f2b27` surface-1 |
| Text | `#ebe2cf` text · `#b8b1a0` subtext · `#7d7869` overlay |
| Seeders / Success | `#a6e3a1` green |
| Leechers / Danger | `#f38ba8` red |
| Links / Info | `#89b4fa` blue |
| Premium accent | `#cba6f7` mauve |

### Teal

| Papel | Hex |
|------|-----|
| Teal scale | `#ccfbf1` soft · `#5eead4` cream · `#2dd4bf` **teal** · `#14b8a6` honey |
| Surfaces | `#0e1110` base · `#07090a` mantle · `#161a19` surface-0 · `#1f2422` surface-1 |
| Text | `#cfebe5` text · `#a0b8b1` subtext · `#697d78` overlay |

(Semantic colors — green/red/blue/mauve — herdados da variante padrão.)

## Adicionando uma variante

1. `cp src/_palette-capyppuccin.css src/_palette-<nome>.css`
2. Trocar os hexes em `:root` + os assets palette-derivados no fim (`--checkbox-check-svg`, `--forum-tag-*-wash`).
3. Abrir PR. CI roda `scripts/test-variants.sh` que valida:
   - paridade de variáveis com a canonical (mesmo conjunto de `--*` declarados)
   - nenhum literal de paleta vazou pro `_core.css`
   - número de seletores estável (catch silent regression)
   - cada variante minifica sem erro
   - **distância mínima entre paletas**: a variante nova precisa diferir em pelo menos 16 valores de variáveis vs cada paleta existente (evita variantes near-duplicate)

O workflow `Minify CSS` builda automaticamente `capyppuccin-<nome>.min.css` (e `-bg.min.css` se houver wrapper) no merge.
