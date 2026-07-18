export const isValidCpfCnpj = (value: string) => {
  const clean = value.replace(/\D/g, '');
  return clean.length === 11 || clean.length === 14;
};
