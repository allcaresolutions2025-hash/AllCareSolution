// Minimum e-wallet withdrawal per request, in displayed points. AF accounts
// (separate AF logins) have a lower minimum than main members.
const MIN_WITHDRAW_POINTS = 500;
const MIN_WITHDRAW_POINTS_AF = 100;

export function minWithdrawPoints(isAf: boolean): number {
  return isAf ? MIN_WITHDRAW_POINTS_AF : MIN_WITHDRAW_POINTS;
}
