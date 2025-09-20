import LikedList from "../../components/lists/LikedList";
import CartList from "../../components/lists/CartList";

const PortfolioPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Liked Items</h2>
        <LikedList />
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Cart</h2>
        <CartList />
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700">
          Buy Cart
        </button>
      </section>
    </div>
  );
};

export default PortfolioPage;