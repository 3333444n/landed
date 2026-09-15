/**
 * A stored company logo inside an icon tile. Decorative: the tile is aria-hidden and the company
 * name sits next to it. A plain img because the bytes are same-origin and change only with the
 * address, so the image optimizer has nothing to add.
 */
export function LogoImage({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- same-origin stored bytes, no optimizer
  return <img src={src} alt="" />;
}
