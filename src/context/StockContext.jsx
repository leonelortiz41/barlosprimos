// src/context/StockContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const StockContext = createContext();

export const StockProvider = ({ children }) => {
  // Inicializamos con localStorage o valores por defecto
  const [stock, setStock] = useState({
    san: parseInt(localStorage.getItem("stockSan")) || 0,
    hamb: parseInt(localStorage.getItem("stockHamb")) || 0,
    papas: parseInt(localStorage.getItem("stockPapas")) || 0,
    pizzas: parseInt(localStorage.getItem("stockPizzas")) || 0,
  });

  // Cada vez que el stock cambie, guardamos en localStorage
  useEffect(() => {
    localStorage.setItem("stockSan", stock.san);
    localStorage.setItem("stockHamb", stock.hamb);
    localStorage.setItem("stockPapas", stock.papas);
    localStorage.setItem("stockPizzas", stock.pizzas);
  }, [stock]);

  const descontarStock = (items) => {
    setStock(prev => ({
      san: prev.san - (items.sumaPanSan || 0),
      hamb: prev.hamb - (items.sumaPanHamb || 0),
      papas: prev.papas - (items.sumapPapas || 0),
      pizzas: prev.pizzas - (items.sumapPizzas || 0),
    }));
  };

  return (
    <StockContext.Provider value={{ stock, setStock, descontarStock }}>
      {children}
    </StockContext.Provider>
  );
};