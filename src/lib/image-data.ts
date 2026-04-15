import "server-only";

type ParsedImageData = {
  mime: "image/png" | "image/jpeg";
  bytes: Buffer;
};

export const parseImageDataUrl = (
  dataUrl?: string | null
): ParsedImageData | null => {
  if (!dataUrl) {
    return null;
  }
  const match = /^data:(image\/(?:png|jpe?g));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }
  const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  if (mime !== "image/png" && mime !== "image/jpeg") {
    return null;
  }
  return {
    mime,
    bytes: Buffer.from(match[2], "base64"),
  };
};
