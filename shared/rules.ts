export const RULES_VERSION = 7;
// Physics editions are independent of score rules. Missing means the original
// edition, so snapshots and frozen challenge links keep their exact behavior.
export type PhysicsEdition = 1 | 2;
export const PHYSICS_EDITION: PhysicsEdition = 2;
export const physicsEdition = (state: {
  physics?: PhysicsEdition;
}): PhysicsEdition => state.physics ?? 1;
// Network features can evolve without invalidating local physics records/saves.
export const NETWORK_PROTOCOL = 15;
export const TURN_SECONDS = 30;
