export class InventoryError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
    this.name = "InventoryError";
  }
}
