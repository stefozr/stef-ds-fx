# Stef's Auto FX for Draw Steel

Animations and sounds for Draw Steel abilities in Foundry VTT, played through
[Sequencer](https://foundryvtt.com/packages/sequencer). When a hero or monster uses an ability, the module plays a
cast, a weapon swing, arrow or bolt to each target, and an impact sized by that target's tier of success, picked from
the effect packs you already have installed. It works on its own; with
[Stef's Automation Suite for Draw Steel](https://github.com/stefozr/stef-ds-automation) it reads each card's targets from
the suite's record.

## Features

When an ability is used, this module plays a chain like Draw Steel Codex's:

1. **Cast:** a one-shot effect on the caster, for magic and psionic abilities and non-weapon areas.
2. **Area:** a burst or aura around the caster, or an effect over the cube, wall or line the ability was aimed with.
3. **Travel:** a weapon swing (the hero's own weapon type), arrow, thrown weapon or bolt to each target.
   - "Melee or ranged" abilities swing at adjacent targets and shoot at the others.
4. **Impact:** an effect on each target, sized by that target's own tier.
   - A tier 1 hit is fainter. A tier 3 hit flashes the target and briefly shakes the screen.
   - A critical tier 3 (natural 19 or 20) adds a flourish.
5. **Sounds** go with each step.

Heals, buffs and lasting zones look different from attacks: a heal glows on its targets, an aura or burst without
damage glows over the area instead of exploding, and a cube or wall without damage marks the ground.

The animation plays once the Dice So Nice dice have settled. It runs on the client of the user who used the ability,
and Sequencer shows it to everyone.

- Hand-picked **signature animations** for 13 showpiece abilities.
- An **Animation** section on every ability's Details tab: keep the automatic choice, pick your own files, or turn
  the animation off, with a Preview button.
- A **world rules editor** for the Director, with a ▶ button that auditions each row's candidates.
- Works next to **DS AA Bridge** and **Automated Animations** without modifying them.

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this manifest URL and press Install:

```
https://github.com/stefozr/stef-ds-fx/releases/latest/download/module.json
```

Then enable **Stef's Auto FX for Draw Steel** in your world's module settings.

## Requirements and compatible modules

| Module | Required? | What it adds or why |
| --- | --- | --- |
| Foundry VTT 14 | Required | Verified on 14.369. |
| Draw Steel system 1.1.2 | Required | The ability cards, power rolls and ability items the module reads. |
| [Sequencer](https://foundryvtt.com/packages/sequencer) | Required | Plays every animation and sound. |
| BLFX Assets Pack 01 (Boss Loot) | Recommended | The first choice for most rows and for every signature animation, effects and sounds. |
| JB2A (Patreon, or the free JB2A_DnD5e) | Recommended | Animations used where BLFX has no fitting file. |
| Eskie Effects | Recommended | Further fallback animations (cold impacts prefer Eskie). |
| PSFX (Patreon) | Optional | Sounds used when BLFX is not installed. |
| [Stef's Automation Suite for Draw Steel](https://github.com/stefozr/stef-ds-automation) | Optional | Takes each card's targets from the suite's resolution record, so every target gets its own tier animation even if the user's targets change. |
| DS AA Bridge / Automated Animations | Optional | The bridge can stay the default animator; see below. |

No effect files are bundled with this module. Each step lists several candidate files and plays the first one
installed on that client. A step with no installed candidate is skipped without an error.

## How the animation is chosen

Each choice is made in this order:

1. **The ability's own setting.** The **Animation** section is at the bottom of the ability's **Details** tab.
   - *Automatic*: follow the rules below.
   - *Custom*: pick the delivery and element, and/or list your own files per step.
   - *None*: no animation at all.
2. **Signature animation.** Showpiece abilities have a hand-picked animation built in, matched by the ability's
   Draw Steel id so every copy gets it: Power Chord, Choreography, Revitalizing Limerick, "Thunder Mother", Flip the
   Script, Incinerate, Mind Spike, Kinetic Grip, Unquiet Ground, Test of Rain, Purifying Fire, Judgement and
   Null Field. Each one looks different from what the automatic rules would pick. The **Signature animations**
   setting turns them off.
3. **What the ability does:**
   - *Heal*: its effect text heals ("spend a Recovery", "regain Stamina", a heal roll) and it deals no typed damage.
   - *Buff*: an aura or burst with no damage.
   - *Zone*: a cube or wall with no damage.
   - *Attack*: everything else.
4. **Delivery**, from the distance type and keywords:

   | Ability | Delivery |
   | --- | --- |
   | Melee | swing |
   | Ranged + Weapon | arrow |
   | Other ranged (Magic, Psionic) | bolt |
   | Burst, aura | effect around the caster |
   | Cube, wall | effect over the area |
   | Line | effect along the line |
   | Self | a cast on the caster, only for Magic or Psionic abilities |

   **Utility abilities** have no damage effect, don't heal, and have none of the Strike, Weapon, Magic or Psionic
   keywords, such as Search, Hide, Aid Attack or a Tactician's Mark. The automatic recipe plays nothing for them. To
   animate one anyway, set it to *Custom*.

5. **Weapon style**, for swings, from the weapon types of the hero's kit: heavy (maul, warhammer), polearm, medium
   (longsword), light (dagger), whip/ensnaring, unarmed (fists). A Dual Wielder swings medium. Monsters use the
   fallback swing. Ranged weapon strikes shoot arrows for bow kits and monsters, and throw weapons otherwise.
6. **Element**:
   - the damage type actually rolled, else the damage type on the ability;
   - else a keyword: Fire/Pyrokinesis → fire, Cryokinesis → cold, Rot → poison, Void → corruption, Earth → earth,
     Green/Animapathy → nature, Telekinesis → force, Telepathy → psychic, Resopathy → sonic, Performance → music;
   - else Psionic, Magic or physical. A physical impact matches the weapon: bludgeoning for heavy weapons and fists,
     piercing for light weapons, polearms and arrows, slashing otherwise.
7. **Fallback row** of each table.

The **Resolved** line in the Animation section explains the choice. **Preview** plays the animation for you only,
from your selected token to your targets.

In custom fields, each entry is a comma-separated list of Sequencer database keys (such as `jb2a.fire_bolt.orange`) or
file paths. The first one available plays. `-` turns that step off. To find keys, use the Database Viewer in
Sequencer's tool layer. A key that names a group (`blfx.sound.spell.cast.buff`) plays one of that group's own
variants at random (`buff.1` … `buff.6`), never a neighbour whose name merely starts the same way (`buff2`).

### World rules

*Settings → Stef's Auto FX for Draw Steel → Edit rules* lets the Director change:
- the candidate lists per step and row (element, weapon style or physical damage kind);
- which keywords set an element.

An empty field keeps the built-in list. `-` drops a row, so that row uses the fallback row.

Each row has a **▶** button: select your token and target another one, then press it to play every candidate of the
row one after another, for you only. A line at the top of the window names the file that is playing. Use it to
compare candidates and to listen to the sounds before you change a row.

## DS AA Bridge and Automated Animations

This module works next to DS AA Bridge and does not modify it.

**While DS AA Bridge is active:**
- **DS AA Bridge stays the default animator.** this module only animates abilities set to *Custom* or *None* on their
  sheet. Signature animations are built-in defaults, not a choice made on the sheet, so they too stay with the
  bridge until the animator setting below hands every ability to this module.
- For those abilities, the bridge's Automated Animations request is stopped through AA's
  `AutomatedAnimations-WorkflowStart` hook.
  - The bridge then logs "Automated Animations did not play" once per animation in the console.
  - The Director sees one "Automated Animations refused" notification per session. That is expected.
- The world setting **Animator while DS AA Bridge is active → This module, for every ability** hands every ability
  to this module.
- An ability with the bridge's own per-item animation (`flags.ds-aa-bridge.animation`) always stays with the
  bridge. Sequencer plays that animation directly, so it can't be stopped.

**Without DS AA Bridge:** this module animates every ability. It also stops Automated Animations' generic chat
handler on those cards, because AA has no Draw Steel support and would otherwise match cards by name.

Forced movement, teleports and defeat are not animated here: Combat Tools and Death Tracker already animate those.

## Settings

| Setting | Scope | Default | What it does |
| --- | --- | --- | --- |
| Animate abilities | world | on | Turns the module's animations on or off. |
| Animator while DS AA Bridge is active | world | DS AA Bridge | Who animates abilities without their own recipe while the bridge is active. |
| Wait for Dice So Nice | world | on | Starts the animation once the 3D dice have settled. |
| Sound volume | world | 0.6 | Volume of the module's sounds. |
| Impact size per tier | world | `0.7, 1, 1.3` | Impact scale for tiers 1, 2 and 3. |
| Area effects | world | on | Plays effects over bursts, auras, cubes, walls and lines. |
| Signature animations | world | on | Uses the built-in signature animations. |
| Screen shake on big hits | world | on | A tier 3 hit briefly shakes the screen. |
| Flash on big hits | world | on | A tier 3 hit flashes the target. |
| Edit rules (menu) | world | | The rules editor described above (GM only). |
| Debug logging | client | off | Logs each decision to the browser console. |

Players can turn effects or sounds off for themselves in Sequencer's own settings.

## API and hooks

`game.modules.get("stef-ds-fx").api` provides:
- `resolve(item, {damageType})`: the recipe, with a `trace` explaining it.
- `play(message)`: animate a card now.
- `preview(item, {source, targets, tier, crit})`: play for this client only.
- `audition({kind, slot, row, candidates, source, target, onStep})`: play every candidate of one rules row, one
  after another, for this client only. Returns `{played, missing}`.
- `migrateLegacy({dryRun, force})`: imports the data of the pre-1.0 module (see *Upgrading* below).
- `selfCheck()`: returns `{ok, problems, info}`. It reports a missing Sequencer, missing packs, steps with no
  available file, Sequencer permissions above Player, and the bridge state.

Hooks:
- `dsAutoFx.prePlay(context, recipe)`: return `false` to cancel.
- `dsAutoFx.played(context, recipe)`.

`context` is `{message, item, source, targets: [{token, tier, crit}], damageType, shapes}`.

## Upgrading from Draw Steel: Ability Animations (`ds-auto-fx`)

This module was called "Draw Steel: Ability Animations" (`ds-auto-fx`) before 1.0. To move a world over:

1. Install this module and enable it; disable the old one.
2. On the first load the GM's client copies the old module's data and shows a notification:
   - every world setting, including the rules you edited in *Edit rules*;
   - each user's client setting (Debug logging), when that user next loads the world;
   - every ability's own Animation section (Custom / None and its fields), on world items, actors' items and
     unlinked tokens;
   - an Animator setting of "This module, for every ability" keeps its meaning.
3. Reload (F5). To see what would move, or to run it again, use
   `game.modules.get("stef-ds-fx").api.migrateLegacy({ dryRun: true })` in the console (`force: true` reruns it).
4. Remove the old module.

## Known limitations

- The system fires no "ability used" hook, so the module reads the chat card. Every assumption about the card
  format is in `scripts/trigger/chat-adapter.mjs`, so a system change only needs fixing there.
- **Areas:**
  - Cubes, walls and lines use the area placed in the use dialog or in Combat Tools' area picker (cached for 60 s).
  - Bursts and auras are drawn around the caster.
  - Without a drawn area, only the impacts on targets play.
- There is no casting loop while targets are being picked (Codex's "on targeting" step) and no condition animations.

## Uninstalling

Disabling the module stops all animations. It leaves its settings and each customised ability's
`flags.stef-ds-fx.recipe` in the world; they do nothing without the module.

## Development

```
node tests/check.cjs        # syntax, manifest, imports, i18n
node tests/resolve.mjs      # recipe resolution
node tests/adapter.mjs      # card reader + area geometry
node tests/sequence.mjs     # Sequence builder against a fake Sequencer
node tools/verify-presets.mjs   # every built-in key exists in the installed packs
node tools/asset-db.mjs jb2a.fire_bolt   # list database keys under a prefix
node tools/contact-sheet.mjs --out sheet.png "blfx.spell.impact.damage.*" jb2a.fire_bolt.orange
                                         # PNG with frames of each effect (needs ffmpeg and Python + Pillow)
```

## Stef's modules

| Module | What it does |
|---|---|
| [Stef's Automation Suite for Draw Steel](https://github.com/stefozr/stef-ds-automation) | Applies ability results per target (damage, conditions, forced movement, saves, triggered actions, summons, areas) with undo, plus the automation library and editor. |
| [Stef's Quality of Life Improvements for Draw Steel](https://github.com/stefozr/stef-ds-qol) | Small fixes and table conveniences for the Draw Steel system and the Combat Tools family. |
| [Stef's Auto FX for Draw Steel](https://github.com/stefozr/stef-ds-fx) | Sequencer animations for abilities, scaled by tier, per target with the Automation Suite. |
| [Stef's Character Sheets Evolved for Draw Steel](https://github.com/stefozr/stef-ds-charsheet) | A compact hero and monster sheet with class art, collapsible rows and a combat strip. |
| [Stef's Health Overlay](https://github.com/stefozr/stef-health-overlay) | Injury overlays on tokens by remaining Stamina / HP (Draw Steel and D&D 5e). |

## License

MIT (see [LICENSE](LICENSE)). The module bundles no effect or sound files; the packs it uses keep their own licenses.

Stef's Auto FX for Draw Steel is an independent product and is not affiliated with, endorsed or sponsored by MCDM
Productions, LLC. Draw Steel is a trademark of MCDM Productions, LLC.
