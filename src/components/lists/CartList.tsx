const CartList = () => {
  return (
    <ul className="space-y-4">
      {/* Placeholder for cart items */}
      {[...Array(3)].map((_, index) => (
        <li
          key={index}
          className="p-4 bg-gray-100 rounded-md shadow-md flex justify-between items-center"
        >
          <span>Cart Item {index + 1}</span>
          <span>Qty: 1</span>
        </li>
      ))}
    </ul>
  );
};

export default CartList;