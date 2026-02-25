import * as Print from 'expo-print';

export const printHtmlReceipt = async (html) => {
  await Print.printAsync({ html });
};
