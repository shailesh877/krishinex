import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
    id: string;
    name: string;
    nameHi: string;
    price: number;
    unit: string;
    unitEn: string;
    qty: number;
    image: string;
    owner?: string; // Shop partner ID
    variantLabel?: string;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string, variantLabel?: string) => void;
    updateQty: (id: string, delta: number, variantLabel?: string) => void;
    clearCart: () => void;
    totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (item: CartItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.id === item.id && i.variantLabel === item.variantLabel);
            if (existing) {
                return prev.map(i => (i.id === item.id && i.variantLabel === item.variantLabel) ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: item.qty || 1 }];
        });
    };

    const removeFromCart = (id: string, variantLabel?: string) => {
        setCartItems(prev => prev.filter(i => !(i.id === id && i.variantLabel === variantLabel)));
    };

    const updateQty = (id: string, delta: number, variantLabel?: string) => {
        setCartItems(prev => prev.map(i => {
            if (i.id === id && i.variantLabel === variantLabel) {
                const newQty = Math.max(0, i.qty + delta);
                return { ...i, qty: newQty };
            }
            return i;
        }).filter(i => i.qty > 0));
    };

    const clearCart = () => setCartItems([]);

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, totalAmount }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
