/**
 * Signature recipes (pure data): hand-picked animations for showpiece abilities, keyed by the ability's Draw Steel
 * `_dsid`, so they apply to every copy of the ability on any actor. Same shape as a Custom item recipe: delivery and
 * element pick the automatic rows, and slot lists replace them ("-" turns a slot off). An item's own Custom/None
 * recipe still wins; the `signatures` world setting turns this table off.
 *
 * Picked from contact sheets of the BLFX files; every key is checked by `node tools/verify-presets.mjs`.
 */
export const SIGNATURES = Object.freeze({
  // Troubadour
  "power-chord": {
    element: "music",
    cast: ["blfx.spell.cast.light_flare.1.center.color1"],
    castSound: ["blfx.sound.misc.musical_instruments.lute"],
    area: ["blfx.spell.template.circle.wave4.color1"],
    areaSound: ["blfx.sound.misc.musical_instruments.drums.war", "blfx.sound.spell.cast.thunderwave"],
    impact: ["blfx.spell.impact.damage.thunder.1.color1"],
  },
  // A dance: a beat on the caster, a spinning stage light over the aura, nimble footwork on each ally.
  "choreography": {
    element: "music",
    cast: ["blfx.misc.audio_animation.spectrum.loop.1.color1"],
    castSound: ["blfx.sound.misc.musical_instruments.drums.war"],
    area: ["blfx.spell.template.circle.magic1.light_wheels.1.color1"],
    areaSound: ["blfx.sound.spell.dancing_lights1", "blfx.sound.misc.musical_instruments.dulcimer"],
    impact: ["blfx.misc.enchantment.24.dodge1.loop.color1"],
    impactSound: ["blfx.sound.ability.movement.whoosh.nimble_escape"],
  },
  // A sung verse: notes on the caster, a green life ring over the aura, petals on each ally healed.
  "revitalizing-limerick": {
    element: "music",
    cast: ["blfx.misc.audio_animation.notes.1.color1"],
    castSound: ["blfx.sound.voice.male.spellcasting.singing", "blfx.sound.misc.musical_instruments.lute"],
    area: ["blfx.spell.template.circle.emanating.aura11.loop.life_nature1.color1"],
    areaSound: ["blfx.sound.misc.musical_instruments.lyre"],
    impact: ["blfx.spell.misc.heal.magic_petals.1.color4"],
    impactSound: ["blfx.sound.spell.cast.cure_wounds"],
  },
  "thunder-mother": {
    cast: ["blfx.spell.cast.light_flare.1.center.color1"],
    castSound: ["blfx.sound.misc.musical_instruments.drums.war"],
    travel: ["blfx.spell.range.beam.loop.witch_bolt1.lightning.strike.color1"],
    travelSound: ["blfx.sound.nature.electric.lightning_bolt"],
    impact: ["blfx.spell.impact.damage.lightning.1.color1"],
    impactSound: ["blfx.sound.misc.thunder.strike"],
  },
  "flip-the-script": {
    element: "psychic",
    cast: ["blfx.spell.cast.light_flare.1.center.color1"],
    area: ["blfx.spell.template.circle.wave.dream_hypnotic1.color1"],
    areaSound: ["blfx.sound.misc.wave"],
  },
  // Talent
  // "A column of smokeless flame": a bright fire vortex instead of the automatic fireball.
  "incinerate": {
    cast: ["blfx.spell.cast.swirl1.fire1.yellow"],
    castSound: ["blfx.sound.spell.cast.fire"],
    area: ["blfx.spell.template.circle.tornado1.fire1.clockwise.loop.orange"],
    areaSound: ["blfx.sound.misc.fire.ignite1", "blfx.sound.spell.loop_channel.fire_burning1"],
  },
  // "Instantly zaps a creature's brain": no cast, a wavy brainwave beam, a violet flash on the target.
  "mind-spike": {
    cast: "-",
    travel: ["blfx.spell.range.ray.beam1.sinusoidal.intro.purple", "blfx.spell.range.beam.loop.witch_bolt1.lightning.strike.color2"],
    travelSound: ["blfx.sound.spell.message", "blfx.sound.misc.swoosh.warp"],
    impact: ["blfx.spell.impact.flash.color4"],
    impactSound: ["blfx.sound.misc.muffled.vibrating", "blfx.sound.misc.impact.summon1"],
  },
  "kinetic-grip": {
    element: "force",
    cast: ["blfx.spell.cast.swirl1.magic1.light_wheels.1.color3"],
  },
  // Elementalist
  // "A sudden storm of detritus": a churning dust storm instead of the automatic ground crack.
  "unquiet-ground": {
    element: "earth",
    area: ["blfx.spell.template.circle.smoke1.mist1.storm1.color8", "blfx.spell.template.circle.crack2.ground1.orange"],
    areaSound: ["blfx.sound.misc.whirlwind.heavy"],
  },
  "test-of-rain": {
    area: ["blfx.spell.template.square.nature.liquid.water_ripples_rain1.color1"],
    areaSound: ["blfx.sound.misc.impact.liquid1"],
  },
  // Conduit
  "purifying-fire": {
    element: "holy",
    impact: ["blfx.spell.impact.holy.sacred_flame1.color1"],
    impactSound: ["blfx.sound.spell.sacred_flame1.impact"],
  },
  "judgement": {
    element: "holy",
    cast: ["blfx.spell.cast.flash_rays1.color1"],
    castSound: ["blfx.sound.spell.sacred_flame1.cast"],
    impact: ["blfx.spell.impact.light_blast.color1"],
  },
  // Null
  "null-field": {
    element: "psionic",
    area: ["blfx.spell.template.circle.school.generic3.rune_ring1.loop.color1"],
    areaSound: ["blfx.sound.spell.resistance"],
  },
});
