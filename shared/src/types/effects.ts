/**
 * Special Effect System
 *
 * Only ONE Special Effect can be active per composed card.
 * Higher layers overwrite lower layers' effects, just like other stats.
 */

/**
 * When the effect's condition is checked
 */
export type SpecialEffectTrigger =
  | "on_play" // When card is committed
  | "if_survives" // After combat, if this card survives
  | "if_destroyed" // After combat, if this card is destroyed
  | "if_defeats" // After combat, if this card defeats opponent
  | "if_doesnt_defeat"; // After combat, if opponent survives

/**
 * When the effect resolves in the game flow
 */
export type EffectTiming = "on_play" | "post_combat" | "end_of_round";

/**
 * Draw cards from equipment deck
 */
export interface DrawCardsAction {
  type: "draw_cards";
  count: number; // 1-3 typically
}

/**
 * Modify initiative (affects attack order)
 */
export interface ModifyInitiativeAction {
  type: "modify_initiative";
  amount: number; // Usually +1 for "First Strike"
}

/**
 * Add a persistent modifier to all future cards
 */
export interface AddPersistentModifierAction {
  type: "add_persistent_modifier";
  stat: "damage" | "health";
  amount: number;
}

// Note: "attack_again" is POSTPONED for later implementation
// export interface AttackAgainAction {
//   type: "attack_again";
// }

/**
 * Union of all possible effect actions
 */
export type SpecialEffectAction =
  | DrawCardsAction
  | ModifyInitiativeAction
  | AddPersistentModifierAction;

/**
 * Complete Special Effect definition
 */
export interface SpecialEffect {
  trigger: SpecialEffectTrigger;
  effect: SpecialEffectAction;
  timing: EffectTiming;
}

/**
 * Modifier that adjusts a card's stats
 * Only affects the current composed card
 */
export interface Modifier {
  type: "damage" | "health";
  amount: number; // Positive or negative
}

/**
 * Persistent modifier applied to all future cards
 * Created by special effects during gameplay
 */
export interface PersistentModifier {
  stat: "damage" | "health";
  amount: number;
  sourceRound: number;
}

/**
 * Record of a triggered effect during a round
 */
export interface TriggeredEffect {
  odIdplayerId: string;
  effect: SpecialEffect;
  resolved: boolean;
}
