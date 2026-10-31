/**
 * Built-in animation rules (pure data). Every file list is an ORDERED candidate list of Sequencer database keys or
 * file paths: the first one that exists on this client is played. Boss Loot (BLFX) comes first wherever it has a
 * fitting effect, then JB2A, then Eskie; sounds use BLFX, then PSFX. A key that names a group (no final variant)
 * lets Sequencer pick a random variant, and ranged keys without a distance let it pick the right length.
 *
 * Picks were made from contact sheets of the actual files (`node tools/contact-sheet.mjs`), and every key is checked
 * against the installed databases with `node tools/verify-presets.mjs`.
 *
 * Tables are keyed by row: an element for most tables, a weapon style for `melee`, and the element or a physical
 * damage kind for `impact`. `*` is the fallback row.
 */

/**
 * Elements: the nine Draw Steel damage types, `magic` / `psionic` (no damage type), `none` (physical), and four
 * flavours set by keywords: `earth`, `nature` (Green, Animapathy), `force` (Telekinesis), `music` (Performance).
 */
export const ELEMENTS = Object.freeze([
  "none", "magic", "psionic", "acid", "cold", "corruption", "fire", "holy", "lightning", "poison", "psychic", "sonic",
  "earth", "nature", "force", "music",
]);

/** Weapon styles (rows of the melee tables), from the kit's weapon types. */
export const STYLES = Object.freeze(["unarmed", "light", "medium", "heavy", "polearm", "whip"]);

/** Physical damage kinds (extra rows of the impact tables), used when the element is `none`. */
export const PHYSICAL = Object.freeze(["slashing", "piercing", "bludgeoning"]);

/** The rows a table can have, for the rules menu: weapon styles for melee, elements plus physical kinds for impact. */
export function tableRows(slot) {
  if (slot === "melee") return ["*", ...STYLES];
  if (slot === "impact") return ["*", ...ELEMENTS, ...PHYSICAL];
  return ["*", ...ELEMENTS];
}

/**
 * Deliveries: how the effect gets from caster to target.
 * - travel: "melee" (swing from caster to target), "projectile" (flies to each target), "none".
 * - area: "burst" (around the caster), "area" (cube / wall squares), "line"; played once per use.
 * - cast: whether a cast burst plays on the caster first (magic / psionic keywords always cast).
 */
export const DELIVERIES = Object.freeze({
  melee: { travel: "melee", travelSlot: "melee", area: null, cast: false },
  arrow: { travel: "projectile", travelSlot: "arrow", area: null, cast: false },
  bolt: { travel: "projectile", travelSlot: "bolt", area: null, cast: true },
  meleeRanged: { travel: "melee", travelSlot: "melee", area: null, cast: false },
  burst: { travel: "none", travelSlot: null, area: "burst", cast: true },
  area: { travel: "none", travelSlot: null, area: "area", cast: true },
  line: { travel: "none", travelSlot: null, area: "line", cast: true },
  self: { travel: "none", travelSlot: null, area: null, cast: false },
});

/** Keyword subtypes that imply an element when the ability deals no typed damage. */
const KEYWORD_ELEMENTS = {
  fire: "fire",
  pyrokinesis: "fire",
  cryokinesis: "cold",
  rot: "poison",
  void: "corruption",
  earth: "earth",
  green: "nature",
  animapathy: "nature",
  telekinesis: "force",
  telepathy: "psychic",
  resopathy: "sonic",
  performance: "music",
};

const FILES = {
  // Weapon swings by style: BLFX animates the actual weapon (with its own small hit ring).
  melee: {
    "*": ["blfx.weapon.melee.longsword1.trail.attack1.color1", "jb2a.melee_generic.slashing.one_handed", "eskie.slice.01.white"],
    unarmed: ["blfx.ability.unarmed.strike.punch1.attack1.color1", "blfx.ability.unarmed.strike.punch2.attack1.color1", "jb2a.unarmed_strike.physical.01"],
    light: ["blfx.weapon.melee.dagger1.color1", "blfx.weapon.melee.shortsword1.trail.attack1.color1", "jb2a.melee_generic.piercing.one_handed"],
    medium: ["blfx.weapon.melee.longsword1.trail.attack1.color1", "blfx.weapon.melee.longsword3.color1.trail", "jb2a.melee_generic.slashing.one_handed"],
    heavy: ["blfx.weapon.melee.maul1.color1", "blfx.weapon.melee.warhammer1.trail.attack1.color1", "jb2a.melee_generic.bludgeoning.two_handed"],
    polearm: ["blfx.weapon.melee.glaive2.color1.close-5ft", "blfx.weapon.melee.spear2.color1", "jb2a.spear.melee"],
    whip: ["blfx.weapon.melee.whip1.attack1.snap.close-5ft.color1", "jb2a.melee_generic.slashing.one_handed"],
  },
  arrow: {
    "*": ["blfx.weapon.range.arrow1.physical1.impact1.trail1.color1", "jb2a.arrow.physical.white.01"],
    fire: ["blfx.weapon.range.arrow1.fire1.impact1.color1", "jb2a.arrow.fire.orange"],
    cold: ["blfx.weapon.range.arrow1.ice1.frost.impact1.color1", "jb2a.arrow.cold.blue"],
    poison: ["blfx.weapon.range.arrow1.poison1.impact1.color1", "jb2a.arrow.poison.green"],
    acid: ["blfx.weapon.range.arrow1.poison1.impact1.color1", "jb2a.arrow.poison.green"],
    lightning: ["jb2a.arrow.lightning.blue", "blfx.weapon.range.arrow1.physical1.impact1.trail1.color1"],
  },
  // Thrown weapons: ranged weapon strikes of heroes whose kit has no bow.
  thrown: {
    "*": ["blfx.weapon.range.dagger1.throw1.color1", "blfx.weapon.range.handaxe1.throw1.color1", "jb2a.dagger.throw.01.white"],
    heavy: ["blfx.weapon.range.javelin1.throw1.color1", "blfx.weapon.range.handaxe1.throw1.color1"],
  },
  bolt: {
    "*": ["blfx.spell.range.ray.burst5.missile.sinusoidal.impact.intro.white", "jb2a.magic_missile.blue"],
    magic: ["blfx.spell.range.ray.burst5.missile.sinusoidal.impact.intro.blue", "jb2a.magic_missile.blue"],
    psionic: ["blfx.spell.range.ray.burst5.missile.sinusoidal.impact.intro.purple", "jb2a.magic_missile.purple"],
    psychic: ["blfx.spell.range.ray.single_line1.color2", "jb2a.eldritch_blast.purple"],
    fire: ["blfx.spell.range.ray.fire_bolt.impact1.intro.yellow", "jb2a.fire_bolt.orange"],
    cold: ["blfx.spell.range.missile1.ice.frost.color", "blfx.spell.range.ray.single_line1.frost.color1", "jb2a.ray_of_frost.blue"],
    lightning: ["blfx.spell.range.beam.loop.witch_bolt1.lightning.strike.color1", "jb2a.chain_lightning.primary.blue"],
    holy: ["blfx.spell.range.projectile.light.guiding_bolt1.color1", "blfx.spell.range.beam.1.color1", "jb2a.guiding_bolt.01.yellow"],
    corruption: ["blfx.spell.range.ray.burst5.missile.sinusoidal.impact.intro.black", "jb2a.eldritch_blast.dark_green"],
    poison: ["blfx.spell.range.ray.ray_of_sickness.1.color1", "jb2a.spell_projectile.poison.greenyellow"],
    acid: ["blfx.spell.range.projectile.liquid.acid_splash1.color1", "jb2a.spell_projectile.poison.greenyellow"],
    sonic: ["blfx.spell.range.ray.beam1.sinusoidal.intro.blue", "jb2a.spell_projectile.sound.01.pinkteal"],
    earth: ["blfx.ability.throw.rock.attack1.color1", "jb2a.boulder.toss"],
    nature: ["blfx.spell.range.ray.burst5.missile.sinusoidal.impact.intro.green", "jb2a.spell_projectile.poison.greenyellow"],
    force: ["blfx.spell.range.projectile.force_bolt.1.color1", "jb2a.magic_missile.blue"],
    music: ["blfx.spell.range.missile1.rainbow", "jb2a.spell_projectile.sound.01.pinkteal"],
  },
  cast: {
    "*": ["blfx.spell.cast.swirl1.magic1.light_wheels.1.color6", "eskie.casting.arcane.01.center.one_shot.white"],
    magic: ["blfx.spell.cast.circles1.energy1.blue", "eskie.casting.arcane.01.center.one_shot.blue"],
    psionic: ["blfx.spell.cast.swirl1.magic1.light_wheels.1.color3", "eskie.casting.arcane.01.center.one_shot.purple"],
    psychic: ["blfx.spell.cast.light_flare.1.center.color2", "eskie.casting.arcane.01.center.one_shot.purple"],
    fire: ["blfx.spell.cast.swirl1.fire1.orange", "eskie.casting.arcane.01.center.one_shot.orange"],
    cold: ["blfx.spell.cast.swirl1.magic1.light_wheels.1.color2", "eskie.casting.arcane.01.center.one_shot.blue"],
    lightning: ["blfx.spell.cast.impact.electric.lightning1.color1", "blfx.spell.cast.light_flare.1.center.color4"],
    holy: ["blfx.spell.cast.flash_rays1.color1", "eskie.casting.divine.01.center.one_shot.yellow"],
    corruption: ["blfx.spell.cast.flash_rays1.color7", "eskie.casting.arcane.01.center.one_shot.green"],
    poison: ["blfx.spell.cast.flash_rays1.color4", "eskie.casting.arcane.01.center.one_shot.green"],
    acid: ["blfx.spell.cast.light_flare.1.center.color5", "eskie.casting.arcane.01.center.one_shot.green"],
    sonic: ["blfx.spell.cast.flash_rays1.color5", "jb2a.cast_generic.sound.01.pinkteal"],
    earth: ["blfx.spell.cast.elemental1.color1", "blfx.spell.cast.light_flare.1.center.color6"],
    nature: ["blfx.spell.cast.swirl1.magic1.light_wheels.1.color4", "blfx.spell.cast.light_flare.1.center.color5"],
    force: ["blfx.spell.cast.light_flare.1.center.color4", "eskie.casting.arcane.01.center.one_shot.blue"],
    music: ["blfx.spell.cast.light_flare.1.center.color1", "jb2a.cast_generic.sound.01.pinkteal"],
  },
  impact: {
    "*": ["blfx.spell.impact.damage.slashing.1.color1", "eskie.damage.slashing.01.white"],
    slashing: ["blfx.spell.impact.damage.slashing.1.color1", "eskie.damage.slashing.01.white"],
    piercing: ["blfx.spell.impact.damage.piercing.1.color1", "eskie.damage.piercing.01.white"],
    bludgeoning: ["blfx.spell.impact.damage.bludgeoning.1.color1", "eskie.damage.bludgeoning.01.white"],
    magic: ["blfx.spell.impact.magic_sparks.1.color1", "jb2a.impact.001.blue"],
    psionic: ["blfx.spell.impact.damage.psychic.1.color1", "eskie.damage.psychic.01.darkpurple"],
    psychic: ["blfx.spell.impact.damage.psychic.1.color1", "eskie.damage.psychic.01.pink"],
    fire: ["blfx.spell.impact.damage.fire.1.color1", "eskie.damage.fire.01.orange"],
    // Eskie's cold burst reads much better than BLFX's faint frost particles.
    cold: ["eskie.damage.cold.01.blue", "blfx.spell.impact.damage.cold.1.color1"],
    lightning: ["blfx.spell.impact.damage.lightning.1.color1", "eskie.damage.electricity.01.blue"],
    acid: ["blfx.spell.impact.damage.acid.1.color1", "eskie.damage.acid.01.green"],
    poison: ["blfx.spell.impact.damage.poison.1.color1", "eskie.damage.poison.01.green"],
    corruption: ["blfx.spell.impact.damage.necrotic.1.color1", "eskie.damage.necrotic.01.black"],
    holy: ["blfx.spell.impact.damage.radiant.1.color1", "eskie.damage.radiant.01.yellow"],
    sonic: ["blfx.spell.impact.damage.thunder.1.color1", "eskie.damage.thunder.01.white"],
    earth: ["blfx.spell.impact.damage.bludgeoning.1.color1", "jb2a.impact.ground_crack.orange.01"],
    nature: ["blfx.spell.template.circle.emanating.nature.leaf_ring.1.color1", "blfx.spell.impact.damage.poison.1.color1"],
    force: ["blfx.spell.impact.damage.force.1.color1", "eskie.damage.force.01.white"],
    music: ["blfx.spell.impact.damage.thunder.1.color1", "eskie.damage.thunder.01.white"],
  },
  // BLFX's only crit is a full-screen overlay; Eskie's coloured crit slash sits on the target.
  crit: {
    "*": ["eskie.damage.critical.01.white"],
    magic: ["eskie.damage.critical.01.blue"],
    cold: ["eskie.damage.critical.01.blue"],
    force: ["eskie.damage.critical.01.blue"],
    fire: ["eskie.damage.critical.01.orange"],
    earth: ["eskie.damage.critical.01.orange"],
    lightning: ["eskie.damage.critical.01.yellow"],
    holy: ["eskie.damage.critical.01.yellow"],
    acid: ["eskie.damage.critical.01.green"],
    poison: ["eskie.damage.critical.01.green"],
    nature: ["eskie.damage.critical.01.green"],
    corruption: ["eskie.damage.critical.01.purple"],
    psychic: ["eskie.damage.critical.01.purple"],
    psionic: ["eskie.damage.critical.01.purple"],
  },
  // Damaging bursts around the caster.
  burst: {
    "*": ["blfx.spell.template.circle.wave1.energy1.white", "jb2a.explosion.01.orange"],
    magic: ["blfx.spell.template.circle.wave3.shockwave1.ring.smoke.blue", "jb2a.explosion.01.blue"],
    psionic: ["blfx.spell.template.circle.wave3.shockwave1.ring.smoke.purple", "jb2a.explosion.01.purple"],
    psychic: ["blfx.spell.template.circle.wave.dream_hypnotic1.color1", "jb2a.explosion.01.purple"],
    fire: ["blfx.spell.template.circle.explosion1.fireball1.orange", "jb2a.fireball.explosion.orange"],
    cold: ["blfx.spell.template.circle.ice.frost.snowflakes.ground2.blue", "jb2a.explosion.02.blue"],
    lightning: ["blfx.spell.template.circle.lightning_shock1.radial.color1", "jb2a.explosion.01.yellow"],
    holy: ["blfx.spell.template.circle.emanating.aura8.loop.light_rays.color1", "jb2a.explosion.01.yellow"],
    corruption: ["blfx.spell.template.circle.explosion5.black_hole1.color1", "jb2a.fireball.explosion.dark_green"],
    poison: ["blfx.spell.template.circle.dust.puff.poison.gas.smoke.radial.1.color1", "jb2a.explosion.01.green"],
    acid: ["blfx.spell.template.circle.emanating.impact.liquid.splatter.acid1.color1", "jb2a.explosion.01.green"],
    sonic: ["blfx.spell.template.circle.wave4.color1", "jb2a.explosion.03.bluewhite"],
    earth: ["blfx.spell.template.circle.crack1.ground1.orange", "jb2a.ground_cracks.orange.01"],
    nature: ["blfx.spell.template.circle.emanating.nature.leaf_ring.1.color1", "jb2a.explosion.01.green"],
    force: ["blfx.spell.template.circle.wave3.shockwave1.ring.smoke.azure", "jb2a.explosion.01.blue"],
    music: ["blfx.spell.template.circle.wave4.color1", "jb2a.explosion.03.bluewhite"],
  },
  line: {
    "*": ["blfx.spell.template.line.gust_of_wind1.color1.width-30ft", "jb2a.template_line_piercing.generic.01.orange"],
    magic: ["jb2a.template_line_piercing.generic.01.blue"],
    psionic: ["jb2a.template_line_piercing.generic.01.purple"],
    psychic: ["jb2a.template_line_piercing.generic.01.purple"],
    holy: ["jb2a.template_line_piercing.generic.01.yellow"],
    fire: ["jb2a.breath_weapons.fire.line.orange", "jb2a.fire_jet.orange"],
    cold: ["blfx.spell.template.line.ice.frost.ground1.color01", "jb2a.template_line_piercing.water.01.blue"],
    lightning: ["blfx.spell.template.line.lightning_bolt.color1.width-10ft", "jb2a.lightning_bolt.wide.blue"],
    acid: ["blfx.spell.template.line.breath_weapon1.acid.color1.width-30ft", "jb2a.breath_weapons.acid.line.green"],
    poison: ["jb2a.template_line_piercing.nature.01.green"],
    corruption: ["jb2a.template_line_piercing.void.01.purple"],
    sonic: ["jb2a.template_line_piercing.sound.01.yellow"],
    earth: ["blfx.spell.template.line.crack1.ground1.orange", "jb2a.ground_cracks.orange.01"],
    force: ["blfx.spell.template.line.gust_of_wind1.color1.width-30ft"],
  },
  // Heal: on each healed target (or the caster when nobody is targeted).
  heal: {
    "*": ["blfx.spell.misc.heal.rings_particles.1.color1", "jb2a.healing_generic.200px.yellow"],
    holy: ["blfx.spell.misc.heal.rings_particles.1.color1", "jb2a.healing_generic.200px.yellow"],
    magic: ["blfx.spell.misc.heal.rings_particles.1.color5", "jb2a.healing_generic.200px.blue"],
    psionic: ["blfx.spell.misc.heal.rings_particles.1.color4", "jb2a.healing_generic.200px.purple"],
    nature: ["blfx.spell.misc.heal.magic_petals.1.color1", "blfx.spell.melee.heal2.particles1.glow.green"],
    music: ["blfx.spell.misc.heal.magic_petals.1.color4", "blfx.spell.misc.heal.rings_particles.1.color1"],
  },
  // Aura or burst without damage (a buff or a performance): a glow over the area, no explosion.
  aura: {
    "*": ["blfx.spell.template.circle.emanating.aura1.radial.color5", "jb2a.extras.tmfx.outpulse.circle.01.normal"],
    magic: ["blfx.spell.template.circle.school.generic3.rune_ring1.loop.color1", "blfx.spell.template.circle.emanating.aura1.radial.color2"],
    psionic: ["blfx.spell.template.circle.emanating.aura1.radial.color3"],
    holy: ["blfx.spell.template.circle.emanating.aura4.loop.light.color1"],
    fire: ["blfx.spell.template.circle.emanating.aura1.radial.color4"],
    nature: ["blfx.spell.template.circle.emanating.aura11.loop.life_nature1.color1", "blfx.spell.template.circle.emanating.aura1.radial.color1"],
    music: ["blfx.misc.audio_animation.notes.1.color1"],
  },
  // A light shimmer on each buffed target.
  buff: {
    "*": ["blfx.spell.cast.light_flare.1.center.color7"],
    magic: ["blfx.spell.cast.light_flare.1.center.color4"],
    psionic: ["blfx.spell.cast.light_flare.1.center.color2"],
    holy: ["blfx.spell.cast.light_flare.1.center.color6"],
    nature: ["blfx.spell.cast.light_flare.1.center.color5"],
    music: ["blfx.spell.cast.light_flare.1.center.color1"],
  },
  // Cube or wall without damage (a lasting zone): something on the ground, no explosion.
  zone: {
    "*": ["blfx.spell.template.circle.school.generic1.loop.color1"],
    psionic: ["blfx.spell.template.circle.school.generic3.rune_ring1.loop.color1"],
    cold: ["blfx.spell.template.circle.ice.frost.snowflakes.ground2.blue"],
    earth: ["blfx.spell.template.circle.crack1.ground1.orange"],
    nature: ["blfx.spell.template.square.nature.entangle1.vine_thorn.color1"],
    poison: ["blfx.spell.template.circle.dust.puff.poison.gas.smoke.radial.1.color1"],
    corruption: ["blfx.spell.template.circle.explosion5.black_hole1.color1"],
  },
};
// Damaging cubes and walls use the burst table.
FILES.area = FILES.burst;

const SOUNDS = {
  melee: {
    "*": ["blfx.sound.weapon.melee.sword.slash", "psfx.weapon-swooshes.light.v1.group01"],
    unarmed: ["blfx.sound.ability.unarmed.strike", "psfx.weapon-swooshes.light.v1.group01"],
    light: ["blfx.sound.weapon.melee.rapier", "psfx.weapon-swooshes.light.v1.group01"],
    medium: ["blfx.sound.weapon.melee.sword.slash", "psfx.weapon-swooshes.light.v1.group01"],
    heavy: ["blfx.sound.weapon.melee.warhammer", "blfx.sound.weapon.melee.maul", "psfx.weapon-swooshes.heavy.v1.group01"],
    polearm: ["blfx.sound.weapon.melee.glaive", "psfx.weapon-swooshes.light.v1.group01"],
    whip: ["blfx.sound.weapon.melee.whip", "psfx.weapon-swooshes.light.v1.group01"],
  },
  arrow: {
    "*": ["blfx.sound.weapon.range.bow", "blfx.sound.weapon.range.arrow.swoosh", "psfx.ranged-weapons.longbow.v1"],
  },
  thrown: {
    "*": ["blfx.sound.weapon.range.throw", "blfx.sound.weapon.range.dart_throw1"],
  },
  bolt: {
    "*": ["blfx.sound.spell.cast.magic_missile", "psfx.ranged-magic.generic.missile.only.001"],
    fire: ["blfx.sound.spell.cast.fire_bolt", "psfx.ranged-magic.generic.missile.only.001"],
    cold: ["blfx.sound.misc.frost_ice.spread", "psfx.ranged-magic.generic.missile.only.001"],
    lightning: ["blfx.sound.nature.electric.lightning_bolt", "psfx.ranged-magic.generic.missile.only.001"],
    holy: ["blfx.sound.spell.sacred_flame1.cast", "blfx.sound.spell.cast.magic_missile"],
    corruption: ["blfx.sound.spell.cast.inflict_wounds", "blfx.sound.spell.cast.magic_missile"],
    psychic: ["blfx.sound.spell.beam1.eldritch", "blfx.sound.spell.cast.magic_missile"],
    acid: ["blfx.sound.spell.cast.acid_arrow", "blfx.sound.spell.cast.magic_missile"],
    poison: ["blfx.sound.spell.cast.acid_arrow", "blfx.sound.spell.cast.magic_missile"],
    sonic: ["blfx.sound.misc.wave", "blfx.sound.spell.cast.magic_missile"],
    earth: ["blfx.sound.weapon.range.throw", "blfx.sound.spell.cast.magic_missile"],
    force: ["blfx.sound.misc.swoosh.beam", "blfx.sound.spell.cast.magic_missile"],
    music: ["blfx.sound.misc.musical_instruments.lute", "blfx.sound.spell.cast.magic_missile"],
  },
  cast: {
    "*": ["blfx.sound.spell.cast.generic", "psfx.casting.generic.001"],
    fire: ["blfx.sound.spell.cast.fireball", "psfx.casting.fire.001"],
    cold: ["blfx.sound.spell.cast.frost_ice", "psfx.casting.generic.001"],
    lightning: ["blfx.sound.nature.electric.chain_lightning", "psfx.casting.generic.001"],
    holy: ["blfx.sound.spell.sacred_flame1.cast", "psfx.casting.generic.001"],
    corruption: ["blfx.sound.spell.cast.darkness", "psfx.casting.generic.001"],
    psychic: ["blfx.sound.spell.cast.charm_person", "psfx.casting.generic.001"],
    psionic: ["blfx.sound.spell.cast.generic2", "psfx.casting.generic.001"],
    sonic: ["blfx.sound.spell.cast.thunderwave", "psfx.casting.generic.001"],
    earth: ["blfx.sound.nature.leaves1.roots1.earth1", "psfx.casting.generic.001"],
    nature: ["blfx.sound.spell.cast.entangle.roots", "psfx.casting.generic.001"],
    music: ["blfx.sound.misc.musical_instruments.lute", "psfx.casting.generic.001"],
  },
  impact: {
    "*": ["blfx.sound.weapon.melee.sword.hit.flesh", "psfx.impacts.slashing.v1"],
    slashing: ["blfx.sound.weapon.melee.sword.hit.flesh", "psfx.impacts.slashing.v1"],
    piercing: ["blfx.sound.weapon.range.arrow.hit", "psfx.impacts.slashing.v1"],
    bludgeoning: ["blfx.sound.misc.impact.hit", "psfx.impacts.bludgeoning.v1"],
    magic: ["blfx.sound.misc.shimmer_sparks", "psfx.impacts.magicaleffects.generic.002.001"],
    psionic: ["blfx.sound.misc.impact.summon1", "psfx.impacts.magicaleffects.psychic"],
    psychic: ["blfx.sound.misc.impact.summon1", "psfx.impacts.magicaleffects.psychic"],
    fire: ["blfx.sound.misc.impact.fire1", "psfx.impacts.magicaleffects.fire"],
    cold: ["blfx.sound.misc.frost_ice.imapact.explosion", "psfx.impacts.magicaleffects.cold"],
    lightning: ["blfx.sound.nature.electric.lightning_bolt", "psfx.impacts.magicaleffects.lightning"],
    holy: ["blfx.sound.misc.impact.radiant1", "psfx.impacts.magicaleffects.generic.002.001"],
    corruption: ["blfx.sound.spell.chill_touch1.impact", "psfx.impacts.magicaleffects.necrotic"],
    acid: ["blfx.sound.misc.impact.liquid1", "psfx.impacts.magicaleffects.generic.002.001"],
    poison: ["blfx.sound.misc.rot", "psfx.impacts.magicaleffects.generic.002.001"],
    sonic: ["blfx.sound.misc.thunder.strike", "psfx.impacts.magicaleffects.generic.002.001"],
    earth: ["blfx.sound.misc.impact.ground.hit", "psfx.impacts.bludgeoning.v1"],
    nature: ["blfx.sound.nature.leaves1.roots1.earth1", "psfx.impacts.magicaleffects.generic.002.001"],
    force: ["blfx.sound.misc.shock_wave", "psfx.impacts.magicaleffects.generic.002.001"],
    music: ["blfx.sound.misc.musical_instruments.drums.war", "psfx.impacts.magicaleffects.generic.002.001"],
  },
  area: {
    "*": ["blfx.sound.misc.shock_wave", "psfx.3rd-level-spells.fireball.v1.001.explosion"],
    fire: ["blfx.sound.misc.explosion.fire", "psfx.3rd-level-spells.fireball.v1.001.explosion"],
    holy: ["blfx.sound.misc.explosion.radiant", "blfx.sound.misc.shock_wave"],
    cold: ["blfx.sound.misc.frost_ice.spread", "psfx.5th-level-spells.cone-of-cold.v1.001"],
    lightning: ["blfx.sound.nature.electric.chain_lightning", "blfx.sound.misc.shock_wave"],
    sonic: ["blfx.sound.spell.cast.thunderwave", "psfx.cantrips.thunderclap.v1"],
    acid: ["blfx.sound.misc.impact.liquid1", "blfx.sound.misc.shock_wave"],
    poison: ["blfx.sound.misc.rot", "blfx.sound.misc.shock_wave"],
    corruption: ["blfx.sound.spell.cast.darkness", "blfx.sound.misc.shock_wave"],
    earth: ["blfx.sound.misc.impact.ground.hit", "blfx.sound.misc.shock_wave"],
    nature: ["blfx.sound.spell.cast.entangle.roots", "blfx.sound.misc.shock_wave"],
    music: ["blfx.sound.misc.musical_instruments.drums.war", "blfx.sound.misc.shock_wave"],
  },
  heal: {
    "*": ["blfx.sound.spell.cast.cure_wounds", "blfx.sound.spell.cast.heal"],
    music: ["blfx.sound.misc.musical_instruments.lute", "blfx.sound.spell.cast.cure_wounds"],
  },
  aura: {
    "*": ["blfx.sound.spell.cast.buff", "blfx.sound.spell.cast.buff2"],
    holy: ["blfx.sound.spell.magic_light1", "blfx.sound.spell.cast.buff"],
    music: ["blfx.sound.misc.musical_instruments.lute", "blfx.sound.spell.cast.buff"],
  },
};

export const BUILTIN_RULES = Object.freeze({
  version: 1,
  keywordElements: KEYWORD_ELEMENTS,
  files: FILES,
  sounds: SOUNDS,
});

/** File slots (tables in `files`) and sound slots (tables in `sounds`), for the rules menu and the verifier. */
export const FILE_SLOTS = Object.freeze(Object.keys(FILES));
export const SOUND_SLOTS = Object.freeze(Object.keys(SOUNDS));

/**
 * Merge a world override (the `rules` setting) over the built-in rules: per slot and row, an override list replaces
 * the built-in one; an empty list removes it (falls back to `*`).
 */
export function mergeRules(override) {
  const out = { version: 1, keywordElements: { ...KEYWORD_ELEMENTS }, files: {}, sounds: {} };
  for (const [kind, base] of [["files", FILES], ["sounds", SOUNDS]]) {
    for (const [slot, table] of Object.entries(base)) out[kind][slot] = { ...table };
    for (const [slot, table] of Object.entries(override?.[kind] ?? {})) {
      if (!table || typeof table !== "object") continue;
      // `area` shares the burst table; an override of either one must not leak into the other.
      out[kind][slot] = { ...(out[kind][slot] ?? {}) };
      for (const [el, list] of Object.entries(table)) {
        if (!Array.isArray(list)) continue;
        const clean = list.map(s => String(s).trim()).filter(Boolean);
        if (clean.length) out[kind][slot][el] = clean;
        else delete out[kind][slot][el];
      }
    }
  }
  for (const [kw, el] of Object.entries(override?.keywordElements ?? {})) {
    if (el && ELEMENTS.includes(el)) out.keywordElements[kw] = el;
    else delete out.keywordElements[kw];
  }
  return out;
}
