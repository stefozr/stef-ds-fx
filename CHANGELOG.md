# Changelog

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-10-31

First public release.

### Features
- Animations and sounds for Draw Steel abilities through Sequencer: a cast, an area effect, a weapon swing, arrow,
  thrown weapon or bolt to each target, then an impact sized by that target's tier, with a flourish on a critical.
- The animation follows the ability's distance, keywords, the hero's kit and the damage type rolled; heals, buffs
  and lasting zones look different from attacks; 13 showpiece abilities have hand-picked signature animations.
- Any ability can get its own animation (or none) in the Animation section of its Details tab, with a Preview.
- A world rules editor for the candidate lists, with a ▶ audition button per row.
- Works next to DS AA Bridge and Automated Animations; with Stef's Automation Suite for Draw Steel it reads each
  card's targets from the suite's record.
- API (`resolve`, `play`, `preview`, `audition`, `selfCheck`) and the hooks `dsAutoFx.prePlay` and
  `dsAutoFx.played`.

## Before 1.0 (private development as "Draw Steel: Ability Animations")

### 0.2.1 (2026-10-30)

Follow-ups from the second live test.

- **Five signature animations had the same look as the automatic choice** and now have their own, picked from
  contact sheets of the BLFX files:
  - *Choreography* (a dance): a beat on the caster (spectrum bars, war drums), a spinning stage light over the aura,
    nimble footwork swirls on each ally.
  - *Revitalizing Limerick* (a sung verse): notes and a singing voice on the caster, a green life ring over the aura,
    heal petals on each ally.
  - *Incinerate* ("a column of smokeless flame"): a fire vortex over the cube instead of a fireball.
  - *Mind Spike* ("instantly zaps a creature's brain"): no cast, a wavy purple brainwave beam, a violet flash.
  - *Unquiet Ground* ("a sudden storm of detritus"): a churning dust storm instead of the ground crack.
  - A new test fails when a built-in signature looks the same as the automatic choice.
- **Group keys could play a neighbouring group.** Sequencer matches a group key by text prefix, so the fire cast
  sound `blfx.sound.spell.cast.fire` also played the fire bolt and fireball sounds, and the `buff` and `generic`
  cast sounds also played `buff2` and `generic2`. A group key now plays one of its own numbered variants. Distance
  groups (bolts, rays) are unchanged: Sequencer already picks their length correctly. The rules-menu ▶ uses the
  same choice, so an audition plays what the table would.

### 0.2.0 (2026-10-30)

Better animation and sound choices. The 0.1 presets were picked by key name only; these were picked by looking at
frames of the actual files (`tools/contact-sheet.mjs`). Boss Loot (BLFX) comes first wherever it fits.

- **Presets rewritten, BLFX first** (293 keys, all verified):
  - weapon swings show the actual weapon (dagger, longsword, maul, glaive, whip, fists) instead of one generic
    slash; elemental weapon strikes keep the plain swing and add the element's impact (no more recoloured flaming
    sword for cold or magic);
  - per-element bolts, rays and beams, casts, impacts, bursts and lines;
  - sounds per weapon and per element from BLFX (swords, hammers, whips, bows, frost, lightning, instruments …),
    instead of one missile sound for every bolt and a fireball for every area. Cold impacts stay with Eskie, whose
    burst reads better than BLFX's.
- **Weapon style from the kit:** heavy, polearm, medium, light, whip/ensnaring or unarmed swing, with a matching
  physical impact (bludgeoning, piercing, slashing). Ranged weapon strikes throw weapons unless the kit has a bow.
- **Heals, buffs and zones:** heal abilities (effect text or a heal roll) glow on their targets, or on the caster;
  auras and bursts without damage glow instead of exploding; cubes and walls without damage mark the ground. Long
  aura files are cut to 3 s.
- **Flavour elements:** Earth, Nature (Green, Animapathy), Force (Telekinesis), Music (Performance); Telepathy →
  psychic and Resopathy → sonic.
- **Signature animations** for 13 showpiece abilities (by Draw Steel id), between the item's own recipe and the
  automatic one; world setting to turn them off.
- **Impact feel:** tier 1 impacts are fainter; tier 3 hits flash the target and shake the screen (two settings).
- **Rules menu:** ▶ per row plays its candidates one after another for you only (`api.audition`); melee rows are
  weapon styles and impact rows include the physical damage kinds.
- Tools: `tools/contact-sheet.mjs` (+ `contact_sheet.py`) renders frames of database entries to a PNG;
  `tools/asset-db.mjs` now also maps keys to files.

### 0.1.1 (2026-10-30)

Fixes from the first live test.

- Cubes, walls and lines placed with Combat Tools' area picker now get their area effect.
  - Combat Tools 1.2.7 creates the region first and adds `flags.draw-steel.abilitySource` in a later update, so
    the area cache now also reads region flag updates.
- Utility abilities (no damage effect, no Strike, Weapon, Magic or Psionic keyword) play nothing in Automatic mode.
  Before this, Search, Heal or Aid Attack played a weapon swing or a slashing hit.
- Self abilities no longer play a damage impact on their own caster. Magic and psionic self abilities keep their
  cast. A *Custom* recipe can still list an impact.
- Rules menu: only the rule list scrolls, so Save and Reset stay visible. Rows without a built-in list say that they
  use the fallback row.

### 0.1.0 (2026-10-30)

First version.

- Animates Draw Steel abilities through Sequencer.
  - The chain is cast, then area, then a swing, arrow or bolt to each target, then an impact per target with a
    tier-scaled size and a crit flourish, then sounds.
  - It starts once the Dice So Nice dice settle, on the author's client.
- Recipe resolution: the item's own recipe, then delivery (distance type and keywords), then element (damage type
  rolled, then keyword subtype), then fallback rows.
  - The built-in presets use JB2A, Eskie, BLFX and PSFX keys, all verified against the installed packs with
    `tools/verify-presets.mjs`.
- "Animation" section in the ability sheet's Details tab: Automatic / Custom / None, delivery and element pickers,
  per-step overrides, a resolved-choice line and Preview.
- A world rules menu to override the candidate lists and the keyword-to-element map.
- Coexists with DS AA Bridge.
  - The bridge stays the default animator. Abilities with their own recipe take the card, and the bridge's AA
    request is stopped through `AutomatedAnimations-WorkflowStart`.
  - A setting hands every ability to this module.
  - Without the bridge, AA's generic chat handler is stopped on the cards this module animates.
- Optional: uses the automation suite's seeded targets when present.
- API: `resolve`, `play`, `preview`, `selfCheck`. Hooks: `dsAutoFx.prePlay`, `dsAutoFx.played`.
