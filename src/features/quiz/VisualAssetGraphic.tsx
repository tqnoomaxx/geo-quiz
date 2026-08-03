import type { CSSProperties } from "react";
import type { VisualAssetReference } from "../../engine/quiz/question";
import { visualAssetUrl } from "./visualAssets";

interface VisualAssetGraphicProps {
  asset: VisualAssetReference;
  accessibleLabel: string;
  compact?: boolean;
}

export function VisualAssetGraphic({
  asset,
  accessibleLabel,
  compact = false
}: VisualAssetGraphicProps) {
  const source = visualAssetUrl(asset);
  if (asset.kind === "flag") {
    return (
      <img
        className={`visual-asset visual-asset--flag${compact ? " is-compact" : ""}`}
        src={source}
        alt={accessibleLabel}
        draggable={false}
      />
    );
  }

  const style = {
    "--visual-mask": `url("${source}")`
  } as CSSProperties;
  return (
    <span
      className={`visual-asset visual-asset--outline${compact ? " is-compact" : ""}`}
      style={style}
      role="img"
      aria-label={accessibleLabel}
    />
  );
}
