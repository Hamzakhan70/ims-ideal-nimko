export const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return `PKR ${numericValue.toFixed(2)}`;
};
