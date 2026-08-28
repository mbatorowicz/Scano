import { ImageResponse } from "next/og";

/**
 * Ikona rysowana geometrycznie, bez tekstu — dzięki temu nie trzeba dostarczać
 * pliku fontu do renderera i ikona wygląda tak samo na każdej platformie.
 */
export function renderAppIcon(size: number): ImageResponse {
  const line = {
    height: size * 0.05,
    background: "#0a0a0a",
    borderRadius: size * 0.03,
  };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: size * 0.06,
            width: size * 0.52,
            height: size * 0.62,
            padding: size * 0.09,
            background: "#fafafa",
            borderRadius: size * 0.09,
          }}
        >
          <div style={{ ...line, width: "100%" }} />
          <div style={{ ...line, width: "78%" }} />
          <div style={{ ...line, width: "56%" }} />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
