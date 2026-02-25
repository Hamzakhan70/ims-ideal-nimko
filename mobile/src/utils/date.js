export const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  return date.toLocaleDateString();
};
