import Image from "next/image";
import { Item } from "../../lib/events";

type CollageGridProps = {
  items: Item[];
};

const CollageGrid = ({ items }: CollageGridProps) => {
  if (!items.length) {
    return (
      <p className="py-10 text-center text-sm text-white/70">
        No items match your search.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.item_id}
          className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/10 shadow-lg"
        >
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 240px"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 text-xs text-white">
            <p className="font-semibold leading-tight">{item.title}</p>
            {item.brand ? <p className="text-white/70">{item.brand}</p> : null}
            <p className="mt-1 font-medium">${item.price_usd.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollageGrid;
