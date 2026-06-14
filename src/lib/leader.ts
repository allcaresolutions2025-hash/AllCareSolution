// "Leader" gating for self-service pin purchases via Razorpay.
// A user is a Leader once their combined downline (left + right legs)
// reaches LEADER_DOWNLINE_THRESHOLD. Leaders may pay for pins directly
// and have them issued instantly, bypassing admin review.

export const LEADER_DOWNLINE_THRESHOLD = 50;

export function isLeader(legs: { leftLegCount: number; rightLegCount: number }): boolean {
  return legs.leftLegCount + legs.rightLegCount >= LEADER_DOWNLINE_THRESHOLD;
}
