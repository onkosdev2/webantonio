export class PublicationImageError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PublicationImageError";
  }
}

export const MAX_PUBLICATION_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PUBLICATION_BATCH_BYTES = 20 * 1024 * 1024;
