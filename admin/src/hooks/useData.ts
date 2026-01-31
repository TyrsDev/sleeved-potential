import { useContext } from "react";
import { DataContext } from "../contexts/DataContextValue";

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
