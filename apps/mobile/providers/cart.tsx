import React, { createContext, useContext, useReducer, useCallback } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  currency?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "CLEAR_CART" };

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  currency: string;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === action.payload.productId
      );
      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + action.payload.quantity,
        };
        return { items: updated };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        items: state.items.filter(
          (item) => item.productId !== action.payload.productId
        ),
      };
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return {
          items: state.items.filter(
            (item) => item.productId !== action.payload.productId
          ),
        };
      }
      return {
        items: state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      dispatch({
        type: "ADD_ITEM",
        payload: { ...item, quantity: item.quantity ?? 1 },
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId } });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
    },
    []
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const currency = state.items[0]?.currency ?? "MYR";

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
        currency,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return context;
}
