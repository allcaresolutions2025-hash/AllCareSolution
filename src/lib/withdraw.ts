// Minimum e-wallet withdrawal per request, in displayed points. Main members
// and AF accounts (separate AF logins) currently share the same minimum.
const MIN_WITHDRAW_POINTS = 500;
const MIN_WITHDRAW_POINTS_AF = 500;

export function minWithdrawPoints(isAf: boolean): number {
  return isAf ? MIN_WITHDRAW_POINTS_AF : MIN_WITHDRAW_POINTS;
}
