import Image from "next/image";
import type { SiteContent } from "@/lib/content";
import "./brand-mark.css";

export function BrandMark({ content, light = false }: { content: SiteContent; light?: boolean }) {
  const image = light && content.logoLightImage ? content.logoLightImage : content.logoImage;
  return <span className={`brand-mark ${light ? "light" : ""} ${image ? "has-image" : ""} ${light && content.logoLightImage ? "has-light-image" : ""}`}>
    {image ? <Image src={image} alt={content.brandName} fill sizes="(max-width: 560px) 150px, 220px" unoptimized loading="eager"/> : <><span className="brand-name">{content.brandName}</span><span className="brand-tagline">{content.brandTagline}</span></>}
  </span>;
}