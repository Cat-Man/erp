export class MasterDataError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code);
    this.name = "MasterDataError";
  }
}
