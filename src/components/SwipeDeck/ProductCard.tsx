import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Item } from "../../lib/events";

const ProductCard = ({ item }: { item: Item }) => {
  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden">
      <Image
        src={item.image_url}
        alt={item.title}
        layout="fill"
        objectFit="cover"
        className="absolute inset-0"
      />
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4">
        <h3 className="text-white font-semibold drop-shadow-md">{item.title}</h3>
        <p className="text-white/90 drop-shadow-md">${item.price_usd.toFixed(2)}</p>
      </div>
      <button
        className="absolute bottom-4 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md"
        aria-label="Add to Cart"
      >
        <ShoppingCart size={24} />
      </button>
    </div>
  );
};

export default ProductCard;