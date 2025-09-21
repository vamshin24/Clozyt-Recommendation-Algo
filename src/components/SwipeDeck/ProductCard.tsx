import Image from "next/image";
import { ShoppingCart, Share2 } from "lucide-react";
import { Item } from "../../lib/events";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type ProductCardProps = {
  item: Item;
  onAddToCart?: () => void;
  onShare?: () => void;
};

const ProductCard = ({ item, onAddToCart, onShare }: ProductCardProps) => {
  const priceLabel = currency.format(item.price_usd);

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onAddToCart?.();
  };

  const handleShare = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onShare?.();
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-xl">
      <Image
        src={item.image_url}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 100vw, 480px"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold leading-tight">{item.title}</h3>
          <p className="text-sm text-white/80">{item.brand || "NA-KD"}</p>
          <p className="text-lg font-medium">{priceLabel}</p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-md bg-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/30"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
