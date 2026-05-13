# Capyppuccin

Tema customizado para o tracker **[Capybara BR](https://capybarabr.com)**, sobre o Material Design v3 Dark do UNIT3D. Paleta amarelo-pastel inspirada em [Catppuccin Mocha](https://catppuccin.com) sobre superfícies charcoal quentes, com cantos arredondados e shadows mais suaves.

## O que muda

- **Paleta amarelo-dominante** — botões/links/active states em yellow pastel (`#f9e2af`), com hierarquia de 4 tons (soft → cream → yellow → honey).
- **Superfícies warm charcoal** — `#161412 / #0e0d0c / #221f1c / #2f2b27` (sem o roxo do Mocha original).
- **Texto warm off-white** — sem a tonalidade lavanda dos cinzas Material.
- **Hover / focus consistentes** — peach/honey no hover, yellow no focus, em todos os inputs.
- **Cards mais pronunciados** — `border-radius` 10/14/20px e shadows suaves; posts do fórum, comentários e mensagens de chat ficam como cards distintos.
- **Hierarquia tipográfica nos fóruns** — section heads em small-caps yellow, títulos de tópicos destacados, contadores honey.
- **Ícones de torrent pastel** — FREE / INTERNAL / sticky / hr / freeleech remapeados para tons da paleta (override de inline styles via `!important`).
- **Padrão único de tabs** — secondary nav, panel tabs, chat tabs e bbcode editor compartilham o mesmo hover (surface-1 lift) e active (yellow + bold).

## Instalação

No tracker, vai em **Settings → External css stylesheet** e cola uma das duas URLs:

```
# Tema (~25 KB)
https://gfrcr.github.io/UNIT3D_custom/capyppuccin.min.css

# Tema + background de capivara repetido no body
https://gfrcr.github.io/UNIT3D_custom/capyppuccin-bg.min.css
```

Hard-refresh (`Ctrl+Shift+R`) na primeira vez. Pra desativar, apaga a URL do campo.

## Paleta

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

