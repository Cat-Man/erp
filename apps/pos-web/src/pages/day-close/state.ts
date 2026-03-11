export interface DayCloseState {
  shiftId: string;
  countedCash: number;
  countedThirdPartyTotal: number;
}

export function createDayCloseState(shiftId: string): DayCloseState {
  return {
    shiftId,
    countedCash: 0,
    countedThirdPartyTotal: 0
  };
}

export function captureCashCount(state: DayCloseState, countedCash: number): DayCloseState {
  return {
    ...state,
    countedCash
  };
}

export function captureThirdPartyTotal(
  state: DayCloseState,
  countedThirdPartyTotal: number
): DayCloseState {
  return {
    ...state,
    countedThirdPartyTotal
  };
}
