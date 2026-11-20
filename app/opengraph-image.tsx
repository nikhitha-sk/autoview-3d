import { ImageResponse } from "next/og";
import { ogCard, ogSize } from "@/lib/og/card";

export const alt = "AutoView 3D — explore cars in 3D, inside and out";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    await ogCard({
      eyebrow: "Real-time 3D studio",
      title: "Every angle. Inside & out.",
      subtitle: "Rotate, repaint and sit inside famous cars — or turn a photo into 3D.",
      image: "/cars/ferrari-458.webp",
    }),
    size,
  );
}
